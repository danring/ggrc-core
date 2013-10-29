
"""Add Object Ownership.

Revision ID: 2eed0beaeb9a
Revises: 5aaff2fe5bfc
Create Date: 2013-10-22 18:19:44.931369

"""

# revision identifiers, used by Alembic.
revision = '2eed0beaeb9a'
down_revision = '5aaff2fe5bfc'

import sqlalchemy as sa
from alembic import op
from datetime import datetime
from sqlalchemy.sql import table, column
from sqlalchemy.sql.expression import literal_column

ownership_table = table('object_owners',
    column('id', sa.Integer),
    column('person_id', sa.Integer),
    column('ownable_id', sa.Integer),
    column('ownable_type', sa.String),
    column('modified_by_id', sa.Integer),
    column('created_at', sa.DateTime),
    column('updated_at', sa.DateTime),
    column('context_id', sa.Integer),
    )

object_tables = [
    ('categories', 'Category'),
    ('controls', 'Control'),
    ('data_assets', 'DataAsset'),
    ('directives', 'Directive'),
    ('documents', 'Document'),
    ('facilities', 'Facility'),
    ('helps', 'Help'),
    ('markets', 'Market'),
    ('objectives', 'Objective'),
    ('options', 'Option'),
    ('org_groups', 'OrgGroup'),
    ('products', 'Product'),
    ('projects', 'Project'),
    ('relationships', 'Relationship'),
    ('sections', 'Section'),
    ('systems', 'System'),
    ]

def upgrade():
  op.create_table('object_owners',
      sa.Column('id', sa.Integer(), nullable=False),
      sa.Column('person_id', sa.Integer(), nullable=False),
      sa.Column('ownable_id', sa.Integer(), nullable=False),
      sa.Column('ownable_type', sa.String(length=250), nullable=False),
      sa.Column('modified_by_id', sa.Integer(), nullable=False),
      sa.Column('created_at', sa.DateTime(), nullable=False),
      sa.Column('updated_at', sa.DateTime(), nullable=False),
      sa.Column('context_id', sa.Integer(), nullable=True),
      sa.ForeignKeyConstraint(['person_id'], ['people.id']),
      sa.ForeignKeyConstraint(['context_id'], ['contexts.id']),
      sa.PrimaryKeyConstraint('id'),
      )
  for object_table_name, object_type in object_tables:
    current_datetime = datetime.now()
    op.execute("""
      INSERT INTO object_owners
      (person_id, ownable_id, ownable_type, modified_by_id,
       created_at, updated_at)
      SELECT
        joined_people.id,
        {object_table_name}.id,
        "{object_type}" AS object_type,
        joined_people.id AS modified_by_id_2,
        '{current_datetime}' AS created_at,
        '{current_datetime}' AS updated_at
      FROM {object_table_name}
        LEFT JOIN people AS joined_people
          ON joined_people.id = {object_table_name}.modified_by_id
      WHERE joined_people.id IS NOT NULL""".format(
        current_datetime=current_datetime,
        object_table_name=object_table_name,
        object_type=object_type,
        ))

    # This (select_from) would be great, if it were available in SQLAlchemy
    # 0.8.2 But it won't be available till 0.8.3 and 0.9
    """
    object_table = table(object_table_name,
        column('id', sa.Integer),
        column('created_by_id', sa.Integer),
        )
    op.execute(ownership_table.insert()\
      .from_select(
        [ 'person_id', 'object_id', 'object_type', 'modified_by_id',
          'created_at', 'updated_at',
          ],
      object_table.select(
        [ 'modified_by_id', 'id', literal_column(object_type),
          'modified_by_id', literal_column(current_datetime),
          literal_column(current_datetime),
          ])))
    """

def downgrade():
  op.drop_table('object_owners')
