from rest_framework import serializers

from reservations.models import Reservation


class SpaceSnapshotSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    location = serializers.CharField(allow_blank=True, required=False)
    description = serializers.CharField(allow_blank=True, required=False)


class UserSnapshotSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField(allow_blank=True, required=False)
    last_name = serializers.CharField(allow_blank=True, required=False)


class ReservationPublicSerializer(serializers.ModelSerializer):
    space = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = ["id", "space", "start_at", "end_at", "status"]

    def get_space(self, obj):
        return {
            "id": obj.space_id,
            "name": obj.space_name,
            "location": obj.space_location,
            "description": obj.space_description,
        }


class ReservationAdminSerializer(serializers.ModelSerializer):
    space = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    approved_by = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            "id",
            "space",
            "created_by",
            "title",
            "description",
            "start_at",
            "end_at",
            "status",
            "approved_by",
            "decision_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "approved_by",
            "decision_at",
            "decision_note",
            "created_at",
            "updated_at",
        ]

    def get_space(self, obj):
        return {
            "id": obj.space_id,
            "name": obj.space_name,
            "location": obj.space_location,
            "description": obj.space_description,
        }

    def get_created_by(self, obj):
        return {
            "id": obj.created_by_id,
            "email": obj.created_by_email,
            "first_name": obj.created_by_first_name,
            "last_name": obj.created_by_last_name,
        }

    def get_approved_by(self, obj):
        if not obj.approved_by_id:
            return None
        return {
            "id": obj.approved_by_id,
            "email": obj.approved_by_email,
            "first_name": obj.approved_by_first_name,
            "last_name": obj.approved_by_last_name,
        }


class ReservationCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    start_at = serializers.DateTimeField()
    end_at = serializers.DateTimeField()
    space_id = serializers.IntegerField()


class ReservationUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    start_at = serializers.DateTimeField(required=False)
    end_at = serializers.DateTimeField(required=False)


class ReservationDecisionSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)

