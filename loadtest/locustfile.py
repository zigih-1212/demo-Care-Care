# Locust load test — an alternative to k6 for Python-centric teams.
#
# Puts ~70% read / 30% write weight on the tracking endpoints and shapes traffic
# like a cohort of patients using the app through the day.
#
# Run:  locust -f loadtest/locustfile.py --host https://api.carecare.example.com
from __future__ import annotations

import os
import random
from datetime import datetime, timezone

from locust import HttpUser, between, task

EMAIL = os.environ.get("LOADTEST_EMAIL", "loadtest@example.com")
PASSWORD = os.environ.get("LOADTEST_PASSWORD", "Str0ng-Passw0rd!")
SYMPTOMS = ["bloating", "abdominal_pain", "nausea", "heartburn", "fatigue"]


class PatientUser(HttpUser):
    """Simulates one logged-in patient's session."""

    wait_time = between(1, 3)

    def on_start(self) -> None:
        resp = self.client.post(
            "/api/v1/auth/login/",
            json={"email": EMAIL, "password": PASSWORD},
            name="/api/v1/auth/login/",
        )
        resp.raise_for_status()
        token = resp.json()["access"]
        self.client.headers.update({"Authorization": f"Bearer {token}"})

    @task(5)
    def view_trend(self) -> None:
        self.client.get(
            "/api/v1/tracking/symptoms/trend/?days=30", name="/tracking/trend"
        )

    @task(3)
    def view_summary(self) -> None:
        self.client.get(
            "/api/v1/tracking/symptoms/summary/?days=30", name="/tracking/summary"
        )

    @task(4)
    def list_symptoms(self) -> None:
        self.client.get("/api/v1/tracking/symptoms/", name="/tracking/symptoms")

    @task(2)
    def log_symptom(self) -> None:
        self.client.post(
            "/api/v1/tracking/symptoms/",
            json={
                "symptom_type": random.choice(SYMPTOMS),
                "severity": random.randint(0, 10),
                "recorded_at": datetime.now(tz=timezone.utc).isoformat(),
            },
            name="/tracking/symptoms [POST]",
        )

    @task(1)
    def view_therapy(self) -> None:
        self.client.get("/api/v1/therapy/programs/", name="/therapy/programs")
