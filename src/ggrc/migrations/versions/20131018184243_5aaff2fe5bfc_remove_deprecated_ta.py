
"""Remove deprecated tables

Revision ID: 5aaff2fe5bfc
Revises: 307bd54ac651
Create Date: 2013-10-18 18:42:43.975544

"""

# revision identifiers, used by Alembic.
revision = '5aaff2fe5bfc'
down_revision = '307bd54ac651'

from alembic import op
import sqlalchemy as sa

def create_explicit_index(table, column, referred_table, constraint_name):
    " Explicit indexes need to be created to work around http://bugs.mysql.com/bug.php?id=21395 "
    op.drop_constraint(constraint_name, table, type_='foreignkey')
    op.create_index('ix_' + column, table, [column])
    op.create_foreign_key(constraint_name, table, referred_table, [column], ['id'])

def upgrade():
    op.drop_table('system_systems')
    op.drop_table('evidence')

def downgrade():
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
    op.create_table('system_systems',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('modified_by_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('context_id', sa.Integer(), nullable=True),
    sa.Column('parent_id', sa.Integer(), nullable=True),
    sa.Column('child_id', sa.Integer(), nullable=True),
    sa.Column('type', sa.String(length=250), nullable=True),
    sa.Column('order', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['child_id'], ['systems.id'], name='system_systems_ibfk_1'),
    sa.ForeignKeyConstraint(['parent_id'], ['systems.id'], name='system_systems_ibfk_2'),
    sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], name='fk_system_systems_contexts'),
    sa.PrimaryKeyConstraint('id')
    )
    create_explicit_index('system_systems', 'child_id', 'systems', 'system_systems_ibfk_1')
    create_explicit_index('system_systems', 'parent_id', 'systems', 'system_systems_ibfk_2')
    op.create_unique_constraint('uq_system_systems', 'system_systems', ['parent_id', 'child_id'])
