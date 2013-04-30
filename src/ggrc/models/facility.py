from ggrc import db
from .mixins import BusinessObject, Timeboxed
from .object_document import Documentable
from .object_person import Personable

class Facility(Documentable, Personable, Timeboxed, BusinessObject, db.Model):
  __tablename__ = 'facilities'