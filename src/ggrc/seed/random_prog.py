import random

from ggrc.app import app, db
from ggrc.models.all_models import *

prog = Program(title="RandomGenProg", slug="RGP-123")

PREFIX = "EXAMPLE_"

def pick_random(obj_type, num_items=1):
  all_objs = obj_type.query.all()
  num_return = min(len(all_objs), num_items)
  return random.sample(all_objs, num_return)

def create_n_of_each(type_list, num):
  for obj_type in type_list:
    for j in xrange(num):
      num_str = str(j).zfill(3)
      new_obj = obj_type(
          title=PREFIX + obj_type.__name__ + num_str,
          slug=PREFIX + obj_type.__name__.upper() + "-" + num_str,
      )
      try:
        db.session.add(new_obj)
        db.session.commit()
      except:
        print "{0}:{1} already in db".format(
            obj_type.__name__,
            new_obj.slug
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
    #Section,
    Risk,
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
      [(z.title, z.slug) for z in obj_type.query.all()],
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
