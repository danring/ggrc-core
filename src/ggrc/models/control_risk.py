# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: vraj@reciprocitylabs.com

from ggrc import db
from .mixins import Mapping

class ControlRisk(Mapping, db.Model):
  __tablename__ = 'control_risks'

  control_id = db.Column(
      db.Integer, db.ForeignKey('controls.id'), nullable=False)
  risk_id = db.Column(db.Integer, db.ForeignKey('risks.id'), nullable=False)

  __table_args__ = (
    db.UniqueConstraint('control_id', 'risk_id'),
  )

  _publish_attrs = [
      'control',
      'risk',
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(ControlRisk, cls).eager_query()
    return query.options(
        orm.subqueryload('control'),
        orm.subqueryload('risk'))

  def _display_name(self):
    return self.risk.display_name + '<->' + self.control.display_name
