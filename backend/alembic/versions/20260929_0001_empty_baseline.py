"""Empty baseline for the pre-schema MajiGuard database.

Revision ID: 20260929_0001
Revises:
Create Date: 2026-09-29
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260929_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
