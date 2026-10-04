"""Add administrative assignment provenance fields."""
from alembic import op
import sqlalchemy as sa
revision = "20261001_0002"
down_revision = "ef160622e343"
branch_labels = None
depends_on = None
def upgrade() -> None:
    op.add_column("water_points", sa.Column("administrative_assignment_source", sa.Text(), nullable=True))
    op.add_column("water_points", sa.Column("administrative_assignment_version", sa.String(length=64), nullable=True))
    op.add_column("water_points", sa.Column("administrative_assignment_status", sa.String(length=64), nullable=True))
    op.add_column("water_points", sa.Column("administrative_assignment_crs", sa.String(length=64), nullable=True))
def downgrade() -> None:
    op.drop_column("water_points", "administrative_assignment_crs")
    op.drop_column("water_points", "administrative_assignment_status")
    op.drop_column("water_points", "administrative_assignment_version")
    op.drop_column("water_points", "administrative_assignment_source")
