# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: silas@reciprocitylabs.com
# Maintained By: silas@reciprocitylabs.com

import random

from ggrc.app import app, db
from ggrc.models.all_models import *
from ggrc.seed.mappings import get_join_object

prog = Program(title="RandomGenProg", slug="RGP-123")

PREFIX = "EXAMPLE_"

def pick_random(obj_type, num_items=1):
  all_objs = obj_type.query.all()
  num_return = min(len(all_objs), num_items)
  return random.sample(all_objs, num_return)

def set_up_object(obj_type, num):
  num_str = str(num).zfill(3)
  if obj_type == Person:
    print PREFIX + num_str + "@example.com"
    return Person(
        name=PREFIX + obj_type.__name__ + num_str,
        email=(PREFIX + num_str + "@example.com").lower(),
    )
  else:
    return obj_type(
        title=PREFIX + obj_type.__name__ + num_str,
        slug=PREFIX + obj_type.__name__.upper() + "-" + num_str,
    )

def display(obj):
  attrs = ["slug", "title", "name", "email"]
  output = []
  for attr in attrs:
    if hasattr(obj, attr):
      output.append(getattr(obj, attr))
  return output

def create_n_of_each(type_list, num):
  for obj_type in type_list:
    for j in xrange(num):
      new_obj = set_up_object(obj_type, j)
      try:
        db.session.add(new_obj)
        db.session.commit()
      except:
        identifier = getattr(new_obj, "slug", None) or new_obj.name
        print "{0}:{1} already in db".format(
            obj_type.__name__,
            identifier
        )
        db.session.rollback()

BIS_OBJECTS = [
    Project,
    Product,
    Process,
    DataAsset,
    System,
    Market,
    OrgGroup,
    Facility,
    Risk,
    Person,
]
GOV_OBJECTS = [
    Control,
    Objective,
    Policy,
    Contract,
    Regulation,
]

create_n_of_each(GOV_OBJECTS, 9)
create_n_of_each(BIS_OBJECTS, 15)


print "\n".join(
  [str(
    sorted(
      [display(z) for z in obj_type.query.all()],
      key=lambda x: x[0],
    )
  ) for obj_type in (GOV_OBJECTS + BIS_OBJECTS)]
)



#    Person,
#    Directive,
#    Categorization,
#    ObjectPerson,
#    Category,
#    DirectiveControl,
#    ObjectSection,
#    RiskRiskyAttribute,
#    Context,
#    Document,
#    ProgramControl,
#    RiskyAttribute,
#    Event,
#    ObjectiveControl,
#    ProgramDirective,
#    Option,
#    SectionObjective,
#    ControlAssessment,
#    Help,
#    ControlControl,
#    PbcList,
#    Relationship,
#    SystemControl,
#    ControlRisk,
#    Meeting,
#    RelationshipType,
#    SystemOrProcess,
#    ControlSection,
#    ObjectControl,
#    Request,
#    SystemSystem,
#    Cycle,
#    ObjectDocument,
#    PopulationSample,
#    Response,
#    all_models,
#    ObjectObjective,
#    Revision,
#    Section,
