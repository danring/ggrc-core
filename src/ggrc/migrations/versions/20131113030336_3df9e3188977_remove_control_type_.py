
"""Remove Control.type, add Control assessors

Revision ID: 3df9e3188977
Revises: 2277e3978eb5
Create Date: 2013-11-13 03:03:36.585160

"""

# revision identifiers, used by Alembic.
revision = '3df9e3188977'
down_revision = '2277e3978eb5'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.add_column('controls', sa.Column('principal_assessor_id', sa.Integer(), nullable=True))
    op.add_column('controls', sa.Column('secondary_assessor_id', sa.Integer(), nullable=True))
    op.drop_column('controls', u'type_id')


def downgrade():
    op.add_column('controls', sa.Column(u'type_id', sa.Integer(), nullable=True))
    op.drop_column('controls', 'secondary_assessor_id')
    op.drop_column('controls', 'principal_assessor_id')
