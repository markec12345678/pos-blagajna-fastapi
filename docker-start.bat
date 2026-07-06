@echo off
echo Building and starting POS via Docker...
docker compose up --build -d
timeout /t 3 /nobreak >nul
echo.
echo POS restaurant system running at:
echo   http://localhost:8000
echo   Login: admin / admin
echo.
echo To stop: docker compose down
