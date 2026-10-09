"""Open sign-up: accounts are active on creation and the institution is free text."""
from alembic import op
import sqlalchemy as sa

revision = "20261009_0005"
down_revision = "20261009_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_users_institution", "users", type_="check")
    op.alter_column(
        "users",
        "institution",
        existing_type=sa.String(length=40),
        type_=sa.String(length=200),
        existing_nullable=False,
    )
    op.alter_column("users", "status", existing_type=sa.String(length=16), server_default="approved")
    # Accounts created while approval was required become usable.
    op.execute("UPDATE users SET status = 'approved' WHERE status = 'pending'")


def downgrade() -> None:
    op.alter_column("users", "status", existing_type=sa.String(length=16), server_default="pending")
    op.execute(
        "UPDATE users SET institution = 'other' WHERE institution NOT IN "
        "('ministry_of_water','ruwasa','district_water_authority','other')"
    )
    op.alter_column(
        "users",
        "institution",
        existing_type=sa.String(length=200),
        type_=sa.String(length=40),
        existing_nullable=False,
    )
    op.create_check_constraint(
        "ck_users_institution",
        "users",
        "institution IN ('ministry_of_water','ruwasa','district_water_authority','other')",
    )
