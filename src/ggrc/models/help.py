# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

from ggrc import db
from .mixins import deferred, Slugged
from .object_owner import Ownable

class Help(Ownable, Slugged, db.Model):
  __tablename__ = 'helps'

  content = deferred(db.Column(db.Text), 'Help')

  _fulltext_attrs = [
      'content',
      ]
  _publish_attrs = [
      'content',
      ]
  _sanitize_html = [
      'content',
      ]
