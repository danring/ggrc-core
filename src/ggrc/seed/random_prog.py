# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: silas@reciprocitylabs.com
# Maintained By: silas@reciprocitylabs.com

from copy import deepcopy
from operator import add
import random
from sys import argv

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

def identifier(obj):
  """returns the helpful label to distinguish the object from others of its type; usually the slug but some objects may not have one"""
  return getattr(obj, "slug", None) or obj.name

def create_n_of_each(type_list, num, program):
  print program.__repr__()
  for obj_type in type_list:
    for j in xrange(num):
      new_obj = set_up_object(obj_type, j)
      try:
        db.session.add(new_obj)
        modified_objs = get_modified_objects(db.session)
        update_index(db.session, modified_objs)
        db.session.commit()
      except:
        print "{0}:{1} already in db".format(
            obj_type.__name__,
            identifier(new_obj),
        )
        db.session.rollback()
      # connect to program if a gov
      if obj_type in GOV_OBJECTS:
        try:
          join_obj = get_join_object(program, new_obj)
          db.session.add(join_obj)
          modified_objs = get_modified_objects(db.session)
          update_index(db.session, modified_objs)
          db.session.commit()
        except Exception as inst:
          print "could not join a/n {0} to the program".format(identifier)
          print inst.__class__, inst.args
          db.session.rollback()

def map_n_from_each(source_type_list, target_type_list, num_mappings):
  # get all objects whose type is in source type list,
  # repeate for target type list
  source_obj_dict = {source_type: source_type.query.all() for source_type in source_type_list}
  all_source_objs = reduce(
      add,
      [value for key, value in source_obj_dict.iteritems()]
  )
  target_obj_dict = {target_type: target_type.query.all() for target_type in target_type_list}
  all_target_objs = reduce(
      add,
      [value for key, value in target_obj_dict.iteritems()]
  )
  print [identifier(x) for x in all_source_objs]
  for source_obj in all_source_objs:
    # map each to num_mappings target objects if possible
    print source_obj.slug
    remaining_target_objs = [x for x in all_target_objs if type(x) != type(source_obj)]
    left_to_assign = num_mappings
    while left_to_assign > 0:
      obj_ind = random.randint(0, len(remaining_target_objs) - 1)
      try:
        target_obj = remaining_target_objs[obj_ind]
        join_obj = get_join_object(source_obj, target_obj)
        print "Attempting to assign {0} to {1}".format(
          identifier(source_obj),
          identifier(target_obj),
        )
        # if it gets to this point, decrement and remove
        left_to_assign -= 1
        del remaining_target_objs[obj_ind]
        db.session.add(join_obj)
        db.session.commit()
      except Exception as inst:
        print "got an exception trying to map!"
        print inst.__class__, inst.args
        db.session.rollback()

def seed_random(prefix):
  global PREFIX
  PREFIX = prefix
  prog = Program(title="RandomGenProg", slug="RGP-123")
  try:
    db.session.add(prog)
    modified_objs = get_modified_objects(db.session)
    update_index(db.session, modified_objs)
    db.session.commit()
  except:
    db.session.rollback()
  
  ex_prog = Program.query.filter(Program.slug=="RGP-123")[0]
  create_n_of_each(GOV_OBJECTS, 9, ex_prog)
  create_n_of_each(BIS_OBJECTS, 15, ex_prog)
  
  map_n_from_each(GOV_OBJECTS, GOV_OBJECTS, 5)
  map_n_from_each(GOV_OBJECTS, BIS_OBJECTS, 7)


if __name__ == "__main__":
  seed_random()



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
