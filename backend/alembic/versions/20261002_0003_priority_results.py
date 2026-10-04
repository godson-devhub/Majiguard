"""Add priority_results table for the backend-owned Priority Engine."""
from alembic import op
import sqlalchemy as sa

revision = "20261002_0003"
down_revision = "20261001_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "priority_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("water_point_id", sa.Integer(), nullable=False),
        sa.Column("priority_type", sa.String(length=32), nullable=False),
        sa.Column("eligible", sa.Boolean(), nullable=False),
        sa.Column("priority_score", sa.Float(), nullable=True),
        sa.Column("priority_rank", sa.Integer(), nullable=True),
        sa.Column("probability_non_functional", sa.Float(), nullable=True),
        sa.Column("impact_score", sa.Float(), nullable=True),
        sa.Column("risk_band", sa.String(length=32), nullable=True),
        sa.Column("observed_status", sa.Text(), nullable=True),
        sa.Column("impact_above_median", sa.Boolean(), nullable=True),
        sa.Column("population_above_median", sa.Boolean(), nullable=True),
        sa.Column("alternative_scarcity_above_median", sa.Boolean(), nullable=True),
        sa.Column("priority_methodology_version", sa.String(length=64), nullable=False),
        sa.Column("priority_unavailable_reason", sa.Text(), nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("priority_type IN ('preventive','restoration')", name="ck_priority_results_type"),
        sa.ForeignKeyConstraint(["water_point_id"], ["water_points.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_priority_results_water_point_type", "priority_results", ["water_point_id", "priority_type"], unique=False)
    op.create_index("ix_priority_results_type_rank", "priority_results", ["priority_type", "priority_rank"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_priority_results_type_rank", table_name="priority_results")
    op.drop_index("ix_priority_results_water_point_type", table_name="priority_results")
    op.drop_table("priority_results")
