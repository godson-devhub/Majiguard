"""Add the users table (institution staff accounts with admin approval)."""
from alembic import op
import sqlalchemy as sa

revision = "20261009_0004"
down_revision = "20261002_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("institution", sa.String(length=40), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by_id", sa.Integer(), nullable=True),
        sa.CheckConstraint("status IN ('pending','approved','rejected','disabled')", name="ck_users_status"),
        sa.CheckConstraint(
            "institution IN ('ministry_of_water','ruwasa','district_water_authority','other')",
            name="ck_users_institution",
        ),
        sa.ForeignKeyConstraint(["approved_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_status", "users", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_status", table_name="users")
    op.drop_table("users")
