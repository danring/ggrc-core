from ggrc.app import app, db
from ggrc.models.all_models import *

prog = Program(title="RandomGenProg", slug="RGP-123")


NUM_BASE_OBJECTS = 9
BASE_OBJECTS = [
    Project,
    Product,
    Process,
    DataAsset,
    System,
    Market,
    OrgGroup,
    Facility,

    Control,
    Objective,
    Policy,
    Contract,
    Regulation,


]

for i, obj_type in enumerate(BASE_OBJECTS):
  for j in xrange(NUM_BASE_OBJECTS):
    num_str = str(j).zfill(3)
    new_obj = obj_type(
        title=obj_type.__name__ + num_str,
        slug=obj_type.__name__.upper() + "-" + num_str,
    )
    try:
      db.session.add(new_obj)
      db.session.commit()
    except:
      "{0}:{1} already in db".format(obj_type, new_obj.slug)
      db.session.rollback()

print "\n".join(
  [str(
    sorted(
      [(z.title, z.slug) for z in obj_type.query.all()],
      key=lambda x: x[0],
    )
  ) for obj_type in BASE_OBJECTS]
)
#ps = Project.query.all()
#print [p.title for p in ps]



#    Person,
#    Directive,
#    Categorization,
#    ObjectPerson,
#    Risk,
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
#    Section,
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
