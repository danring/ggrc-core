
"""Add state fields

Revision ID: 8c3eb54ab9b
Revises: 3a8e487775aa
Create Date: 2013-11-11 22:14:40.782605

"""

# revision identifiers, used by Alembic.
revision = '8c3eb54ab9b'
down_revision = '34bbb4a29d6f'

from alembic import op
import sqlalchemy as sa


add_state_tables = [
    'programs',
    'directives',
    'controls',
    'objectives',

    'data_assets',
    'facilities',
    'markets',
    'org_groups',
    'products',
    'projects',
    'systems',
    'risks',
    'risky_attributes',

    'control_controls',
    'control_risks',
    'control_sections',
    'directive_controls',
    'objective_controls',
    'object_controls',
    'object_documents',
    'object_objectives',
    'object_owners',
    'object_people',
    'object_sections',
    'program_controls',
    'program_directives',
    'relationships',
    'risk_risky_attributes',
    'section_objectives',
    ]


def upgrade():
    for table_name in add_state_tables:
      op.add_column(table_name, sa.Column('status', sa.String(250), nullable=True))


def downgrade():
    for table_name in add_state_tables:
      op.drop_column(table_name, 'status')
