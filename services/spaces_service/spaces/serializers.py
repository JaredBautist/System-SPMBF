from rest_framework import serializers

from spaces.models import Space


class SpaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Space
        fields = ["id", "name", "description", "location", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class BusyBlockSerializer(serializers.Serializer):
    start_at = serializers.DateTimeField()
    end_at = serializers.DateTimeField()


class SpaceAvailabilitySerializer(serializers.Serializer):
    space_id = serializers.IntegerField()
    start = serializers.DateTimeField()
    end = serializers.DateTimeField()
    busy = BusyBlockSerializer(many=True)
