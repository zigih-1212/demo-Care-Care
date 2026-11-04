"""Manager for the email-based user model."""

from __future__ import annotations

from typing import Any

from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra: Any) -> Any:
        if not email:
            raise ValueError("The email address must be set")
        email = self.normalize_email(email)
        # ``self.model`` is generic in the base manager; ``user`` is the concrete
        # User at runtime, so we treat it as Any to access set_password/save.
        user: Any = self.model(email=email, **extra)
        # set_password(None) creates an unusable password, which is what we want
        # for invited-but-not-yet-activated or SSO-only accounts.
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra: Any) -> Any:
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email: str, password: str, **extra: Any) -> Any:
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("role", "admin")
        if extra.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra)
