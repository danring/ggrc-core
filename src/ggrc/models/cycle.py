from ggrc import db
from .mixins import Base

class Cycle(Base, db.Model):
  __tablename__ = 'cycles'

  start_at = db.Column(db.Date)
  complete = db.Column(db.Boolean, default=False, nullable=False)
  title = db.Column(db.String)
  audit_firm = db.Column(db.String)
  audit_lead = db.Column(db.String)
  description = db.Column(db.Text)
  status = db.Column(db.String)
  notes = db.Column(db.Text)
  end_at = db.Column(db.Date)
  program_id = db.Column(db.Integer, db.ForeignKey('programs.id'))
  report_due_at = db.Column(db.Date)
  pbc_lists = db.relationship('PbcList', backref='audit_cycle')