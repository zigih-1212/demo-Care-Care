"""WSGI entrypoint (synchronous workers, e.g. Gunicorn)."""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "carecare.settings.prod")

application = get_wsgi_application()
