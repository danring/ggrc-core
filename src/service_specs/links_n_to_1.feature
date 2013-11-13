# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: brad@reciprocitylabs.com
# Maintained By: brad@reciprocitylabs.com

Feature: Many resources have links to other resources. This feature will
  exercise the cases where the linking is n to 1, such as in a child to parent
  relationship.

  Background:
    Given service description

  Scenario Outline:
    Given a new "<parent_type>" named "parent"
    And "parent" is POSTed to its collection
    And a new "<child_type>" named "child"
    And "child" link property "<parent_property>" is "parent"
    And "child" is POSTed to its collection
    When GET of the resource "parent"
    And GET of the resource "child"
    Then the "<parent_property>" of "child" is a link to "parent"
    And "child" is in the links property "<children_property>" of "parent" 

  Examples: n-ary Link Resources
    | parent_type       | child_type        | parent_property           | children_property                |
    #| Program           | Audit             | program                   | audits                           |
    #| Response          | Meeting           | response                  | meetings                         |
    #| Document          | PopulationSample  | population_document       | population_worksheets_documented |
    #| Document          | PopulationSample  | sample_worksheet_document | sample_worksheets_documented     |
    #| Document          | PopulationSample  | sample_evidence_document  | sample_evidences_documented      |
    #| Request           | Response          | request                   | responses                        |
    | Regulation        | Section           | directive                 | sections                         |
    | Standard          | Section           | directive                 | sections                         |

  #Scenario Outline:
    #Given a new "<parent_type>" named "parent"
    #And "parent" is POSTed to its collection
    #And a new "<child_type>" named "child"
    #And "child" link property "<parent_property>" is "parent"
    #And "child" is POSTed to its collection
    #When GET of the resource "parent"
    #And GET of the resource "child"
    #Then the "<parent_property>" of "child" is a link to "parent"
    #And the "<child_property>" of "parent" is a link to "child"

  #Examples: 1-to-1 Link Resources
    #| parent_type | child_type        | parent_property | child_property      |
    #| Response    | PopulationSample  | response        | population_sample   |
