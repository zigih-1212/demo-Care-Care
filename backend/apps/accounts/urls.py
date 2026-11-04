"""Account & auth URL routes (mounted at /api/v1/auth/)."""

from __future__ import annotations

from django.urls import path

from .views import (
    ChangePasswordView,
    ConsentView,
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    RegisterView,
)

app_name = "accounts"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("password/change/", ChangePasswordView.as_view(), name="password-change"),
    path("consent/", ConsentView.as_view(), name="consent"),
]
