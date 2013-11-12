
"""Change owner_id to contact_id

Revision ID: f2024a58c75
Revises: 2eed0beaeb9a
Create Date: 2013-11-11 21:06:45.926241

"""

# revision identifiers, used by Alembic.
revision = 'f2024a58c75'
down_revision = '2eed0beaeb9a'

from alembic import op
import sqlalchemy as sa


change_owner_to_contact_tables = [
    'audits',
    'controls',
    'data_assets',
    'directives',
    'facilities',
    'markets',
    #'meetings'?
    'objectives',
    'org_groups',
    'products',
    'programs',
    'projects',
    'responses',
    'risks',
    'risky_attributes',
    'sections',
    'systems',
    ]


def ggrc_create_foreign_key(table, referenced_table, columns, referenced_columns):
    op.create_foreign_key(
        'fk_{0}_{1}'.format(table, columns[0]),
        table,
        referenced_table,
        columns,
        referenced_columns)

def upgrade():
    # Current, `owner_id` is not constrained consistently, so remove existing
    # constraints to be added uniformly later
    op.drop_constraint('audits_ibfk_2', 'audits', type_='foreignkey')
    op.drop_index('owner_id', 'audits')
    op.drop_constraint('responses_ibfk_2', 'responses', type_='foreignkey')
    op.drop_index('owner_id', 'responses')
    op.drop_constraint('systems_ibfk_1', 'systems', type_='foreignkey')
    op.drop_index('owner_id', 'systems')

    for table_name in change_owner_to_contact_tables:
      op.alter_column(
          table_name,
          'owner_id',
          new_column_name='contact_id',
          existing_type=sa.INTEGER())
      #op.create_foreign_key(
      #    'fk_{}_owner_id'.format(table),
      #    table,
      #    'people',
      #    ['contact_id'],
      #    ['id'])


def downgrade():
    for table_name in change_owner_to_contact_tables:
      op.alter_column(
          table_name,
          'contact_id',
          new_column_name='owner_id',
          existing_type=sa.INTEGER())
    op.create_index('owner_id', 'systems', ['owner_id'])
    op.create_foreign_key('systems_ibfk_1', 'systems', 'people', ['owner_id'], ['id'])
    op.create_index('owner_id', 'responses', ['owner_id'])
    op.create_foreign_key('responses_ibfk_2', 'responses', 'people', ['owner_id'], ['id'])
    op.create_index('owner_id', 'audits', ['owner_id'])
    op.create_foreign_key('audits_ibfk_2', 'audits', 'people', ['owner_id'], ['id'])
