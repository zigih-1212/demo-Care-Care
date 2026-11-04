"""Celery application factory.

Background jobs run outside the request/response cycle. In this demo the app is
used for non-clinical, best-effort work (e.g. nightly aggregate reports and
audit-log shipping). Clinical writes never happen asynchronously: a patient's
symptom entry must be durably committed before the API responds, otherwise an
outage of the broker could silently drop medical data.
"""

from __future__ import annotations

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "carecare.settings.dev")

app = Celery("carecare")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self) -> str:  # pragma: no cover - operational helper
    return f"Request: {self.request!r}"
