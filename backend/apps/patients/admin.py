"""Patients admin."""

from django.contrib import admin

from .models import CareRelationship, Patient


class CareRelationshipInline(admin.TabularInline):
    model = CareRelationship
    extra = 0
    fields = ("clinician", "relationship_type", "started_at", "ended_at")
    readonly_fields = ("started_at",)


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "primary_condition", "country", "created_at")
    list_filter = ("sex", "country", "primary_condition")
    search_fields = ("user__email", "user__full_name")
    inlines = [CareRelationshipInline]


@admin.register(CareRelationship)
class CareRelationshipAdmin(admin.ModelAdmin):
    list_display = ("patient", "clinician", "relationship_type", "started_at", "ended_at")
    list_filter = ("relationship_type",)
    search_fields = ("patient__user__email", "clinician__email")
