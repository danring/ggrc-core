# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

from behave import given
from factory.fuzzy import FuzzyChoice
from ggrc_risk_assessments.models import Threat, Vulnerability, Template
import tests.ggrc.behave.factories as factories

class ThreatFactory(factories.ModelFactory):
  MODEL = Threat
  status = FuzzyChoice(MODEL.VALID_STATES)

class VulnerabilityFactory(factories.ModelFactory):
  MODEL = Vulnerability
  status = FuzzyChoice(MODEL.VALID_STATES)

class TemplateFactory(factories.ModelFactory):
  MODEL = Template

@given('Risk assessment factories registration')
def risk_assessment_factories_registration(context):
  factories.ThreatFactory = ThreatFactory
  factories.VulnerabilityFactory = VulnerabilityFactory
  factories.TemplateFactory = TemplateFactory
