from datetime import timedelta

import requests
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from reservations.models import Reservation


def _validate_duration(start_at, end_at):
    if start_at >= end_at:
        raise ValidationError("La fecha de inicio debe ser anterior a la fecha fin")
    duration = end_at - start_at
    min_duration = timedelta(minutes=settings.RESERVATION_MIN_DURATION_MINUTES)
    max_duration = timedelta(hours=settings.RESERVATION_MAX_DURATION_HOURS)
    if duration < min_duration:
        raise ValidationError(f"La reserva debe durar al menos {min_duration}")
    if duration > max_duration:
        raise ValidationError(f"La reserva no puede exceder {max_duration}")


def _make_aware(dt):
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, timezone.get_default_timezone())
    return dt


def fetch_space(space_id, auth_header=None):
    try:
        resp = requests.get(
            f"{settings.SPACES_BASE_URL}/spaces/{space_id}/",
            headers={"Authorization": auth_header or ""},
            timeout=5,
        )
    except requests.RequestException as exc:
        raise ValidationError("No se pudo consultar el servicio de espacios") from exc
    if resp.status_code == 404:
        raise ValidationError("No se encontró el espacio")
    if resp.status_code != 200:
        raise ValidationError("Error consultando el servicio de espacios")
    data = resp.json()
    if not data.get("is_active", True):
        raise ValidationError("El espacio no está activo")
    return data


def validate_overlap(space_id, start_at, end_at, exclude_reservation_id=None):
    _validate_duration(start_at, end_at)
    overlap_filter = Q(start_at__lt=end_at) & Q(end_at__gt=start_at)
    active_statuses = [Reservation.Status.PENDING, Reservation.Status.APPROVED]
    qs = Reservation.objects.filter(space_id=space_id, status__in=active_statuses)
    if exclude_reservation_id:
        qs = qs.exclude(id=exclude_reservation_id)
    if qs.filter(overlap_filter).exists():
        raise ValidationError("Ya existe una reserva en ese rango")


def create_reservation(user, data, auth_header=None):
    space_data = fetch_space(data["space_id"], auth_header)
    start_at = _make_aware(data["start_at"])
    end_at = _make_aware(data["end_at"])
    with transaction.atomic():
        validate_overlap(space_data["id"], start_at, end_at)
        reservation = Reservation.objects.create(
            space_id=space_data["id"],
            space_name=space_data.get("name", ""),
            space_location=space_data.get("location", ""),
            space_description=space_data.get("description", ""),
            created_by_id=user.id,
            created_by_email=getattr(user, "email", ""),
            created_by_first_name=getattr(user, "first_name", ""),
            created_by_last_name=getattr(user, "last_name", ""),
            title=data.get("title"),
            description=data.get("description", ""),
            start_at=start_at,
            end_at=end_at,
            status=Reservation.Status.PENDING,
        )
    return reservation


def update_reservation(admin_user, reservation, data):
    if getattr(admin_user, "role", "").upper() != "ADMIN":
        raise PermissionDenied("Solo ADMIN puede editar")
    start_at = data.get("start_at")
    end_at = data.get("end_at")
    if start_at:
        start_at = _make_aware(start_at)
    if end_at:
        end_at = _make_aware(end_at)
    with transaction.atomic():
        if start_at:
            reservation.start_at = start_at
        if end_at:
            reservation.end_at = end_at
        if start_at or end_at:
            validate_overlap(reservation.space_id, reservation.start_at, reservation.end_at, reservation.id)
        if "title" in data:
            reservation.title = data["title"]
        if "description" in data:
            reservation.description = data.get("description", "")
        reservation.save()
    return reservation


def cancel_reservation(actor, reservation: Reservation):
    if getattr(actor, "role", "").upper() != "ADMIN" and reservation.created_by_id != actor.id:
        raise PermissionDenied("Cannot cancel another user's reservation")
    with transaction.atomic():
        reservation.status = Reservation.Status.CANCELLED
        reservation.decision_at = timezone.now()
        reservation.approved_by_id = None
        reservation.approved_by_email = ""
        reservation.approved_by_first_name = ""
        reservation.approved_by_last_name = ""
        reservation.decision_note = ""
        reservation.save()
    return reservation


def approve_reservation(admin_user, reservation: Reservation, note=None):
    if getattr(admin_user, "role", "").upper() != "ADMIN":
        raise PermissionDenied("Only admins can approve")
    with transaction.atomic():
        reservation.status = Reservation.Status.APPROVED
        reservation.approved_by_id = admin_user.id
        reservation.approved_by_email = getattr(admin_user, "email", "")
        reservation.approved_by_first_name = getattr(admin_user, "first_name", "")
        reservation.approved_by_last_name = getattr(admin_user, "last_name", "")
        reservation.decision_at = timezone.now()
        reservation.decision_note = note or ""
        reservation.save()
    return reservation


def reject_reservation(admin_user, reservation: Reservation, note=None):
    if getattr(admin_user, "role", "").upper() != "ADMIN":
        raise PermissionDenied("Only admins can reject")
    with transaction.atomic():
        reservation.status = Reservation.Status.REJECTED
        reservation.approved_by_id = admin_user.id
        reservation.approved_by_email = getattr(admin_user, "email", "")
        reservation.approved_by_first_name = getattr(admin_user, "first_name", "")
        reservation.approved_by_last_name = getattr(admin_user, "last_name", "")
        reservation.decision_at = timezone.now()
        reservation.decision_note = note or ""
        reservation.save()
    return reservation


def busy_blocks(space_id, start_at, end_at):
    start_at = _make_aware(start_at)
    end_at = _make_aware(end_at)
    active_statuses = [Reservation.Status.PENDING, Reservation.Status.APPROVED]
    qs = Reservation.objects.filter(
        space_id=space_id,
        status__in=active_statuses,
        start_at__lt=end_at,
        end_at__gt=start_at,
    ).order_by("start_at")
    return [
        {"start_at": r.start_at, "end_at": r.end_at}
        for r in qs
    ]

