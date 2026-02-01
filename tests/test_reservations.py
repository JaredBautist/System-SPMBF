from datetime import timedelta

import pytest
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status

from reservations.models import Reservation
from reservations.services import validate_overlap


@pytest.mark.django_db
def test_overlap_validation_blocks_conflict(space, teacher_user):
    start = timezone.now() + timedelta(hours=1)
    end = start + timedelta(hours=2)
    Reservation.objects.create(
        space=space, created_by=teacher_user, title="Existing", start_at=start, end_at=end, status=Reservation.Status.PENDING
    )
    with pytest.raises(ValidationError):
        validate_overlap(space, start + timedelta(minutes=30), end + timedelta(hours=1))


@pytest.mark.django_db
def test_teacher_can_list_public_reservations_but_cannot_patch(api_client, space, teacher_user, admin_user):
    other_start = timezone.now() + timedelta(hours=3)
    other_end = other_start + timedelta(hours=1)
    Reservation.objects.create(
        space=space,
        created_by=admin_user,
        title="Admin booking",
        start_at=other_start,
        end_at=other_end,
        status=Reservation.Status.PENDING,
    )
    api_client.force_authenticate(user=teacher_user)
    resp = api_client.get(
        "/api/reservations/",
        {"start": timezone.now().isoformat(), "end": (timezone.now() + timedelta(days=1)).isoformat()},
    )
    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.data) == 1
    assert "description" not in resp.data[0]
    assert "created_by" not in resp.data[0]

    res_id = Reservation.objects.first().id
    patch_resp = api_client.patch(f"/api/reservations/{res_id}/", {"title": "New title"})
    assert patch_resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_teacher_can_cancel_own_reservation(api_client, space, teacher_user):
    start = timezone.now() + timedelta(hours=1)
    end = start + timedelta(hours=1)
    reservation = Reservation.objects.create(
        space=space, created_by=teacher_user, title="Mine", start_at=start, end_at=end, status=Reservation.Status.PENDING
    )
    api_client.force_authenticate(user=teacher_user)
    resp = api_client.post(f"/api/reservations/{reservation.id}/cancel/")
    assert resp.status_code == status.HTTP_200_OK
    reservation.refresh_from_db()
    assert reservation.status == Reservation.Status.CANCELLED


@pytest.mark.django_db
def test_admin_can_approve_and_reject(api_client, space, admin_user, teacher_user):
    start = timezone.now() + timedelta(hours=2)
    end = start + timedelta(hours=1)
    reservation = Reservation.objects.create(
        space=space, created_by=teacher_user, title="Needs approval", start_at=start, end_at=end, status=Reservation.Status.PENDING
    )
    api_client.force_authenticate(user=admin_user)
    approve_resp = api_client.post(f"/api/reservations/{reservation.id}/approve/", {"note": "ok"})
    assert approve_resp.status_code == status.HTTP_200_OK
    reservation.refresh_from_db()
    assert reservation.status == Reservation.Status.APPROVED
    reject_resp = api_client.post(f"/api/reservations/{reservation.id}/reject/", {"note": "change"})
    assert reject_resp.status_code == status.HTTP_200_OK
    reservation.refresh_from_db()
    assert reservation.status == Reservation.Status.REJECTED


@pytest.mark.django_db
def test_create_reservation_uses_default_space(api_client, teacher_user):
    start = timezone.now() + timedelta(hours=1)
    end = start + timedelta(hours=1)
    api_client.force_authenticate(user=teacher_user)
    resp = api_client.post(
        "/api/reservations/",
        {"title": "Clase", "description": "Prueba", "start_at": start.isoformat(), "end_at": end.isoformat()},
        format="json",
    )
    assert resp.status_code == status.HTTP_201_CREATED
    res = Reservation.objects.get(id=resp.data["id"])
    assert res.space is not None


@pytest.mark.django_db
def test_admin_can_download_pdf_report(api_client, space, admin_user, teacher_user):
    now = timezone.now()
    Reservation.objects.create(
        space=space,
        created_by=teacher_user,
        title="Approved one",
        start_at=now + timedelta(days=1),
        end_at=now + timedelta(days=1, hours=1),
        status=Reservation.Status.APPROVED,
    )
    Reservation.objects.create(
        space=space,
        created_by=teacher_user,
        title="Rejected one",
        start_at=now + timedelta(days=2),
        end_at=now + timedelta(days=2, hours=1),
        status=Reservation.Status.REJECTED,
        decision_note="No disponible",
    )

    api_client.force_authenticate(user=admin_user)
    resp = api_client.get("/api/reservations/report/")
    assert resp.status_code == status.HTTP_200_OK
    assert resp["Content-Type"] == "application/pdf"
    assert resp.content.startswith(b"%PDF")
