"""Remove old audit tables

Revision ID: 53ef72c8a867
Revises: 526117e15ce4
Create Date: 2013-09-10 23:24:50.751098

"""

# revision identifiers, used by Alembic.
revision = '53ef72c8a867'
down_revision = '526117e15ce4'

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

NOT_NULL_COLS = [
                     ('control_assessments', 'pbc_list_id'),
                     ('control_assessments', 'control_id'),
                     ('system_controls', 'system_id'),
                     ('system_controls', 'control_id'),
                     ('responses', 'request_id'),
                     ('responses', 'system_id'),
]

EXPLICIT_INDEXES = [
                    ('control_assessments', 'control_id', 'controls', 'control_assessments_ibfk_1'),
                    ('control_assessments', 'pbc_list_id', 'pbc_lists', 'control_assessments_ibfk_2'),
                    ('system_controls', 'system_id', 'systems', 'system_controls_ibfk_3'),
                    ('system_controls', 'control_id', 'controls', 'system_controls_ibfk_1'),
                    ('responses', 'request_id', 'requests', 'responses_ibfk_1'),
                    ('responses', 'system_id', 'systems', 'responses_ibfk_2'),
]

UNIQUE_CONSTRAINTS = [('control_assessments', ['pbc_list_id', 'control_id']),
                      ('system_controls', ['system_id', 'control_id']),
                      ('responses', ['request_id', 'system_id']),
]

def create_explicit_index(table, column, referred_table, constraint_name):
    " Explicit indexes need to be created to work around http://bugs.mysql.com/bug.php?id=21395 "
    op.drop_constraint(constraint_name, table, type_='foreignkey')
    op.create_index('ix_' + column, table, [column])
    op.create_foreign_key(constraint_name, table, referred_table, [column], ['id'])

def drop_explicit_index(table, column, referred_table, constraint_name):
    op.drop_constraint(constraint_name, table, type_='foreignkey')
    op.drop_index('ix_' + column, table)
    op.create_foreign_key(constraint_name, table, referred_table, [column], ['id'])

def upgrade():
    op.drop_table(u'system_controls')
    op.drop_table(u'meetings')
    op.drop_table(u'population_samples')
    op.drop_table(u'responses')
    op.drop_table(u'requests')
    op.drop_table(u'control_assessments')
    op.drop_table(u'pbc_lists')
    op.drop_table(u'cycles')
    op.drop_table(u'transactions')


def downgrade():
    op.create_table(u'transactions',
    sa.Column(u'id', sa.INTEGER(), nullable=False),
    sa.Column(u'modified_by_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DATETIME(), nullable=True),
    sa.Column(u'updated_at', sa.DATETIME(), nullable=True),
    sa.Column(u'description', sa.TEXT(), nullable=True),
    sa.Column(u'title', sa.VARCHAR(length=250), nullable=True),
    sa.Column(u'system_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'context_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_transactions_contexts'),
    sa.ForeignKeyConstraint(['system_id'], [u'systems.id'], name=u'transactions_ibfk_1'),
    sa.PrimaryKeyConstraint(u'id'),
    mysql_default_charset=u'utf8',
    mysql_engine=u'InnoDB'
    )
    op.create_table(u'cycles',
    sa.Column(u'id', sa.INTEGER(), nullable=False),
    sa.Column(u'modified_by_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DATETIME(), nullable=True),
    sa.Column(u'updated_at', sa.DATETIME(), nullable=True),
    sa.Column(u'description', sa.TEXT(), nullable=True),
    sa.Column(u'start_at', sa.DATE(), nullable=True),
    sa.Column(u'complete', sa.BOOLEAN, nullable=False),
    sa.Column(u'title', sa.VARCHAR(length=250), nullable=True),
    sa.Column(u'audit_firm', sa.VARCHAR(length=250), nullable=True),
    sa.Column(u'audit_lead', sa.VARCHAR(length=250), nullable=True),
    sa.Column(u'status', sa.VARCHAR(length=250), nullable=True),
    sa.Column(u'notes', sa.TEXT(), nullable=True),
    sa.Column(u'end_at', sa.DATE(), nullable=True),
    sa.Column(u'program_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column(u'report_due_at', sa.DATE(), nullable=True),
    sa.Column(u'context_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_cycles_contexts'),
    sa.ForeignKeyConstraint(['program_id'], [u'programs.id'], name=u'cycles_ibfk_1'),
    sa.PrimaryKeyConstraint(u'id'),
    mysql_default_charset=u'utf8',
    mysql_engine=u'InnoDB'
    )
    op.create_table(u'pbc_lists',
    sa.Column(u'id', sa.INTEGER(), nullable=False),
    sa.Column(u'modified_by_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DATETIME(), nullable=True),
    sa.Column(u'updated_at', sa.DATETIME(), nullable=True),
    sa.Column(u'audit_cycle_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column(u'context_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['audit_cycle_id'], [u'cycles.id'], name=u'pbc_lists_ibfk_1'),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_pbc_lists_contexts'),
    sa.PrimaryKeyConstraint(u'id'),
    mysql_default_charset=u'utf8',
    mysql_engine=u'InnoDB'
    )
    op.create_table(u'control_assessments',
    sa.Column(u'id', sa.INTEGER(), nullable=False),
    sa.Column(u'modified_by_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DATETIME(), nullable=True),
    sa.Column(u'updated_at', sa.DATETIME(), nullable=True),
    sa.Column(u'pbc_list_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column(u'control_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column(u'control_version', sa.VARCHAR(length=250), nullable=True),
    sa.Column(u'internal_tod', sa.BOOLEAN, nullable=True),
    sa.Column(u'internal_toe', sa.BOOLEAN, nullable=True),
    sa.Column(u'external_tod', sa.BOOLEAN, nullable=True),
    sa.Column(u'external_toe', sa.BOOLEAN, nullable=True),
    sa.Column(u'notes', sa.TEXT(), nullable=True),
    sa.Column(u'context_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_control_assessments_contexts'),
    sa.ForeignKeyConstraint(['control_id'], [u'controls.id'], name=u'control_assessments_ibfk_1'),
    sa.ForeignKeyConstraint(['pbc_list_id'], [u'pbc_lists.id'], name=u'control_assessments_ibfk_2'),
    sa.PrimaryKeyConstraint(u'id'),
    mysql_default_charset=u'utf8',
    mysql_engine=u'InnoDB'
    )
    op.create_table(u'requests',
    sa.Column(u'id', sa.INTEGER(), nullable=False),
    sa.Column(u'modified_by_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DATETIME(), nullable=True),
    sa.Column(u'updated_at', sa.DATETIME(), nullable=True),
    sa.Column(u'pbc_list_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column(u'type_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'pbc_control_code', sa.VARCHAR(length=250), nullable=True),
    sa.Column(u'pbc_control_desc', sa.TEXT(), nullable=True),
    sa.Column(u'request', sa.TEXT(), nullable=True),
    sa.Column(u'test', sa.TEXT(), nullable=True),
    sa.Column(u'notes', sa.TEXT(), nullable=True),
    sa.Column(u'company_responsible', sa.VARCHAR(length=250), nullable=True),
    sa.Column(u'auditor_responsible', sa.VARCHAR(length=250), nullable=True),
    sa.Column(u'date_requested', sa.DATETIME(), nullable=True),
    sa.Column(u'status', sa.VARCHAR(length=250), nullable=True),
    sa.Column(u'control_assessment_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'response_due_at', sa.DATE(), nullable=True),
    sa.Column(u'context_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_requests_contexts'),
    sa.ForeignKeyConstraint(['control_assessment_id'], [u'control_assessments.id'], name=u'requests_ibfk_1'),
    sa.ForeignKeyConstraint(['pbc_list_id'], [u'pbc_lists.id'], name=u'requests_ibfk_2'),
    sa.PrimaryKeyConstraint(u'id'),
    mysql_default_charset=u'utf8',
    mysql_engine=u'InnoDB'
    )
    op.create_table(u'responses',
    sa.Column(u'id', sa.INTEGER(), nullable=False),
    sa.Column(u'modified_by_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DATETIME(), nullable=True),
    sa.Column(u'updated_at', sa.DATETIME(), nullable=True),
    sa.Column(u'request_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column(u'system_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column(u'status', sa.VARCHAR(length=250), nullable=True),
    sa.Column(u'context_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_responses_contexts'),
    sa.ForeignKeyConstraint(['request_id'], [u'requests.id'], name=u'responses_ibfk_1'),
    sa.ForeignKeyConstraint(['system_id'], [u'systems.id'], name=u'responses_ibfk_2'),
    sa.PrimaryKeyConstraint(u'id'),
    mysql_default_charset=u'utf8',
    mysql_engine=u'InnoDB'
    )
    op.create_table(u'population_samples',
    sa.Column(u'id', sa.INTEGER(), nullable=False),
    sa.Column(u'modified_by_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DATETIME(), nullable=True),
    sa.Column(u'updated_at', sa.DATETIME(), nullable=True),
    sa.Column(u'response_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column(u'population_document_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'population', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'sample_worksheet_document_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'samples', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'sample_evidence_document_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'context_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_population_samples_contexts'),
    sa.ForeignKeyConstraint(['population_document_id'], [u'documents.id'], name=u'population_samples_ibfk_1'),
    sa.ForeignKeyConstraint(['response_id'], [u'responses.id'], name=u'population_samples_ibfk_2'),
    sa.ForeignKeyConstraint(['sample_evidence_document_id'], [u'documents.id'], name=u'population_samples_ibfk_3'),
    sa.ForeignKeyConstraint(['sample_worksheet_document_id'], [u'documents.id'], name=u'population_samples_ibfk_4'),
    sa.PrimaryKeyConstraint(u'id'),
    mysql_default_charset=u'utf8',
    mysql_engine=u'InnoDB'
    )
    op.create_table(u'meetings',
    sa.Column(u'id', sa.INTEGER(), nullable=False),
    sa.Column(u'modified_by_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DATETIME(), nullable=True),
    sa.Column(u'updated_at', sa.DATETIME(), nullable=True),
    sa.Column(u'response_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column(u'start_at', sa.DATETIME(), nullable=True),
    sa.Column(u'calendar_url', sa.VARCHAR(length=250), nullable=True),
    sa.Column(u'context_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_meetings_contexts'),
    sa.ForeignKeyConstraint(['response_id'], [u'responses.id'], name=u'meetings_ibfk_1'),
    sa.PrimaryKeyConstraint(u'id'),
    mysql_default_charset=u'utf8',
    mysql_engine=u'InnoDB'
    )
    op.create_table(u'system_controls',
    sa.Column(u'id', sa.INTEGER(), nullable=False),
    sa.Column(u'modified_by_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'created_at', sa.DATETIME(), nullable=True),
    sa.Column(u'updated_at', sa.DATETIME(), nullable=True),
    sa.Column(u'system_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column(u'control_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column(u'state', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column(u'cycle_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column(u'context_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['context_id'], [u'contexts.id'], name=u'fk_system_controls_contexts'),
    sa.ForeignKeyConstraint(['control_id'], [u'controls.id'], name=u'system_controls_ibfk_1'),
    sa.ForeignKeyConstraint(['cycle_id'], [u'cycles.id'], name=u'system_controls_ibfk_2'),
    sa.ForeignKeyConstraint(['system_id'], [u'systems.id'], name=u'system_controls_ibfk_3'),
    sa.PrimaryKeyConstraint(u'id'),
    mysql_default_charset=u'utf8',
    mysql_engine=u'InnoDB'
    )

    for table, column in NOT_NULL_COLS:
        op.alter_column(table, column, nullable=False, existing_type = sa.INTEGER)
    for table, column, referred_table, constraint_name in EXPLICIT_INDEXES:
        create_explicit_index(table, column, referred_table, constraint_name) 
    for table, columns in UNIQUE_CONSTRAINTS:
        op.create_unique_constraint('uq_' + table, table, columns)
