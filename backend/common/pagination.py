"""Pagination defaults.

Cursor pagination is the default for time-series data (symptom entries can grow
to thousands per patient). Offset pagination degrades as OFFSET grows and can
skip/duplicate rows when new entries are inserted while the client pages; a
cursor is stable under concurrent inserts, which matters for a live tracker.
"""

from __future__ import annotations

from rest_framework.pagination import CursorPagination as DRFCursorPagination
from rest_framework.pagination import PageNumberPagination


class CursorPagination(DRFCursorPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
    ordering = "-created_at"


class StandardPageNumberPagination(PageNumberPagination):
    """For small, bounded collections (e.g. therapy program catalogue)."""

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
