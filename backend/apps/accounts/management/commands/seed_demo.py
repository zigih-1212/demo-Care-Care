"""`seed_demo` - populate a local database with a coherent demo dataset.

Run after `migrate` with the demo settings:

    DJANGO_SETTINGS_MODULE=carecare.settings.demo python manage.py seed_demo

It is idempotent: re-running resets the demo accounts' data instead of failing,
so the login credentials below always work. Never run this against production.
"""

from __future__ import annotations

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.patients.models import CareRelationship, Patient
from apps.therapy.models import Enrollment, TherapyProgram
from apps.tracking.models import MedicationEntry, SymptomEntry, SymptomType

PATIENT_EMAIL = "patient@demo.carecare"
DOCTOR_EMAIL = "doctor@demo.carecare"
ADMIN_EMAIL = "admin@demo.carecare"
DEMO_PASSWORD = "Demo-Passw0rd!23"  # noqa: S105 - demo-only credential, printed below


class Command(BaseCommand):
    help = "Create demo users, a care relationship, symptom history and programs."

    @transaction.atomic
    def handle(self, *args: object, **options: object) -> None:
        rng = random.Random(42)  # noqa: S311 - deterministic demo data, not security

        self._user(ADMIN_EMAIL, "Demo Admin", Role.ADMIN, is_staff=True)
        doctor = self._user(DOCTOR_EMAIL, "Dr. Anna Weber", Role.DOCTOR)
        patient_user = self._user(PATIENT_EMAIL, "Mia Schmidt", Role.PATIENT)

        patient, _ = Patient.objects.get_or_create(
            user=patient_user,
            defaults={
                "date_of_birth": timezone.now().date() - timedelta(days=365 * 34),
                "sex": Patient.Sex.FEMALE,
                "country": "DE",
                "primary_condition": "IBS",
            },
        )

        # Active care relationship so the clinician can read this patient.
        CareRelationship.objects.get_or_create(
            patient=patient,
            clinician=doctor,
            ended_at__isnull=True,
            defaults={"relationship_type": CareRelationship.RelationshipType.PRIMARY},
        )

        programs = self._programs()
        enrollment, _ = Enrollment.objects.get_or_create(patient=patient, program=programs[0])
        enrollment.status = Enrollment.Status.ACTIVE
        enrollment.progress_percent = 35
        enrollment.save(update_fields=["status", "progress_percent"])
        Enrollment.objects.get_or_create(patient=patient, program=programs[1])

        self._symptom_history(patient, rng)
        self._medications(patient)

        self.stdout.write(self.style.SUCCESS("Demo data ready."))
        self.stdout.write("")
        self.stdout.write(f"  Patient  : {PATIENT_EMAIL} / {DEMO_PASSWORD}")
        self.stdout.write(f"  Clinician: {DOCTOR_EMAIL} / {DEMO_PASSWORD}")
        self.stdout.write(f"  Admin    : {ADMIN_EMAIL} / {DEMO_PASSWORD}")

    # -- helpers -------------------------------------------------------------

    def _user(self, email: str, full_name: str, role: str, *, is_staff: bool = False) -> User:
        user = User.objects.filter(email=email).first()
        if user is None:
            user = User.objects.create_user(
                email=email, password=DEMO_PASSWORD, full_name=full_name, role=role
            )
        user.full_name = full_name
        user.role = role
        user.is_staff = is_staff
        user.consent_privacy_accepted_at = timezone.now()
        user.save()
        return user

    def _programs(self) -> list[TherapyProgram]:
        specs = [
            ("low-fodmap-8w", "Low-FODMAP elimination & reintroduction", "IBS", 8),
            ("gut-directed-relaxation", "Gut-directed relaxation training", "IBS", 6),
            ("gerd-lifestyle-4w", "GERD lifestyle & reflux management", "GERD", 4),
        ]
        programs = []
        for slug, title, condition, weeks in specs:
            program, _ = TherapyProgram.objects.update_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "condition": condition,
                    "duration_weeks": weeks,
                    "description": f"{title} - {weeks}-week protocol.",
                    "is_active": True,
                },
            )
            programs.append(program)
        return programs

    def _symptom_history(self, patient: Patient, rng: random.Random) -> None:
        SymptomEntry.objects.filter(patient=patient).delete()
        now = timezone.now()
        for day in range(45):
            # A gentle downward trend with weekend flare-ups - looks realistic.
            base = max(1, 8 - day // 8)
            for symptom_type in (SymptomType.ABDOMINAL_PAIN, SymptomType.BLOATING):
                if rng.random() < 0.7:
                    severity = min(10, max(0, base + rng.randint(-1, 2)))
                    recorded_at = now - timedelta(days=day, hours=rng.randint(0, 6))
                    SymptomEntry.objects.create(
                        patient=patient,
                        symptom_type=symptom_type.value,
                        severity=severity,
                        notes="",
                        recorded_at=recorded_at,
                    )

    def _medications(self, patient: Patient) -> None:
        MedicationEntry.objects.filter(patient=patient).delete()
        now = timezone.now()
        for day in range(10):
            MedicationEntry.objects.create(
                patient=patient,
                medication_name="Mebeverine 135 mg",
                dosage="1 tablet, 3x/day",
                taken=day % 4 != 0,
                recorded_at=now - timedelta(days=day, hours=8),
            )
