from .base import *

from ggrc.models import Directive, Section
from .base_row import *
from collections import OrderedDict

class SectionRowConverter(BaseRowConverter):
  model_class = Section

  def setup_object(self):
    self.obj = self.setup_object_by_slug(self.attrs)
    if self.obj.directive \
        and self.obj.directive is not self.importer.options.get('directive'):
          self.importer.errors.append('Slug code is already used.')
    else:
      self.obj.directive = self.importer.options.get('directive')
      if self.obj.id is not None:
        self.add_warning('slug', "Section already exists and will be updated")

  def reify(self):
    self.handle('slug', SlugColumnHandler)
    self.handle_date('created_at', no_import=True)
    self.handle_date('updated_at', no_import=True)
    self.handle_text_or_html('description')
    self.handle('controls', LinkControlsHandler)
    self.handle_raw_attr('title', is_required=True)

  def save_object(self, db_session, **options):
    if options.get('directive_id'):
      self.obj.directive_id = int(options.get('directive_id'))
      db_session.add(self.obj)


class SectionsConverter(BaseConverter):

  metadata_export_order = ['type', 'slug']

  optional_metadata = [
    'title', 'description', 'start_date', 'end_date', 'kind',
    'audit_start_date', 'audit_frequency', 'audit_duration', 'version'
  ]

  metadata_map = OrderedDict([
    ('Type','type'),
    ('Directive Code','slug'),
    ('Directive Title' , 'title'),
    ('Directive Description' , 'description'),
    ('Created' ,'created_at'),
    ('Updated', 'updated_at'),
    ('Start','start_date'),
    ('Stop' , 'end_date'),
    ('Kind', 'kind'),
    ('Audit Start', 'audit_start_date'),
    ('Audit Frequency', 'audit_frequency'),
    ('Audit Duration','audit_duration'),
    ('Version' ,'version')
  ])

  object_export_order = [
    'slug', 'title', 'description',
    'controls', 'created_at', 'updated_at'
  ]

  object_map = OrderedDict([
    ('Section Code', 'slug'),
    ('Section Title', 'title'),
    ('Section Description' , 'description'),
    ('Controls', 'controls'),
    ('Created', 'created_at'),
    ('Updated', 'updated_at')
  ])

  row_converter = SectionRowConverter

  # Creates the correct metadata_map for the specific directive kind.
  def create_metadata_map(self):
    if self.options.get('directive'):
      self.metadata_map = OrderedDict( [(k.replace("Directive", self.directive().kind), v) \
                          if 'Directive' in k else (k, v) for k, v in self.metadata_map.items()] )

  # Called in case the object_map headers change amongst similar imports
  def create_object_map(self):
    if self.directive().kind == "Contract":
      self.object_map = OrderedDict( [(k.replace("Section", "Clause"), v) \
                          if 'Section' in k else (k, v) for k, v in self.object_map.items()] )

  def directive(self):
    return self.options.get('directive')

  def do_export_metadata(self):
    yield self.metadata_map.keys()
    yield [self.directive().kind, self.directive().slug]
    yield []
    yield []
    yield self.object_map.keys()

