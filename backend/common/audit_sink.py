"""Audit sink export seam.

The concrete transport (S3/GCS/SIEM HTTP) is chosen at deploy time. This module
defines the contract and raises clearly when unconfigured, so a misconfigured
deployment fails loudly in the worker rather than silently dropping the trail.
"""

from __future__ import annotations

from collections.abc import Iterable


def export_to_sink(sink_url: str, entries: Iterable) -> None:
    """Serialise audit entries and push them to the configured sink."""
    import json

    payload = [
        {
            "id": str(e.id),
            "action": e.action,
            "resource_type": e.resource_type,
            "resource_id": e.resource_id,
            "actor_email": e.actor_email,
            "ip_address": e.ip_address,
            "request_id": e.request_id,
            "created_at": e.created_at.isoformat(),
            "metadata": e.metadata,
        }
        for e in entries
    ]
    body = json.dumps(payload).encode("utf-8")

    if sink_url.startswith("http"):
        import urllib.request

        # Scheme is constrained to http(s) above; S310 is about arbitrary
        # schemes (file:, ftp:), which we have already excluded.
        req = urllib.request.Request(  # noqa: S310 - scheme validated above
            sink_url, data=body, headers={"Content-Type": "application/json"}, method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310 - configured sink
            if resp.status >= 300:
                raise RuntimeError(f"Audit sink returned {resp.status}")
        return

    raise NotImplementedError(f"Unsupported audit sink scheme: {sink_url}")
