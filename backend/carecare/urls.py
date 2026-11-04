"""Root URL configuration (API version 1).

Path conventions:
  /api/v1/auth/...      authentication & account
  /api/v1/tracking/...  patient symptom data
  /api/v1/therapy/...   therapy programs & enrollment
  /api/v1/audit/...     compliance audit log (admin only)
  /healthz, /readyz     probes
  /metrics              Prometheus scrape endpoint
  /api/schema/          OpenAPI schema + docs
"""

from __future__ import annotations

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from common import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", health.liveness, name="liveness"),
    path("readyz", health.readiness, name="readiness"),
    path("", include("django_prometheus.urls")),  # /metrics
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/patients/", include("apps.patients.urls")),
    path("api/v1/tracking/", include("apps.tracking.urls")),
    path("api/v1/therapy/", include("apps.therapy.urls")),
    path("api/v1/audit/", include("apps.audit.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
