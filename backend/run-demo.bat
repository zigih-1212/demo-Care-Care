@echo off
REM Local demo launcher: migrate + seed + runserver on SQLite.
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  echo ERROR: .venv not found. Run: uv venv --python 3.12 ^&^& uv pip install -e ".[dev]"
  exit /b 1
)
set DJANGO_SETTINGS_MODULE=carecare.settings.demo
set PYTHONIOENCODING=utf-8
echo === migrate ===
.venv\Scripts\python.exe manage.py migrate --noinput
echo === seed ===
.venv\Scripts\python.exe manage.py seed_demo
echo === runserver (Ctrl+C to stop) ===
.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
