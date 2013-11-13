
"""Change audit_firm to OrgGroup foreign key

Revision ID: 2277e3978eb5
Revises: 8c3eb54ab9b
Create Date: 2013-11-13 01:41:08.630883

"""

# revision identifiers, used by Alembic.
revision = '2277e3978eb5'
down_revision = '8c3eb54ab9b'

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('audits', sa.Column('audit_firm_id', sa.Integer(), nullable=True))
    op.drop_column('audits', u'audit_firm')


def downgrade():
    op.add_column('audits', sa.Column(u'audit_firm', sa.String(250), nullable=True))
    op.drop_column('audits', 'audit_firm_id')
