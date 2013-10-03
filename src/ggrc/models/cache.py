# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: vraj@reciprocitylabs.com
# Maintained By: vraj@reciprocitylabs.com

class Cache:
  """
  Tracks modified objects in the session distinguished by
  type of modification: new, dirty and deleted.
  """
  def __init__(self):
    self.clear()

  def update(self, session):
    self.new.update(session.new)
    self.deleted.update(session.deleted)
    modified = {o for o in session.dirty if session.is_modified(o)}
    # When intermediate flushes happen, new and dirty may overlap
    self.dirty.update(modified - self.new - self.deleted)

  def clear(self):
    self.new = set()
    self.dirty = set()
    self.deleted = set()

  def copy(self):
    copied_cache = Cache()
    copied_cache.new = set(self.new)
    copied_cache.dirty = set(self.dirty)
    copied_cache.deleted = set(self.deleted)
    return copied_cache
