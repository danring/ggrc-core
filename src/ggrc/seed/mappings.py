# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

_link_specs = [
    ('Program', 'Control', 'ProgramControl', 'program', 'control', 'program_controls', 'program_controls'),
    ('Program', 'Directive', 'ProgramDirective', 'program', 'directive', 'program_directives', 'program_directives'),
    ('Control', 'Control', 'ControlControl', 'control', 'implemented_control', 'control_controls', 'control_controls'),
    ('Control', 'Section', 'ControlSection', 'control', 'section', 'control_sections', 'control_sections'),
    ('Directive', 'Control', 'DirectiveControl', 'directive', 'control', 'directive_controls', 'directive_controls'),
    ('Objective', 'Control', 'ObjectiveControl', 'objective', 'control', 'objective_controls', 'objective_controls'),
    ('Section', 'Objective', 'SectionObjective', 'section', 'objective', 'section_objectives', 'section_objectives'),
    (None, 'Person', 'ObjectPerson', 'personable', 'person', 'object_people', 'object_people'),
    (None, 'Document', 'ObjectDocument', 'documentable', 'document', 'object_documents', 'object_documents'),
    (None, 'Section', 'ObjectSection', 'sectionable', 'section', 'object_sections', 'object_sections'),
    (None, 'Control', 'ObjectControl', 'controllable', 'control', 'object_controls', 'object_controls'),
    (None, 'Objective', 'ObjectObjective', 'objectiveable', 'objective', 'object_objectives', 'object_objectives'),
    (None, None, 'Relationship', 'source', 'destination', 'related_as_source', 'related_as_destination'),
    ]

def _get_join_object(source, target, link_spec):
  from ggrc.models import all_models
  _, _, join_type, join_source_attr, join_target_attr, _, _ = link_spec

  join_model = getattr(all_models, join_type)
  return join_model(**{
    join_source_attr: source,
    join_target_attr: target
    })

def get_join_object(source, target):
  from ggrc.models import all_models

  for link_spec in _link_specs:
    source_type, target_type, _, _, _, _, _ = link_spec

    if source_type:
      source_model = getattr(all_models, source_type)
    else:
      source_model = ()

    if target_type:
      target_model = getattr(all_models, target_type)
    else:
      target_model = ()

    if (source_type is None or isinstance(source, source_model))\
        and (target_type is None or isinstance(target, target_model)):
      return _get_join_object(source, target, link_spec)

    elif (source_type is None or isinstance(target, source_model))\
        and (target_type is None or isinstance(source, target_model)):
      return _get_join_object(target, source, link_spec)

  raise TypeError('No way to map {} to {}'.format(source, target))

