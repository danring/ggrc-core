"""pop sample evidence document joins

Revision ID: 307bd54ac651
Revises: 2814f1c74e03
Create Date: 2013-10-09 18:53:28.026439

"""

# revision identifiers, used by Alembic.
revision = '307bd54ac651'
down_revision = '2814f1c74e03'

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import select


def upgrade():

  op.add_column("responses", sa.Column("population_worksheet_id", sa.Integer(),
    nullable=True))
  op.add_column("responses", sa.Column("sample_worksheet_id", sa.Integer(),
    nullable=True))
  op.add_column("responses", sa.Column("sample_evidence_id", sa.Integer(),
    nullable=True))

  op.create_foreign_key(
    'population_worksheet_document',
    'responses',
    'documents',
    ['population_worksheet_id'],
    ['id']
  )
  op.create_foreign_key(
    'sample_worksheet_document',
    'responses',
    'documents',
    ['sample_worksheet_id'],
    ['id']
  )
  op.create_foreign_key(
    'sample_evidence_document',
    'responses',
    'documents',
    ['sample_evidence_id'],
    ['id']
  )

  op.drop_column("responses", "population_worksheet")
  op.drop_column("responses", "sample_worksheet")
  op.drop_column("responses", "sample_evidence")


def downgrade():
  op.add_column("responses",
    sa.Column("population_worksheet", sa.String(length=250), nullable=True))
  op.add_column("responses",
    sa.Column("sample_worksheet", sa.String(length=250), nullable=True))
  op.add_column("responses",
    sa.Column("sample_evidence", sa.String(length=250), nullable=True))

  op.drop_constraint('population_worksheet_document', 'responses', type_='foreignkey')
  op.drop_constraint('sample_worksheet_document', 'responses', type_='foreignkey')
  op.drop_constraint('sample_evidence_document', 'responses', type_='foreignkey')

  op.drop_column("responses", "population_worksheet_id")
  op.drop_column("responses", "sample_worksheet_id")
  op.drop_column("responses", "sample_evidence_id")
