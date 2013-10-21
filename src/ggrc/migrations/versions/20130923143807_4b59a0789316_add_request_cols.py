"""Add request cols

Revision ID: 4b59a0789316
Revises: 2527acb7f3eb
Create Date: 2013-09-23 14:38:07.402724

"""

# revision identifiers, used by Alembic.
revision = '4b59a0789316'
down_revision = '2527acb7f3eb'

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column(u'requests', sa.Column('auditor_contact', sa.String(length=250), nullable=True))
    op.add_column(u'requests', sa.Column('test', sa.Text(), nullable=True))
    op.add_column(u'requests', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column(u'requests', sa.Column('description', sa.Text(), nullable=True))


def downgrade():
    op.drop_column(u'requests', 'description')
    op.drop_column(u'requests', 'notes')
    op.drop_column(u'requests', 'test')
    op.drop_column(u'requests', 'auditor_contact')
