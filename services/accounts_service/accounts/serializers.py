from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Minimal user info for displaying in reservations"""
    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "email"]
        read_only_fields = ["id", "first_name", "last_name", "email"]


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "date_joined",
            "password",
        ]
        read_only_fields = ["id", "date_joined"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
