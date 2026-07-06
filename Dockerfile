# ── Stage 1: Build frontend ──
FROM node:20-alpine AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ── Stage 2: Python backend ──
FROM python:3.12-alpine
WORKDIR /app

# Install runtime deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend
COPY --from=frontend /build/dist /app/frontend/dist

# Copy backend code
COPY app/ app/

# Volume for persistent data
VOLUME /app/data

# Environment
ENV PYTHONUNBUFFERED=1
ENV APP_NAME="POS Restaurant"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/tables')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
