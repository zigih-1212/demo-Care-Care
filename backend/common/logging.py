"""Structured logging helpers.

Every log line carries the request id so that a single patient request can be
correlated across access log, application log and audit log in Loki. Without
this, incident forensics in a regulated product is guesswork.
"""

from __future__ import annotations

import logging

from .middleware import get_current_request_id


class RequestIDFilter(logging.Filter):
    """Inject the current request id into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_current_request_id() or "-"
        return True
