# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: vraj@reciprocitylabs.com

from ggrc import db
from .mixins import Mapping

class RiskRiskyAttribute(Mapping, db.Model):
  __tablename__ = 'risk_risky_attributes'

  risk_id = db.Column(db.Integer, db.ForeignKey('risks.id'), nullable=False)
  risky_attribute_id = db.Column(db.Integer, db.ForeignKey('risky_attributes.id'), nullable=False)

  __table_args__ = (
    db.UniqueConstraint('risk_id', 'risky_attribute_id'),
  )

  _publish_attrs = [
      'risk',
      'risky_attribute',
      ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(RiskRiskyAttribute, cls).eager_query()
    return query.options(
        orm.subqueryload('risk'),
        orm.subqueryload('risky_attribute'))

  def _display_name(self):
    return self.risky_attribute.display_name + '<->' + self.risk.display_name
