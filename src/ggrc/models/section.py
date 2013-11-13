# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: vraj@reciprocitylabs.com

from ggrc import db
from .associationproxy import association_proxy
from .mixins import (
    deferred, Hierarchical, Noted, Described, Hyperlinked, WithContact,
    Slugged,
    )
from .object_document import Documentable
from .object_owner import Ownable
from .object_person import Personable
from .reflection import PublishOnly

class Section(
    Documentable, Personable, Hierarchical, Ownable,
    Noted, Described, Hyperlinked, WithContact, Slugged, db.Model):
  __tablename__ = 'sections'

  directive_id = deferred(
      db.Column(db.Integer, db.ForeignKey('directives.id'), nullable=False),
      'Section')
  na = deferred(db.Column(db.Boolean, default=False, nullable=False),
      'Section')
  notes = deferred(db.Column(db.Text), 'Section')

  control_sections = db.relationship(
      'ControlSection', backref='section', cascade='all, delete-orphan')
  controls = association_proxy(
      'control_sections', 'control', 'ControlSection')
  section_objectives = db.relationship(
      'SectionObjective', backref='section', cascade='all, delete-orphan')
  objectives = association_proxy(
      'section_objectives', 'objective', 'SectionObjective')
  object_sections = db.relationship(
      'ObjectSection', backref='section', cascade='all, delete-orphan')

  _publish_attrs = [
      'directive',
      'na',
      'notes',
      PublishOnly('control_sections'),
      'controls',
      PublishOnly('section_objectives'),
      'objectives',
      'object_sections',
      ]
  _sanitize_html = [
      'notes',
      ]
  #_update_attrs = [
  #    'directive',
  #    'na',
  #    'notes',
  #    'controls',
  #    'objectives',
  #    'object_sections',
  #    ]

  _include_links = [
      'control_sections',
      'section_objectives',
      'object_sections',
      ]

  @classmethod
  def generate_slug_prefix_for(cls, obj):
    from directive import Contract
    if obj.directive and isinstance(obj.directive, Contract):
      return "CLAUSE"
    return super(Section, cls).generate_slug_prefix_for(obj)

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Section, cls).eager_query()
    return cls.eager_inclusions(query, Section._include_links).options(
        orm.joinedload('directive'),
        orm.subqueryload('control_sections'),
        orm.subqueryload('section_objectives'),
        orm.subqueryload('object_sections'))

  def log_json(self):
    out_json = super(Section, self).log_json()
    # so that event log can refer to deleted directive
    out_json["mapped_directive"] = self.directive.display_name
    return out_json
