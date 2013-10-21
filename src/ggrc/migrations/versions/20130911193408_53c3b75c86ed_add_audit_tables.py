"""Add audit tables

Revision ID: 53c3b75c86ed
Revises: 53ef72c8a867
Create Date: 2013-09-11 19:34:08.020226

"""

# revision identifiers, used by Alembic.
revision = '53c3b75c86ed'
down_revision = '53ef72c8a867'

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table('audits',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=250), nullable=False),
    sa.Column('slug', sa.String(length=250), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('url', sa.String(length=250), nullable=True),
    sa.Column('start_date', sa.DateTime(), nullable=True),
    sa.Column('end_date', sa.DateTime(), nullable=True),
    sa.Column('report_start_date', sa.Date(), nullable=True),
    sa.Column('report_end_date', sa.Date(), nullable=True),
    sa.Column('owner_id', sa.Integer(), nullable=True),
    sa.Column('audit_firm', sa.String(length=250), nullable=True),
    sa.Column('status', sa.Enum(u'Planned', u'In Progress', u'Manager Review', u'Ready for External Review', u'Completed'), nullable=False),
    sa.Column('gdrive_evidence_folder', sa.String(length=250), nullable=True),
    sa.Column('program_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('modified_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('context_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], ),
    sa.ForeignKeyConstraint(['owner_id'], ['people.id'], ),
    sa.ForeignKeyConstraint(['program_id'], ['programs.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('audits')
