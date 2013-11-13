# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

from ggrc import db
from .mixins import deferred, Base, Described

class Option(Described, Base, db.Model):
  __tablename__ = 'options'

  role = db.Column(db.String)
  title = deferred(db.Column(db.String), 'Option')
  required = deferred(db.Column(db.Boolean), 'Option')

  _publish_attrs = [
      'role',
      'title',
      'required',
      ]
  _sanitize_html = [
      'title',
      ]
