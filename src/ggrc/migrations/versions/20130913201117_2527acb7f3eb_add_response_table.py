"""Add response table

Revision ID: 2527acb7f3eb
Revises: 50d3cad50bb8
Create Date: 2013-09-13 20:11:17.840269

"""

# revision identifiers, used by Alembic.
revision = '2527acb7f3eb'
down_revision = '50d3cad50bb8'

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table('responses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('request_id', sa.Integer(), nullable=False),
    sa.Column('response_type', sa.Enum(u'documentation', u'interview', u'population sample'), nullable=False),
    sa.Column('status', sa.Enum(u'Assigned', u'Accepted', u'Completed'), nullable=False),
    sa.Column('owner_id', sa.Integer(), nullable=True),
    sa.Column('title', sa.String(length=250), nullable=False),
    sa.Column('slug', sa.String(length=250), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('modified_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('context_id', sa.Integer(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('url', sa.String(length=250), nullable=True),
    sa.Column('population_worksheet', sa.String(length=250), nullable=True),
    sa.Column('population_count', sa.Integer(), nullable=True),
    sa.Column('sample_worksheet', sa.String(length=250), nullable=True),
    sa.Column('sample_count', sa.Integer(), nullable=True),
    sa.Column('sample_evidence', sa.String(length=250), nullable=True),
    sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], ),
    sa.ForeignKeyConstraint(['owner_id'], ['people.id'], ),
    sa.ForeignKeyConstraint(['request_id'], ['requests.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('evidence',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('url', sa.String(length=250), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('modified_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('context_id', sa.Integer(), nullable=True),
    sa.Column('response_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], ),
    sa.ForeignKeyConstraint(['response_id'], ['responses.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('evidence')
    op.drop_table('responses')
