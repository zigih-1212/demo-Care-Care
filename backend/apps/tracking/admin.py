"""Tracking admin."""

from django.contrib import admin

from .models import MedicationEntry, SymptomEntry


@admin.register(SymptomEntry)
class SymptomEntryAdmin(admin.ModelAdmin):
    list_display = ("patient", "symptom_type", "severity", "recorded_at")
    list_filter = ("symptom_type", "severity")
    search_fields = ("patient__user__email", "notes")
    date_hierarchy = "recorded_at"


@admin.register(MedicationEntry)
class MedicationEntryAdmin(admin.ModelAdmin):
    list_display = ("patient", "medication_name", "dosage", "taken", "recorded_at")
    list_filter = ("taken",)
    search_fields = ("patient__user__email", "medication_name")
    date_hierarchy = "recorded_at"
