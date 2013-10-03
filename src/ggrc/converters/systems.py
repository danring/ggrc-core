from .base import *

from ggrc.models.all_models import System, OrgGroup
from .base_row import *
from collections import OrderedDict

class SystemRowConverter(BaseRowConverter):
  model_class = System

  def setup_object(self):
    self.obj = self.setup_object_by_slug(self.attrs)
    if self.obj.id is None:
      self.obj.infrastructure = self.obj.infrastructure or False
      self.obj.is_biz_process = self.importer.options.get('is_biz_process') or False
    else:
      if self.obj.is_biz_process and not self.importer.options.get('is_biz_process'):
        self.add_error('slug', "Code is already used for a Process")
      elif (not self.obj.is_biz_process) and self.importer.options.get('is_biz_process'):
        self.add_error('slug', "Code is already used for a System")
      else:
        sys_type = "Process" if self.importer.options.get('is_biz_process') else "System"
        self.add_warning('slug', "{} already exists and will be updated".format(sys_type))

  def reify(self):
    self.handle('slug', SlugColumnHandler)
    self.handle('controls', LinkControlsHandler)
    self.handle('owner', ContactEmailHandler, person_must_exist=True)
    self.handle('documents', LinkDocumentsHandler)
    self.handle('sub_systems', LinkRelationshipsHandler, model_class=System,
        direction='from')
    self.handle('sub_processes', LinkRelationshipsHandler, model_class=Process,
        direction='from')
    self.handle_option('network_zone')
    id_str = "org_group_is_responsible_for_{}".format(
        "process" if self.options.get('is_biz_process') else "system")
    self.handle('org_groups', LinkRelationshipsHandler, model_class = OrgGroup,
                relationship_type_id = id_str, direction='from',
                model_human_name='Org Group')
    self.handle_date('start_date')
    self.handle_date('created_at', no_import=True)
    self.handle_date('updated_at', no_import=True)
    self.handle_text_or_html('description')
    self.handle_boolean('infrastructure', truthy_values=['infrastructure'])
    self.handle_raw_attr('title', is_required=True)

  def save_object(self, db_session, **options):
    db_session.add(self.obj)

class SystemsConverter(BaseConverter):

  metadata_export_order = ['type', 'slug']


  metadata_map = OrderedDict([
    ('Type','type')
  ])

  object_export_order = [
    'slug', 'title', 'description', 'notes',
    'controls', 'created_at', 'updated_at'
  ]

  object_map = OrderedDict([
    ('System Code', 'slug'),
    ('Title', 'title'),
    ('Description' , 'description'),
    ('Map:References', 'documents'),
    ('Infrastructure', 'infrastructure'),
    ('Map:Person of Contact', 'owner'),
    ('Map:Controls', 'controls'),
    ('Map:System;Sub System', 'sub_systems'),
    ('Map:Process;Sub Process', 'sub_processes'),
    ('Map:Org Group;Overseen By', 'org_groups'),
    ('Effective Date', 'start_date'),
    ('Created', 'created_at'),
    ('Updated', 'updated_at'),
    ('Network Zone', 'network_zone')
  ])

  row_converter = SystemRowConverter

  def create_object_map(self):
    if self.options.get('is_biz_process'):
      self.object_map = OrderedDict( [(k.replace("System Code", 'Process Code'), v) \
                        if k == 'System Code' else (k, v) for k, v in self.object_map.items()] )

  def do_export_metadata(self):
    yield self.metadata_map.keys()
    yield ['Processes' if self.options.get('is_biz_process') else 'Systems']
    yield []
    yield []
    yield self.object_map.keys()
