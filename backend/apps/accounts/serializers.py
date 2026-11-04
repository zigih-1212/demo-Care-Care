"""Account serializers.

Write serializers are strict: passwords get Django's configured validators, and
clients cannot set ``role`` themselves (privilege escalation vector). Role is
assigned by administrators out-of-band.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Read-only representation returned to the client."""

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "role",
            "is_active",
            "consent_privacy_accepted_at",
            "date_joined",
        )
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ("email", "full_name", "password")

    def validate_email(self, value: str) -> str:
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value: str) -> str:
        # Runs MinimumLength/Common/Numeric/Similarity validators from settings.
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        # Role defaults to PATIENT in the model; never taken from input.
        return User.objects.create_user(password=password, **validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value: str) -> str:
        validate_password(value)
        return value


class ConsentSerializer(serializers.Serializer):
    accept_privacy_policy = serializers.BooleanField()

    def validate_accept_privacy_policy(self, value: bool) -> bool:
        if not value:
            raise serializers.ValidationError("Privacy policy must be accepted to continue.")
        return value


class LogoutSerializer(serializers.Serializer):
    """The refresh token to revoke. Kept as a serializer so the OpenAPI schema
    documents the request body instead of showing an untyped object."""

    refresh = serializers.CharField()
