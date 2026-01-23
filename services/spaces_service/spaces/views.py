from datetime import timedelta

import requests
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from rest_framework.decorators import action
from rest_framework.response import Response

from spaces.models import Space
from spaces.permissions import IsAdminRole
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
        description="Retorna los bloques ocupados (PENDING/APPROVED) en el rango (vía reservas-service).",
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
            return Response({"detail": "Invalid start or end"}, status=status.HTTP_400_BAD_REQUEST)
        if start_dt >= end_dt:
            return Response({"detail": "La fecha de inicio debe ser anterior a la fecha fin"}, status=400)

        try:
            resp = requests.get(
                f"{settings.RESERVATIONS_BASE_URL}/reservations/busy/",
                params={"space_id": space.id, "start": start_dt.isoformat(), "end": end_dt.isoformat()},
                headers={"Authorization": request.headers.get("Authorization", "")},
                timeout=5,
            )
            if resp.status_code != 200:
                return Response({"detail": "No se pudo consultar disponibilidad"}, status=502)
            data = resp.json()
            return Response(data)
        except requests.RequestException:
            return Response({"detail": "Error consultando reservas"}, status=502)

