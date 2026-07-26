"""Add performance indexes on high-cardinality columns

Revision ID: add_perf_idx_001
Revises: pin_hash_001
Create Date: 2026-07-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'add_perf_idx_001'
down_revision = 'pin_hash_001'
branch_labels = None
depends_on = None


INDEXES = [
    ("ix_orders_cashier_id",        "orders",             ["cashier_id"]),
    ("ix_orders_created_at",        "orders",             ["created_at"]),
    ("ix_orders_branch_id",         "orders",             ["branch_id"]),
    ("ix_payments_method",          "payments",           ["method"]),
    ("ix_payments_created_at",      "payments",           ["created_at"]),
    ("ix_customers_name",           "customers",          ["name"]),
    ("ix_customers_phone",          "customers",          ["phone"]),
    ("ix_menu_items_category_id",   "menu_items",         ["category_id"]),
    ("ix_menu_items_is_active",     "menu_items",         ["is_active"]),
    ("ix_stock_transactions_created_at", "stock_transactions", ["created_at"]),
    ("ix_employee_shifts_user_id",  "employee_shifts",    ["user_id"]),
    ("ix_employee_shifts_status",   "employee_shifts",    ["status"]),
    ("ix_employee_shifts_clock_in", "employee_shifts",    ["clock_in"]),
    ("ix_delivery_orders_status",   "delivery_orders",    ["status"]),
    ("ix_delivery_orders_aggregator", "delivery_orders",  ["aggregator"]),
]


def upgrade() -> None:
    for idx_name, table, columns in INDEXES:
        cols = ", ".join(columns)
        op.execute(
            sa.text(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({cols})")
        )


def downgrade() -> None:
    for idx_name, table, _ in INDEXES:
        op.execute(sa.text(f"DROP INDEX IF EXISTS {idx_name}"))
