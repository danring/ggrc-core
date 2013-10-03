from .base import *

from ggrc.models import Person
from .base_row import *
from collections import OrderedDict

class PeopleRowConverter(BaseRowConverter):
  model_class = Person

  def setup_object(self):
    person_email = self.attrs.get('email')
    if person_email:
      self.obj = Person.query.filter_by(email = person_email).first()
      self.obj = self.obj or self.importer.find_object(Person, person_email)
      self.obj = self.obj or Person()
      self.importer.add_object(Person, person_email, self.obj)
      if self.obj.id:
        self.add_warning('email', "{} already exists and will be updated.".format(person_email))
      return self.obj
    else:
      self.obj = Person()
      return self.obj

  def reify(self):
    self.handle_text_or_html('name')
    self.handle('email', ContactEmailHandler, is_required=True)
    self.handle_text_or_html('company')

  def save_object(self, db_session, **options):
    db_session.add(self.obj)


class PeopleConverter(BaseConverter):

  metadata_map = OrderedDict([
    ('Type','type'),
  ])

  object_map = OrderedDict([
    ('Name', 'name'),
    ('Email', 'email'),
    ('Company', 'company')
  ])

  row_converter = PeopleRowConverter

  def do_export_metadata(self):
    yield self.metadata_map.keys()
    yield ['People']
    yield []
    yield []
    yield self.object_map.keys()


