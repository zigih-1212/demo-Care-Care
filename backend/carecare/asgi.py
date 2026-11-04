"""ASGI entrypoint (async workers, e.g. Uvicorn behind an ASGI server)."""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "carecare.settings.prod")

application = get_asgi_application()
