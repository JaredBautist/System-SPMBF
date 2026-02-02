from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdminRole
from reservations.models import Reservation
from reservations.permissions import IsOwnerOrAdmin
from reservations.serializers import (
    ReservationAdminSerializer,
    ReservationCreateSerializer,
    ReservationDecisionSerializer,
    ReservationPublicSerializer,
    ReservationUpdateSerializer,
)
from reservations.services import (
    approve_reservation,
    cancel_reservation,
    create_reservation,
    reject_reservation,
    validate_overlap,
)
from reservations.reporting import build_reservations_report

User = get_user_model()

DATE_RANGE_PARAMS = [
    OpenApiParameter(
        name="start",
        type=OpenApiTypes.DATETIME,
        required=False,
        description="Fecha/hora inicio (ISO 8601). Por defecto ahora.",
    ),
    OpenApiParameter(
        name="end",
        type=OpenApiTypes.DATETIME,
        required=False,
        description="Fecha/hora fin (ISO 8601). Por defecto 30 días hacia adelante.",
    ),
]

LIST_PARAMS = DATE_RANGE_PARAMS + [
    OpenApiParameter(
        name="space",
        type=OpenApiTypes.INT,
        required=False,
        description="Filtra por ID de espacio. Si se omite, devuelve todas las reservas en el rango.",
    ),
]


def _parse_datetime(value):
    dt = parse_datetime(value)
    if not dt:
        raise ValidationError("Invalid datetime format. Use ISO 8601.")
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_default_timezone())
    return dt


@extend_schema_view(
    list=extend_schema(
        tags=["Reservas (Teacher)"],
        summary="Consultar reservas en un rango",
        description=(
            "Admin ve todas las reservas con detalle completo. Teachers ven reservas en estado PENDING/APPROVED "
            "con detalle completo (incluyendo quién creó y quién aprobó cada reserva)."
        ),
        parameters=LIST_PARAMS,
        responses=ReservationAdminSerializer(many=True),
    ),
    retrieve=extend_schema(
        tags=["Reservas (Teacher)"],
        summary="Detalle de reserva",
        description="Todos los usuarios ven detalle completo de las reservas.",
        responses=ReservationAdminSerializer,
    ),
    create=extend_schema(
        tags=["Reservas (Teacher)"],
        summary="Crear una reserva",
        description="Cualquier usuario autenticado puede crear su propia reserva; valida solapamiento y duración mínima/máxima.",
        request=ReservationCreateSerializer,
        responses=ReservationAdminSerializer,
    ),
    update=extend_schema(
        tags=["Reservas (Admin)"],
        summary="Editar reserva",
        description="Solo ADMIN. Revalida solapamiento si se cambian fechas.",
    ),
    partial_update=extend_schema(
        tags=["Reservas (Admin)"],
        summary="Editar reserva (parcial)",
        description="Solo ADMIN. Revalida solapamiento si se cambian fechas.",
    ),
    mine=extend_schema(
        tags=["Reservas (Teacher)"],
        summary="Mis reservas",
        description="Devuelve todas las reservas del usuario autenticado (pasadas, presentes y futuras) incluyendo todos los estados (PENDING, APPROVED, REJECTED, CANCELLED). Opcionalmente filtra por rango de fechas si se proporcionan los parámetros start/end.",
        parameters=DATE_RANGE_PARAMS,
        responses=ReservationAdminSerializer(many=True),
    ),
    cancel=extend_schema(
        tags=["Reservas (Teacher)"],
        summary="Cancelar reserva propia",
        description="Owner o ADMIN pueden cancelar. Cambia el estado a CANCELLED.",
        responses=ReservationAdminSerializer,
    ),
    approve=extend_schema(
        tags=["Reservas (Admin)"],
        summary="Aprobar una reserva",
        description="Solo ADMIN. Permite adjuntar una nota opcional.",
        request=ReservationDecisionSerializer,
        responses=ReservationAdminSerializer,
    ),
    reject=extend_schema(
        tags=["Reservas (Admin)"],
        summary="Rechazar una reserva",
        description="Solo ADMIN. Permite adjuntar una nota opcional.",
        request=ReservationDecisionSerializer,
        responses=ReservationAdminSerializer,
    ),
    report=extend_schema(
        tags=["Reservas (Admin)"],
        summary="Generar PDF de reservas",
        parameters=LIST_PARAMS
        + [
            OpenApiParameter(
                name="status",
                type=OpenApiTypes.STR,
                required=False,
                description="Filtra por estado. Valores separados por coma (PENDING,APPROVED,REJECTED,CANCELLED).",
            )
        ],
        responses={200: {"content": {"application/pdf": {}}}},
    ),
)
class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related("space", "created_by", "approved_by").all()
    permission_classes = [IsAuthenticated]
    serializer_class = ReservationAdminSerializer

    def get_serializer_class(self):
        if self.action in ["create"]:
            return ReservationCreateSerializer
        if self.action in ["update", "partial_update"]:
            return ReservationUpdateSerializer
        return ReservationAdminSerializer

    def _get_date_range(self, request):
        start_param = request.query_params.get("start")
        end_param = request.query_params.get("end")
        now = timezone.now()
        default_end = now + timedelta(days=30)
        if start_param:
            start_dt = _parse_datetime(start_param)
        else:
            start_dt = now
        if end_param:
            end_dt = _parse_datetime(end_param)
        else:
            end_dt = default_end
        if start_dt >= end_dt:
            raise ValidationError("La fecha de inicio debe ser anterior a la fecha fin")
        return start_dt, end_dt

    def list(self, request, *args, **kwargs):
        start_dt, end_dt = self._get_date_range(request)
        queryset = self.filter_queryset(self.get_queryset())
        space_id = request.query_params.get("space")
        if request.user.role != User.Role.ADMIN:
            queryset = queryset.filter(status__in=[Reservation.Status.PENDING, Reservation.Status.APPROVED])
        if space_id:
            queryset = queryset.filter(space_id=space_id)
        queryset = queryset.filter(start_at__lt=end_dt, end_at__gt=start_dt)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request, *args, **kwargs):
        """
        Devuelve todas las reservas del usuario autenticado.
        Si se proporcionan parámetros start/end, filtra por ese rango.
        Sin parámetros, devuelve todas las reservas (pasadas, presentes y futuras).
        """
        queryset = self.get_queryset().filter(created_by=request.user)

        # Solo aplicar filtro de fechas si se proporcionan explícitamente
        start_param = request.query_params.get("start")
        end_param = request.query_params.get("end")

        if start_param or end_param:
            now = timezone.now()
            if start_param:
                start_dt = _parse_datetime(start_param)
            else:
                start_dt = now - timedelta(days=365)  # Un año atrás por defecto
            if end_param:
                end_dt = _parse_datetime(end_param)
            else:
                end_dt = now + timedelta(days=365)  # Un año adelante por defecto
            queryset = queryset.filter(start_at__lt=end_dt, end_at__gt=start_dt)

        # Ordenar por fecha de inicio descendente (más recientes primero)
        queryset = queryset.order_by('-start_at')
        serializer = ReservationAdminSerializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        reservation = self.get_object()
        serializer = ReservationAdminSerializer(reservation)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reservation = create_reservation(request.user, serializer.validated_data)
        output = ReservationAdminSerializer(reservation)
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role != User.Role.ADMIN:
            raise PermissionDenied("Only admins can edit reservations")
        reservation = self.get_object()
        serializer = self.get_serializer(reservation, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        start_at = serializer.validated_data.get("start_at", reservation.start_at)
        end_at = serializer.validated_data.get("end_at", reservation.end_at)
        with transaction.atomic():
            if start_at != reservation.start_at or end_at != reservation.end_at:
                validate_overlap(reservation.space, start_at, end_at, exclude_reservation_id=reservation.id)
            for attr, value in serializer.validated_data.items():
                setattr(reservation, attr, value)
            reservation.save()
        return Response(ReservationAdminSerializer(reservation).data)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="report", permission_classes=[IsAuthenticated, IsAdminRole])
    def report(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        start_param = request.query_params.get("start")
        end_param = request.query_params.get("end")
        space_param = request.query_params.get("space") or request.query_params.get("space_id")
        status_param = request.query_params.get("status")

        start_dt = _parse_datetime(start_param) if start_param else None
        end_dt = _parse_datetime(end_param) if end_param else None
        if start_dt and end_dt and start_dt >= end_dt:
            raise ValidationError("La fecha de inicio debe ser anterior a la fecha fin")

        if start_dt:
            queryset = queryset.filter(end_at__gte=start_dt)
        if end_dt:
            queryset = queryset.filter(start_at__lte=end_dt)
        if space_param:
            queryset = queryset.filter(space_id=space_param)

        statuses = None
        if status_param and status_param.lower() != "all":
            statuses = [s.strip().upper() for s in status_param.split(",") if s.strip()]
            valid_statuses = {choice[0] for choice in Reservation.Status.choices}
            statuses = [s for s in statuses if s in valid_statuses]
            if statuses:
                queryset = queryset.filter(status__in=statuses)

        reservations = queryset.select_related("space", "created_by", "approved_by").order_by("space__name", "start_at")
        pdf_bytes = build_reservations_report(
            reservations,
            start=start_dt,
            end=end_dt,
            space=space_param,
            statuses=statuses,
        )
        filename = f"reporte_reservas_{timezone.now().strftime('%Y%m%d_%H%M')}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename=\"{filename}\"'
        return response

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsOwnerOrAdmin])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        reservation = cancel_reservation(request.user, reservation)
        return Response(ReservationAdminSerializer(reservation).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdminRole])
    def approve(self, request, pk=None):
        reservation = self.get_object()
        note = request.data.get("note")
        reservation = approve_reservation(request.user, reservation, note=note)
        return Response(ReservationAdminSerializer(reservation).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdminRole])
    def reject(self, request, pk=None):
        reservation = self.get_object()
        note = request.data.get("note")
        reservation = reject_reservation(request.user, reservation, note=note)
        return Response(ReservationAdminSerializer(reservation).data)
