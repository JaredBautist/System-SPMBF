from datetime import timedelta

from django.db.models import ProtectedError
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsAdminRole
from reservations.models import Reservation
from spaces.models import Space
from spaces.serializers import SpaceAvailabilitySerializer, SpaceSerializer


def _parse_datetime(value):
    dt = parse_datetime(value)
    if not dt:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_default_timezone())
    return dt


@extend_schema_view(
    list=extend_schema(
        tags=["Espacios (Teacher)"],
        summary="Listar espacios",
        description="Todos los usuarios autenticados ven todos los espacios (activos e inactivos).",
    ),
    retrieve=extend_schema(
        tags=["Espacios (Teacher)"], summary="Detalle de espacio", description="Visible para cualquier rol autenticado."
    ),
    availability=extend_schema(
        tags=["Espacios (Teacher)"],
        summary="Consultar disponibilidad de un espacio",
        parameters=[
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
                description="Fecha/hora fin (ISO 8601). Por defecto 30 días desde ahora.",
            ),
        ],
        description="Retorna los bloques ocupados (PENDING/APPROVED) en el rango.",
        responses=SpaceAvailabilitySerializer,
    ),
    create=extend_schema(tags=["Espacios (Admin)"], summary="Crear espacio"),
    update=extend_schema(tags=["Espacios (Admin)"], summary="Actualizar espacio"),
    partial_update=extend_schema(tags=["Espacios (Admin)"], summary="Actualizar espacio (parcial)"),
    destroy=extend_schema(
        tags=["Espacios (Admin)"],
        summary="Eliminar espacio",
        description="Borra el espacio; requiere rol ADMIN.",
    ),
)
class SpaceViewSet(viewsets.ModelViewSet):
    serializer_class = SpaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Space.objects.all()

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminRole()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar el espacio porque tiene reservaciones asociadas. Elimine primero las reservaciones."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="availability")
    def availability(self, request, pk=None):
        space = self.get_object()
        start_param = request.query_params.get("start")
        end_param = request.query_params.get("end")
        now = timezone.now()
        default_end = now + timedelta(days=30)
        start_dt = _parse_datetime(start_param) if start_param else now
        end_dt = _parse_datetime(end_param) if end_param else default_end
        if not start_dt or not end_dt:
            return Response({"detail": "Invalid start or end"}, status=400)
        if start_dt >= end_dt:
            return Response({"detail": "La fecha de inicio debe ser anterior a la fecha fin"}, status=400)
        busy_qs = Reservation.objects.filter(
            space=space,
            status__in=[Reservation.Status.PENDING, Reservation.Status.APPROVED],
            start_at__lt=end_dt,
            end_at__gt=start_dt,
        ).order_by("start_at")
        busy = [{"start_at": r.start_at, "end_at": r.end_at} for r in busy_qs]
        return Response({"space_id": space.id, "start": start_dt, "end": end_dt, "busy": busy})
