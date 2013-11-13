# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: vraj@reciprocitylabs.com
# Maintained By: vraj@reciprocitylabs.com

from ggrc import db
from .mixins import deferred, BusinessObject, Timeboxed
from .object_person import Personable

class Audit(Personable, Timeboxed, BusinessObject, db.Model):
  __tablename__ = 'audits'

  VALID_STATES = (u'Planned', u'In Progress', u'Manager Review',
    u'Ready for External Review', u'Completed')
  report_start_date = deferred(db.Column(db.Date), 'Audit')
  report_end_date = deferred(db.Column(db.Date), 'Audit')
  audit_firm = deferred(db.Column(db.String), 'Audit')
  status = deferred(db.Column(db.Enum(*VALID_STATES), nullable=False),
    'Audit')
  gdrive_evidence_folder = deferred(db.Column(db.String), 'Audit')
  program_id = deferred(db.Column(db.Integer, db.ForeignKey('programs.id'),
    nullable=False), 'Audit')
  requests = db.relationship('Request', backref='audit',
    cascade='all, delete-orphan')
  _publish_attrs = [
    'report_start_date',
    'report_end_date',
    'audit_firm',
    'status',
    'gdrive_evidence_folder',
    'program',
    'requests',
  ]
  _sanitize_html = [
    'audit_firm',
    'gdrive_evidence_folder',
  ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Audit, cls).eager_query()
    return query.options(
      orm.joinedload('program'),
      orm.subqueryload('requests'),
      orm.subqueryload_all('object_people.person'))
