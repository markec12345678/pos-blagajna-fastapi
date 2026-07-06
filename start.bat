@echo off
cd /d F:\testcursor
start "" python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
echo POS server started on http://localhost:8000
