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
DIRECTIVE_TYPES = [
  Policy,
  Contract,
  Regulation,
]
MISC_GOV_TYPES = [
  Control,
  Objective,
]
HEAD_GOV_TYPES = DIRECTIVE_TYPES + MISC_GOV_TYPES
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

def create_n_sections(num_sections, prefix, directive, offset):
  """create num_sections under a given directive"""
  new_sections = []
  for i in xrange(num_sections):
    num_str = str(offset + i).zfill(3)
    # pick a random directive to assign it to
    print "Creating a section attached to {0}.".format(
        directive.slug
    )
    new_section = Section(
        title=prefix + Section.__name__ + num_str,
        slug=prefix + Section.__name__.upper() + "-" + num_str,
        directive=directive
    )
    new_sections.append(new_section)
    db.session.add(new_section)
  modified_objs = get_modified_objects(db.session)
  db.session.commit()
  update_index(db.session, modified_objs)
  return new_sections

def set_up_object(obj_type, num, prefix):
  num_str = str(num).zfill(3)
  if obj_type == Person:
    print prefix + num_str + "@example.com"
    return Person(
        name=prefix + obj_type.__name__ + num_str,
        email=(prefix + num_str + "@example.com").lower(),
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
  db.session.commit()
  update_index(db.session, modified_objs)
  created_objs = reduce(add, new_objects.values())
  print "created {0} objects".format(len(created_objs))
  return created_objs


def map_n_from_each(source_obj_list, target_obj_list, num_mappings):
  for source_obj in source_obj_list:
    # map each to num_mappings target objects if possible
    remaining_target_objs = [x for x in target_obj_list if type(x) != type(source_obj)]
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

def seed_random(prefix, num_gov_objs=10, num_bis_objs=15, num_mappings=10):
  prog = Program(title="RandomGenProg", slug=prefix + "RGP-123")
  try:
    db.session.add(prog)
    modified_objs = get_modified_objects(db.session)
    db.session.commit()
    update_index(db.session, modified_objs)
  except:
    db.session.rollback()

  ex_prog = Program.query.filter(Program.slug==prefix + "RGP-123")[0]
  dir_objects = create_n_of_each(DIRECTIVE_TYPES, num_gov_objs, ex_prog, prefix)
  sec_objects = []
  offset = 0  # to keep section IDs unique
  # create a number of sections on each directive equal to num_gov_objs
  # parameter
  for dir_obj in dir_objects:
    sec_set = create_n_sections(num_gov_objs, prefix, dir_obj, offset)
    sec_objects += sec_set
    offset += num_gov_objs
  misc_objects = create_n_of_each(MISC_GOV_TYPES, num_gov_objs, ex_prog, prefix)
  bis_objects = create_n_of_each(BIS_TYPES, num_bis_objs, ex_prog, prefix)

  all_gov_objects = dir_objects + misc_objects + sec_objects
  map_n_from_each(all_gov_objects, all_gov_objects, num_mappings)
  map_n_from_each(all_gov_objects, bis_objects, num_mappings)
  map_n_from_each(bis_objects, bis_objects, num_mappings)

if __name__ == "__main__":
  if len(argv) >= 2:
    seed_random(argv[1])
  else:
    seed_random("EXAMPLE")
