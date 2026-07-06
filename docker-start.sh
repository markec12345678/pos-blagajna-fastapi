#!/bin/sh
# ── POS Restaurant – Docker Production Start ──
# Usage: ./docker-start.sh [--with-postgres]

case "$1" in
  --with-postgres)
    echo "Starting with PostgreSQL..."
    docker compose up -d --build
    # Wait for DB, then run migration + seed
    sleep 3
    docker compose exec -T pos python -c "from app.main import create_app; app = create_app()"
    ;;
  *)
    echo "Starting with SQLite..."
    docker compose up -d --build
    ;;
esac

echo ""
echo "POS Restaurant running at http://localhost:8000"
echo "User: admin / Password: admin"
echo "To stop: docker compose down"
