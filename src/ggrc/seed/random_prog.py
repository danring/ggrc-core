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

BIS_TYPES = [
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
HEAD_GOV_TYPES = [
  Control,
  Objective,
  Policy,
  Contract,
  Regulation,
]
SECTION_TYPES = [Section]
ALL_GOV_TYPES = HEAD_GOV_TYPES + SECTION_TYPES
DIRECTIVE_TYPE_LIST = [Policy, Contract, Regulation]

def add_to_site_db(obj, session):
  try:
    session.add(obj)
    modified_objs = get_modified_objects(session)
    session.commit()
    update_index(session, modified_objs)
  except:
    session.rollback()


def pick_random(obj_type, num_items=1):
  all_objs = obj_type.query.all()
  num_return = min(len(all_objs), num_items)
  return random.sample(all_objs, num_return)

def set_up_object(obj_type, num, prefix):
  num_str = str(num).zfill(3)
  if obj_type == Person:
    print prefix + num_str + "@example.com"
    return Person(
        name=prefix + obj_type.__name__ + num_str,
        email=(prefix + num_str + "@example.com").lower(),
    )
  elif obj_type == Section:
    # pick a random directive to assign it to
    directive_obj_dict = {dir_type: dir_type.query.all() for dir_type in DIRECTIVE_TYPE_LIST}
    print directive_obj_dict
    all_directive_objects = reduce(
        add,
        [value for key, value in directive_obj_dict.iteritems()]
    )
    print "Found directives {0}".format(
        [x.slug for x in all_directive_objects]
    )
    parent_directive = random.sample(all_directive_objects, 1)[0]
    print "Creating a section attached to {0}.".format(
        parent_directive.slug
    )
    return obj_type(
        title=prefix + obj_type.__name__ + num_str,
        slug=prefix + obj_type.__name__.upper() + "-" + num_str,
        directive=parent_directive
    )
  else:
    return obj_type(
        title=prefix + obj_type.__name__ + num_str,
        slug=prefix + obj_type.__name__.upper() + "-" + num_str,
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

def create_n_of_each(type_list, num, program, prefix):
  new_objects = {}
  for obj_type in type_list:
    print "Creating the {0}s".format(obj_type.__name__)
    new_objects[obj_type] = []
    for j in xrange(num):
      new_obj = set_up_object(obj_type, j, prefix)
      new_objects[obj_type].append(new_obj)
      db.session.add(new_obj)

  modified_objs = get_modified_objects(db.session)
  db.session.flush()
  update_index(db.session, modified_objs)

  for obj_type, objs in new_objects.items():
    if obj_type in HEAD_GOV_TYPES:
      for new_obj in objs:
        join_obj = get_join_object(program, new_obj)
        db.session.add(join_obj)

  modified_objs = get_modified_objects(db.session)
  update_index(db.session, modified_objs)
  db.session.commit()

  return new_objects


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
  for source_obj in all_source_objs:
    # map each to num_mappings target objects if possible
    print identifier(source_obj)
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
  prog = Program(title="RandomGenProg", slug=prefix + "RGP-123")
  try:
    db.session.add(prog)
    modified_objs = get_modified_objects(db.session)
    db.session.commit()
    update_index(db.session, modified_objs)
  except:
    db.session.rollback()

  ex_prog = Program.query.filter(Program.slug==prefix + "RGP-123")[0]
  gov_objects = create_n_of_each(HEAD_GOV_TYPES, 9, ex_prog, prefix)
  sec_objects = create_n_of_each(SECTION_TYPES, 9, ex_prog, prefix)
  bis_objects = create_n_of_each(BIS_TYPES, 15, ex_prog, prefix)

  map_n_from_each(ALL_GOV_TYPES, ALL_GOV_TYPES, 5)
  map_n_from_each(ALL_GOV_TYPES, BIS_TYPES, 7)
  map_n_from_each(BIS_TYPES, BIS_TYPES, 5)

if __name__ == "__main__":
  seed_random("EXAMPLE")
