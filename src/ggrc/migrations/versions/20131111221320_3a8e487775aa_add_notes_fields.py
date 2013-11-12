
"""Add notes fields

Revision ID: 3a8e487775aa
Revises: 1a9409a1df1b
Create Date: 2013-11-11 22:13:20.687962

"""

# revision identifiers, used by Alembic.
revision = '3a8e487775aa'
down_revision = 'f2024a58c75'

from alembic import op
import sqlalchemy as sa


add_notes_tables = [
    'audits',
    #'controls', # already exists
    'data_assets',
    'directives',
    'facilities',
    'markets',
    #'objectives', # already exists
    'org_groups',
    'products',
    'programs',
    'projects',
    'responses',
    'risks',
    'risky_attributes',
    ]


def upgrade():
    for table_name in add_notes_tables:
      op.add_column(table_name, sa.Column('notes', sa.Text(), nullable=True))


def downgrade():
    for table_name in add_notes_tables:
      op.drop_column(table_name, 'notes')
