# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

from flask import Blueprint
from ggrc import settings
from ggrc.app import app
from ggrc.services.registry import service
import ggrc_risk_assessments.models as models


# Initialize Flask Blueprint for extension
blueprint = Blueprint(
  'risk_assessments',
  __name__,
  template_folder='templates',
  static_folder='static',
  static_url_path='/static/ggrc_risk_assessments',
)


# Initialize service endpoints

all_collections = [
  service('templates', models.Template),
  service('risk_assessments', models.RiskAssessment),
  service('risk_assessment_mappings', models.RiskAssessmentMapping),
  service('risk_assessment_control_mappings', models.RiskAssessmentControlMapping),
  service('threats', models.Threat),
  service('vulnerabilities', models.Vulnerability),
]
