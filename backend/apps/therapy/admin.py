"""Therapy admin."""

from django.contrib import admin

from .models import Enrollment, TherapyProgram


@admin.register(TherapyProgram)
class TherapyProgramAdmin(admin.ModelAdmin):
    list_display = ("title", "condition", "duration_weeks", "version", "is_active")
    list_filter = ("condition", "is_active")
    search_fields = ("title", "slug")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("patient", "program", "status", "progress_percent", "started_at")
    list_filter = ("status", "program")
    search_fields = ("patient__user__email",)
