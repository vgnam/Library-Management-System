"""Add infraction tracking and blocked card status

Revision ID: add_infraction_tracking
Revises: f9a075ca46e9_
Create Date: 2025-12-31

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_infraction_tracking'
down_revision = 'f9a075ca46e9_'
branch_labels = None
depends_on = None


def upgrade():
    # Add infraction_count column to readers table
    op.add_column('readers', sa.Column('infraction_count', sa.Integer(), nullable=False, server_default='0'))
    
    # Note: SQLAlchemy Enum changes need to be handled carefully
    # The CardStatusEnum already exists in the model with the new 'Blocked' value
    # MSSQL will automatically handle the new enum value when the model is used
    # No explicit ALTER TYPE needed for MSSQL


def downgrade():
    # Remove infraction_count column from readers table
    op.drop_column('readers', 'infraction_count')
    
    # Enum rollback would require more complex operations
    # Not implemented here to avoid complications
