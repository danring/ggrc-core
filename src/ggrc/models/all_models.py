# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

"""All gGRC model classes grouped together for convenience."""

# TODO: Implement with Authentication
#from .account import Account
from .audit import Audit
from .categorization import Categorization
from .category import Category
from .context import Context
from .control import Control
from .control_control import ControlControl
from .control_risk import ControlRisk
from .control_section import ControlSection
from .data_asset import DataAsset
from .directive import Directive, Regulation, Policy, Contract
from .directive_control import DirectiveControl
from .document import Document
from .facility import Facility
from .help import Help
from .market import Market
from .object_control import ObjectControl
from .object_document import ObjectDocument
from .object_objective import ObjectObjective
from .object_person import ObjectPerson
from .object_section import ObjectSection
from .objective import Objective
from .objective_control import ObjectiveControl
from .option import Option
from .org_group import OrgGroup
from .person import Person
from .product import Product
from .program import Program
from .program_control import ProgramControl
from .program_directive import ProgramDirective
from .project import Project
from .relationship import Relationship, RelationshipType
from .request import Request
from .response import Response, DocumentationResponse, InterviewResponse, PopulationSampleResponse
from .meeting import Meeting

#TODO: This isn't currently used
#from .relationship_type import RelationshipType
from .risk import Risk
from .risk_risky_attribute import RiskRiskyAttribute
from .risky_attribute import RiskyAttribute
from .section import Section
from .section_objective import SectionObjective
from .system import SystemOrProcess, System, Process

from .revision import Revision
from .event import Event
all_models = [
  Audit,
  Categorization,
  Category,
  Context,
  Control,
  ControlControl,
  ControlRisk,
  ControlSection,
  DataAsset,
  Directive,
    Contract,
    Policy,
    Regulation,
  DirectiveControl,
  Document,
  Facility,
  Help,
  Market,
  Meeting,
  Objective,
  ObjectiveControl,
  ObjectControl,
  ObjectDocument,
  ObjectObjective,
  ObjectPerson,
  ObjectSection,
  Option,
  OrgGroup,
  Person,
  Product,
  Program,
  ProgramControl,
  ProgramDirective,
  Project,
  Relationship,
  RelationshipType,
  Request,
  Response,
    DocumentationResponse,
    InterviewResponse,
    PopulationSampleResponse,
  Risk,
  RiskRiskyAttribute,
  RiskyAttribute,
  Section,
  SectionObjective,
  SystemOrProcess,
    System,
    Process,
  Revision,
  Event,
  ]

__all__ = [model.__name__ for model in all_models]
