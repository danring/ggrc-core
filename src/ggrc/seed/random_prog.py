# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: silas@reciprocitylabs.com
# Maintained By: silas@reciprocitylabs.com

from copy import deepcopy
import random

from ggrc.app import app, db
from ggrc.models.all_models import *
from ggrc.seed.mappings import get_join_object
from ggrc.services.common import get_modified_objects, update_index

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

def add_to_site_db(obj, session):
  try:
    session.add(obj)
    modified_objs = get_modified_objects(session)
    session.commit()
    update_index(session, modified_objs)
  except:
    session.rollback()

prog = Program(title="RandomGenProg", slug="RGP-123")
try:
  db.session.add(prog)
  modified_objs = get_modified_objects(db.session)
  update_index(db.session, modified_objs)
  db.session.commit()
except:
  db.session.rollback()

ex_prog = Program.query.filter(Program.slug=="RGP-123")[0]

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
      identifier = getattr(new_obj, "slug", None) or new_obj.name
      try:
        db.session.add(new_obj)
        db.session.commit()
      except:
        print "{0}:{1} already in db".format(
            obj_type.__name__,
            identifier
        )
        db.session.rollback()
      # connect to program if a gov
      if obj_type in GOV_OBJECTS:
        try:
          join_obj = get_join_object(ex_prog, new_obj)
          db.session.add(join_obj)
          db.session.commit()
        except:
          print "could not join a/n {0} to the program".format(identifier)


create_n_of_each(GOV_OBJECTS, 9)
create_n_of_each(BIS_OBJECTS, 15)

GOV_OBJ_DICT = {gov_type: gov_type.query.all() for gov_type in GOV_OBJECTS}

# gov to gov map
from operator import add
all_gov_objects = reduce(
    add,
    [value for key, value in GOV_OBJ_DICT.iteritems()]
)
for gov_obj in all_gov_objects[:2]:
  # map each to 5 other governance objects if possible
  print gov_obj.slug
  remaining_gov_objs = [x for x in all_gov_objects if type(x) != type(gov_obj)]
  left_to_assign = 5
  while left_to_assign > 0:
    obj_ind = random.randint(0, len(remaining_gov_objs) - 1)
    try:
      target_obj = remaining_gov_objs[obj_ind]
      join_obj = get_join_object(gov_obj, target_obj)
      print "Attempting to assign {0} to {1}".format(
        gov_obj.slug,
        target_obj.slug,
      )
      # if it gets to this point, decrement and remove
      left_to_assign -= 1
      del remaining_gov_objs[obj_ind]
      db.session.add(join_obj)
      db.session.commit()
    except TypeError as inst:
      print inst.args


#print "\n".join(
#  [str(
#    sorted(
#      [display(z) for z in obj_type.query.all()],
#      key=lambda x: x[0],
#    )
#  ) for obj_type in (GOV_OBJECTS + BIS_OBJECTS)]
#)



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
