# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: brad@reciprocitylabs.com
# Maintained By: brad@reciprocitylabs.com

Feature: Risk Assessment Reader role

  Background:
    Given service description
    And Risk assessment factories registration
    And User "risk.reader@example.com" has "RiskAssessmentReader" role
    And User "risk.manager@example.com" has "RiskAssessmentManager" role
    And User "risk.counsel@example.com" has "RiskAssessmentCounsel" role
    And User "nonrisk.program.creator@example.com" has "ProgramCreator" role
    And User "nonrisk.reader@example.com" has "Reader" role
    And User "admin@example.com" has "gGRC Admin" role

  Scenario Outline: Risk users can read public programs
    Given the current user
      """
      { "email": "nonrisk.program.creator@example.com" }
      """
    Given a new "Program" named "nonrisk_program"
    And "nonrisk_program" property "private" is literal "False"
    And "nonrisk_program" is POSTed to its collection
    Then GET of "nonrisk_program" is allowed
    Given the current user email "<user_email>"
    Then GET of "nonrisk_program" is allowed
    Then PUT of "nonrisk_program" is forbidden
    Then GET of "nonrisk_program" is allowed
    Then DELETE of "nonrisk_program" is forbidden

  Examples: User Emails
      | user_email               |
      | risk.manager@example.com |
      | risk.reader@example.com  |
      | risk.counsel@example.com |

  Scenario Outline: Risk users have no rights to a private program unless they have a role in the private program.
    Given the current user email "nonrisk.program.creator@example.com"
    And a new "Program" named "private_program"
    And "private_program" property "private" is literal "True"
    And "private_program" is POSTed to its collection
    Then GET of "private_program" is allowed
    Given the current user email "<user_email>"
    Then GET of "private_program" is forbidden
    Given the current user email "nonrisk.program.creator@example.com"
    And a user with email "<user_email>" as "risk_person"
    And existing Role named "ProgramReader"
    And a new "ggrc_basic_permissions.models.UserRole" named "role_assignment" is created from json
    """
    {
      "role": {
        "id": {{context.ProgramReader.value['role']['id']}},
        "type": "Role"
        },
      "person": {
        "id": {{context.risk_person['id']}},
        "type": "Person"
        },
      "context": {
        "id": {{context.private_program.value['program']['context']['id']}},
        "type": "Context"
        }
    }
    """
    And "role_assignment" is POSTed to its collection
    And the current user email "<user_email>"
    Then GET of "private_program" is allowed
    Then PUT of "private_program" is forbidden
    Then DELETE of "private_program" is forbidden

  Examples: User Emails
      | user_email               |
      | risk.manager@example.com |
      | risk.reader@example.com  |
      | risk.counsel@example.com |

  Scenario Outline: Governance Object permissions
    Given the current user email "risk.manager@example.com"
    And a new "<governance_type>" named "governance_object"
    And "governance_object" is POSTed to its collection
    Then GET of "governance_object" is allowed
    And PUT of "governance_object" is allowed
    And GET of "governance_object" is allowed
    And DELETE of "governance_object" is forbidden
    Given the current user email "risk.reader@example.com"
    Then GET of "governance_object" is allowed
    And PUT of "governance_object" is forbidden
    And DELETE of "governance_object" is forbidden
    Given the current user email "risk.counsel@example.com"
    Then GET of "governance_object" is allowed
    And PUT of "governance_object" is forbidden
    And DELETE of "governance_object" is forbidden

  Examples: Governance Objects
      | governance_type    |
      | Control            |
      | DirectiveControl   |
      | Contract           |
      | Policy             |
      | Regulation         |
      | Standard           |
      | Objective          |
      | ObjectiveControl   |
      | Section            |
      | SectionObjective   |

  Scenario Outline: Asset/Business Object permissions
    Given the current user email "risk.manager@example.com"
    And a new "<resource_type>" named "resource_object"
    And "resource_object" is POSTed to its collection
    Then GET of "resource_object" is allowed
    And PUT of "resource_object" is allowed
    And GET of "resource_object" is allowed
    And DELETE of "resource_object" is forbidden
    Given the current user email "risk.reader@example.com"
    Then GET of "resource_object" is allowed
    And PUT of "resource_object" is forbidden
    And DELETE of "resource_object" is forbidden
    Given the current user email "risk.counsel@example.com"
    Then GET of "resource_object" is allowed
    And PUT of "resource_object" is forbidden
    And DELETE of "resource_object" is forbidden

  Examples: Asset/Business Objects
      | resource_type      |
      | DataAsset          |
      | Document           |
      | Facility           |
      | Help               |
      | Market             |
      | Option             |
      | OrgGroup           |
      | Product            |
      | Project            |
      | System             |
      | Process            |

  Scenario: Person Object permissions
    Given Person object for email "nonrisk.reader@example.com" as "person"
    Given the current user email "risk.manager@example.com"
    Then GET of "person" is allowed
    And PUT of "person" is forbidden
    And DELETE of "person" is forbidden
    Given the current user email "risk.reader@example.com"
    Then GET of "person" is allowed
    And PUT of "person" is forbidden
    And DELETE of "person" is forbidden
    Given the current user email "risk.counsel@example.com"
    Then GET of "person" is allowed
    And PUT of "person" is forbidden
    And DELETE of "person" is forbidden

    @risk
  Scenario: Risk Assessment Object Permissions
    Given a new "ggrc_risk_assessments.models.Template" named "risk_template"
    And "risk_template" is POSTed to its collection
    And a new "ggrc_risk_assessments.models.RiskAssessment" named "risk_assessment"
    And "risk_assessment" link property "template" is "risk_template"
    And the current user email "risk.reader@example.com"
    Then POST of "risk_assessment" to its collection is forbidden
    Given the current user email "risk.manager@example.com"
    Then POST of "risk_assessment" to its collection is forbidden
    Given the current user email "risk.counsel@example.com"
    And "risk_assessment" is POSTed to its collection
    Then GET of "risk_assessment" is allowed
    And PUT of "risk_assessment" is allowed
    And GET of "risk_assessment" is allowed
    And DELETE of "risk_assessment" is forbidden
    Given the current user email "risk.manager@example.com"
    Then GET of "risk_assessment" is allowed
    And PUT of "risk_assessment" is allowed
    And GET of "risk_assessment" is allowed
    And DELETE of "risk_assessment" is forbidden
    Given the current user email "risk.reader@example.com"
    Then GET of "risk_assessment" is allowed
    And PUT of "risk_assessment" is forbidden
    And DELETE of "risk_assessment" is forbidden
    Given the current user email "nonrisk.reader@example.com"
    Then GET of "risk_assessment" is forbidden
    And PUT of "risk_assessment" is forbidden
    And DELETE of "risk_assessment" is forbidden
    Given the current user email "nonrisk.program.creator@example.com"
    Then GET of "risk_assessment" is forbidden
    And PUT of "risk_assessment" is forbidden
    And DELETE of "risk_assessment" is forbidden

  Scenario Outline: Threat and Vulnerability Object Permissions
    Given a new "ggrc_risk_assessments.models.<resource_type>" named "risk_object"
    And the current user email "risk.reader@example.com"
    Then POST of "risk_object" to its collection is forbidden
    Given the current user email "risk.counsel@example.com"
    Then POST of "risk_object" to its collection is forbidden
    Given the current user email "risk.manager@example.com"
    And a new "ggrc_risk_assessments.models.<resource_type>" named "risk_object"
    And "risk_object" is POSTed to its collection
    Then GET of "risk_object" is allowed
    And PUT of "risk_object" is allowed
    And GET of "risk_object" is allowed
    And DELETE of "risk_object" is forbidden
    Given the current user email "risk.counsel@example.com"
    Then GET of "risk_object" is allowed
    And PUT of "risk_object" is forbidden
    And DELETE of "risk_object" is forbidden
    Given the current user email "risk.reader@example.com"
    Then GET of "risk_object" is allowed
    And PUT of "risk_object" is forbidden
    And DELETE of "risk_object" is forbidden
    Given the current user email "nonrisk.reader@example.com"
    Then GET of "risk_object" is forbidden
    And PUT of "risk_object" is forbidden
    And DELETE of "risk_object" is forbidden
    Given the current user email "nonrisk.program.creator@example.com"
    Then GET of "risk_object" is forbidden
    And PUT of "risk_object" is forbidden
    And DELETE of "risk_object" is forbidden

  Examples: Types
      | resource_type |
      | Threat        |
      | Vulnerability |

  Scenario: Template Object Permissions
    Given a new "ggrc_risk_assessments.models.Template" named "risk_assessment"
    And the current user email "risk.reader@example.com"
    Then POST of "risk_assessment" to its collection is forbidden
    Given the current user email "risk.manager@example.com"
    Then POST of "risk_assessment" to its collection is forbidden
    Given the current user email "risk.counsel@example.com"
    Then POST of "risk_assessment" to its collection is forbidden
    Given the current user email "admin@example.com"
    And "risk_assessment" is POSTed to its collection
    Then GET of "risk_assessment" is allowed
    Given the current user email "risk.manager@example.com"
    Then GET of "risk_assessment" is forbidden
    And PUT of "risk_assessment" is forbidden
    And DELETE of "risk_assessment" is forbidden
    Given the current user email "risk.counsel@example.com"
    Then GET of "risk_assessment" is allowed
    And PUT of "risk_assessment" is forbidden
    And DELETE of "risk_assessment" is forbidden
    Given the current user email "risk.reader@example.com"
    Then GET of "risk_assessment" is forbidden
    And PUT of "risk_assessment" is forbidden
    And DELETE of "risk_assessment" is forbidden
    Given the current user email "nonrisk.reader@example.com"
    Then GET of "risk_assessment" is forbidden
    And PUT of "risk_assessment" is forbidden
    And DELETE of "risk_assessment" is forbidden
    Given the current user email "nonrisk.program.creator@example.com"
    Then GET of "risk_assessment" is forbidden
    And PUT of "risk_assessment" is forbidden
    And DELETE of "risk_assessment" is forbidden

