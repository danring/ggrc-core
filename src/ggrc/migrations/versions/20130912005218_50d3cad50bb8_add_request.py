"""Add request

Revision ID: 50d3cad50bb8
Revises: 53c3b75c86ed
Create Date: 2013-09-12 00:52:18.549450

"""

# revision identifiers, used by Alembic.
revision = '50d3cad50bb8'
down_revision = '53c3b75c86ed'

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table('requests',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assignee_id', sa.Integer(), nullable=False),
    sa.Column('request_type', sa.Enum(u'documentation', u'interview', u'population sample'), nullable=False),
    sa.Column('status', sa.Enum(u'Draft', u'Requested', u'Responded', u'Amended Request', u'Updated Response', u'Accepted'), nullable=False),
    sa.Column('requested_on', sa.Date(), nullable=False),
    sa.Column('due_on', sa.Date(), nullable=False),
    sa.Column('audit_id', sa.Integer(), nullable=False),
    sa.Column('objective_id', sa.Integer(), nullable=False),
    sa.Column('gdrive_upload_path', sa.String(length=250), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('modified_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('context_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['assignee_id'], ['people.id'], ),
    sa.ForeignKeyConstraint(['audit_id'], ['audits.id'], ),
    sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], ),
    sa.ForeignKeyConstraint(['objective_id'], ['objectives.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('requests')
