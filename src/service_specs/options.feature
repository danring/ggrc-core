# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: brad@reciprocitylabs.com
# Maintained By: brad@reciprocitylabs.com

Feature: Options relationships

  Background:
    Given service description

  Scenario Outline:
    Given an Option named "option" with role "<role>"
    And "option" is POSTed to its collection
    And a new "<resource_type>" named "resource"
    And "resource" link property "<link_property>" is "option"
    And "resource" is POSTed to its collection
    When GET of the resource "resource"
    Then the "<link_property>" of "resource" is a link to "option"

  Examples:
      | role             | resource_type | link_property    |
      | control_kind     | Control       | kind             |
      | control_means    | Control       | means            |
      | verify_frequency | Control       | verify_frequency |
      | audit_frequency  | Regulation    | audit_frequency  |
      | audit_duration   | Regulation    | audit_duration   |
      | reference_type   | Document      | kind             |
      | document_year    | Document      | year             |
      | language         | Document      | language         |
      | person_language  | Person        | language         |
      | product_type     | Product       | kind             |
      | network_zone     | System        | network_zone     |

  Scenario: Validation of invalid option role
    Given an Option named "option" with role "verify_frequency"
    And "option" is POSTed to its collection
    And a new "Control" named "resource"
    And "resource" link property "means" is "option"
    Then POST of "resource" fails with "Invalid value for attribute"
