from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.serializers import UserBasicSerializer
from reservations.models import Reservation
from spaces.serializers import SpaceSerializer

User = get_user_model()


class ReservationPublicSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()
    space = SpaceSerializer(read_only=True)

    class Meta:
        model = Reservation
        fields = ["id", "space", "start_at", "end_at", "status", "label"]

    def get_label(self, obj):
        return "Ocupado"


class ReservationAdminSerializer(serializers.ModelSerializer):
    created_by = UserBasicSerializer(read_only=True)
    approved_by = UserBasicSerializer(read_only=True)
    space = SpaceSerializer(read_only=True)

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
        read_only_fields = ["status", "approved_by", "decision_at", "decision_note", "created_at", "updated_at"]


class ReservationCreateSerializer(serializers.ModelSerializer):
    space_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Reservation
        fields = ["title", "description", "start_at", "end_at", "space", "space_id"]
        extra_kwargs = {
            'space': {'required': False, 'allow_null': True, 'read_only': True}
        }

    def validate(self, attrs):
        # Si se envía space_id, usarlo para obtener el espacio
        space_id = attrs.pop('space_id', None)
        if space_id is not None:
            from spaces.models import Space
            try:
                attrs['space'] = Space.objects.get(id=space_id)
            except Space.DoesNotExist:
                raise serializers.ValidationError({"space_id": "No se encontró el espacio"})
        return attrs


class ReservationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = ["title", "description", "start_at", "end_at", "status", "decision_note"]
        read_only_fields = ["status", "decision_note"]


class ReservationDecisionSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
