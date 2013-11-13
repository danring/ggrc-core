
"""Remove and rename type columns

Revision ID: 5c38e7a65cc
Revises: 3df9e3188977
Create Date: 2013-11-13 04:05:17.578143

"""

# revision identifiers, used by Alembic.
revision = '5c38e7a65cc'
down_revision = '3df9e3188977'

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.drop_column('documents', u'type_id')
    op.drop_column('systems', u'type_id')
    op.alter_column(
        'products',
        'type_id',
        new_column_name='kind_id',
        existing_type=sa.Integer())


def downgrade():
    op.alter_column(
        'products',
        'kind_id',
        new_column_name='type_id',
        existing_type=sa.Integer())
    op.add_column(
        'systems', sa.Column(u'type_id', sa.Integer(), nullable=True))
    op.add_column(
        'documents', sa.Column(u'type_id', sa.Integer(), nullable=True))
