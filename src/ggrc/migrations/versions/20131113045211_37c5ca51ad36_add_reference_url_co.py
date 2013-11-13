
"""Add reference_url column

Revision ID: 37c5ca51ad36
Revises: 5c38e7a65cc
Create Date: 2013-11-13 04:52:11.031221

"""

# revision identifiers, used by Alembic.
revision = '37c5ca51ad36'
down_revision = '5c38e7a65cc'

from alembic import op
import sqlalchemy as sa


tables_with_reference_url_column = [
    'audits',
    'controls',
    'data_assets',
    'directives',
    'facilities',
    'markets',
    'objectives',
    'org_groups',
    'products',
    'programs',
    'projects',
    'responses',
    'risks',
    'risky_attributes',
    'sections',
    'systems',
    ]


def upgrade():
    for table_name in tables_with_reference_url_column:
      op.add_column(
          table_name,
          sa.Column('reference_url', sa.String(length=250), nullable=True))


def downgrade():
    for table_name in tables_with_reference_url_column:
      op.drop_column(table_name, 'reference_url')
