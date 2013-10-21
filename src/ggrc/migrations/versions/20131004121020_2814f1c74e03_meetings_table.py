"""Meetings table

Revision ID: 2814f1c74e03
Revises: 4b59a0789316
Create Date: 2013-10-04 19:02:25.400600

"""

# revision identifiers, used by Alembic.
revision = '2814f1c74e03'
down_revision = '4b59a0789316'

from alembic import op
import sqlalchemy as sa


from alembic import op
import sqlalchemy as sa


def upgrade():
  op.create_table('meetings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('response_id', sa.Integer(), nullable=False),
    sa.Column('owner_id', sa.Integer(), nullable=True),
    sa.Column('title', sa.String(length=250), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('modified_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('context_id', sa.Integer(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('start_at', sa.DateTime(), nullable=False),
    sa.Column('end_at', sa.DateTime(), nullable=False),    
    sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], ),
    sa.ForeignKeyConstraint(['owner_id'], ['people.id'], ),
    sa.ForeignKeyConstraint(['response_id'], ['responses.id'], ),
    sa.PrimaryKeyConstraint('id')
  )

def downgrade():
    op.drop_table('meetings')
