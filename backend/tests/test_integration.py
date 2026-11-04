"""Cross-cutting integration tests: request id, error envelope, health, metrics."""

from __future__ import annotations

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


class TestHealthEndpoints:
    def test_liveness_needs_no_auth(self, api_client):
        assert api_client.get("/healthz").status_code == 200

    def test_readiness_checks_dependencies(self, api_client):
        resp = api_client.get("/readyz")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ready"


class TestRequestId:
    def test_response_echoes_request_id(self, api_client):
        resp = api_client.get("/healthz", HTTP_X_REQUEST_ID="trace-123")
        assert resp["X-Request-ID"] == "trace-123"

    def test_garbage_request_id_is_replaced(self, api_client):
        resp = api_client.get("/healthz", HTTP_X_REQUEST_ID="x" * 5000)
        assert resp["X-Request-ID"] != "x" * 5000
        assert len(resp["X-Request-ID"]) <= 128


class TestErrorEnvelope:
    def test_unauthenticated_error_is_structured(self, api_client):
        resp = api_client.get(reverse("accounts:me"))
        assert resp.status_code == 401
        assert "error" in resp.data
        assert {"code", "message"} <= set(resp.data["error"].keys())

    def test_not_found_uses_envelope(self, patient_client):
        resp = patient_client.get(
            reverse("tracking:symptom-detail", args=["00000000-0000-0000-0000-000000000000"])
        )
        assert resp.status_code == 404
        assert resp.data["error"]["code"] == "not_found"


class TestOpenApiSchema:
    def test_schema_generates(self, api_client):
        resp = api_client.get("/api/schema/")
        assert resp.status_code == 200
        assert b"openapi" in resp.content
