# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

from ggrc import db
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import validates
from .associationproxy import association_proxy
from .mixins import deferred, BusinessObject, Timeboxed
from .categorization import Categorizable
from .object_control import Controllable
from .object_document import Documentable
from .object_objective import Objectiveable
from .object_owner import Ownable
from .object_person import Personable
from .object_section import Sectionable
from .relationship import Relatable
from .utils import validate_option

CATEGORY_SYSTEM_TYPE_ID = 101

class SystemCategorized(Categorizable):
  @declared_attr
  def categorizations(cls):
    return cls._categorizations(
        'categorizations', 'categories', CATEGORY_SYSTEM_TYPE_ID)

class SystemOrProcess(
    Timeboxed, SystemCategorized, Ownable, BusinessObject, db.Model):
  # Override model_inflector
  _table_plural = 'systems_or_processes'
  __tablename__ = 'systems'

  infrastructure = deferred(db.Column(db.Boolean), 'SystemOrProcess')
  is_biz_process = db.Column(db.Boolean, default=False)
  version = deferred(db.Column(db.String), 'SystemOrProcess')
<<<<<<< HEAD
  # TODO: handle option
=======
>>>>>>> origin/feature/database-changes
  network_zone_id = deferred(db.Column(db.Integer), 'SystemOrProcess')
  network_zone = db.relationship(
      'Option',
      primaryjoin='and_(foreign(SystemOrProcess.network_zone_id) == Option.id, '\
                       'Option.role == "network_zone")',
      uselist=False,
      )

  __mapper_args__ = {
      'polymorphic_on': is_biz_process
      }

  # REST properties
  _publish_attrs = [
      'infrastructure',
      'is_biz_process',
      'version',
      'network_zone',
      ]
  _update_attrs = [
      'infrastructure',
      #'is_biz_process',
      'version',
      'network_zone',
      ]
  _sanitize_html = [
      'version',
      ]

  @validates('network_zone')
  def validate_system_options(self, key, option):
    return validate_option(
        self.__class__.__name__, key, option, 'network_zone')

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(SystemOrProcess, cls).eager_query()
    return query.options(
        orm.joinedload('network_zone'))


class System(
    Documentable, Personable, Objectiveable, Controllable, Sectionable,
    Relatable, SystemOrProcess):
  __mapper_args__ = {
      'polymorphic_identity': False
      }
  _table_plural = 'systems'

  @validates('is_biz_process')
  def validates_is_biz_process(self, key, value):
    return False


class Process(
    Documentable, Personable, Objectiveable, Controllable, Sectionable,
    Relatable, SystemOrProcess):
  __mapper_args__ = {
      'polymorphic_identity': True
      }
  _table_plural = 'processes'

  @validates('is_biz_process')
  def validates_is_biz_process(self, key, value):
    return True
