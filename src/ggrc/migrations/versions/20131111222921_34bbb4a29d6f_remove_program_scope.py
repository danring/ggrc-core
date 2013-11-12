
"""Remove program scope and organization

Revision ID: 34bbb4a29d6f
Revises: 8c3eb54ab9b
Create Date: 2013-11-11 22:29:21.222514

"""

# revision identifiers, used by Alembic.
revision = '34bbb4a29d6f'
down_revision = '3a8e487775aa'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.drop_column('programs', u'scope')
    op.drop_column('programs', u'organization')


def downgrade():
    op.add_column('programs', sa.Column(u'scope', sa.Text(), nullable=True))
    op.add_column('programs', sa.Column(u'organization', sa.String(250), nullable=True))
