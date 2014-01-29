
"""Add risk roles.

Revision ID: ed04a3223b
Revises: 1cf70fb6b6cc
Create Date: 2014-01-27 16:08:37.726183

"""

# revision identifiers, used by Alembic.
revision = 'ed04a3223b'
down_revision = '1cf70fb6b6cc'

from alembic import op
from datetime import datetime
from sqlalchemy.sql import table, column
import sqlalchemy as sa

roles_table = table('roles',
    column('id', sa.Integer),
    column('name', sa.String),
    column('permissions_json', sa.String),
    column('description', sa.Text),
    column('modified_by_id', sa.Integer),
    column('created_at', sa.DateTime),
    column('updated_at', sa.DateTime),
    column('context_id', sa.Integer),
    column('scope', sa.String),
    )

def upgrade():
  current_datetime = datetime.now()
  for role in [
      'RiskAssessmentManager', 'RiskAssessmentReader', 'RiskAssessmentCounsel',
      ]:
    op.execute(
        roles_table.insert().values(
          name=role,
          permissions_json='CODE DECLARED ROLE',
          modified_by_id=1,
          created_at=current_datetime,
          updated_at=current_datetime,
          context_id=0,
          scope='System',
          ))

def downgrade():
  for role in [
      'RiskAssessmentManager', 'RiskAssessmentReader', 'RiskAssessmentCounsel',
      ]:
    op.execute(roles_table.delete().where(roles_table.c.name==role))
