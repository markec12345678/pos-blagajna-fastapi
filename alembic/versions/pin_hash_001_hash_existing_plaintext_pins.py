"""Hash existing plaintext PINs

Revision ID: pin_hash_001
Revises: 9f6505d2db0c
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
import hashlib
import secrets

revision = 'pin_hash_001'
down_revision = '9f6505d2db0c'
branch_labels = None
depends_on = None


def hash_pin(pin: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256(f"{salt}:{pin}".encode()).hexdigest()
    return f"{salt}:{h}"


def upgrade():
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT id, pin_code FROM users WHERE pin_code IS NOT NULL"))
    for row in result:
        pin = row.pin_code
        if pin and ':' not in pin:
            hashed = hash_pin(pin)
            conn.execute(
                sa.text("UPDATE users SET pin_code = :hashed WHERE id = :id"),
                {"hashed": hashed, "id": row.id}
            )


def downgrade():
    pass  # Cannot reverse hash
