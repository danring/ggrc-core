# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: brad@reciprocitylabs.com
# Maintained By: brad@reciprocitylabs.com

Feature: Some object types can have an owner as recorded in an ObjectOwner
  resource. A role, such as ObjectEditor, might grant priveleges like delete
  to the owners ownly.

  Background:
    Given service description
    And User "owning.user@example.com" has "ObjectEditor" role
    And User "non.owning.user@example.com" has "ObjectEditor" role
    And User link object for "owning.user@example.com" as "owning_user"
    And User link object for "non.owning.user@example.com" as "non_owning_user"

  Scenario Outline: The object owner can update and delete the resource, but other users cannot.
    Given the current user
       """
       { "email": "owning.user@example.com" }
       """
    Given a new "<type>" named "owned_resource"
    And "owning_user" is added to links property "owners" of "owned_resource"
    And "owned_resource" is POSTed to its collection
    When GET of the resource "owned_resource"
    Then "owning_user" is in the links property "owners" of "owned_resource"
    Given the current user
      """
      { "email": "non.owning.user@example.com" }
      """
    When GET of the resource "owned_resource"
    Then PUT of "owned_resource" is forbidden
    When GET of the resource "owned_resource"
    Then DELETE of "owned_resource" is forbidden
    Given the current user
       """
       { "email": "owning.user@example.com" }
       """
    When GET of the resource "owned_resource"
    Then PUT of "owned_resource" is allowed
    When GET of the resource "owned_resource"
    Then DELETE of "owned_resource" is allowed

    Examples:
      | type       |
      | Category   |
      | Contract   |
      | Control    |
      | DataAsset  |
      | Document   |
      | Facility   |
      | Help       |
      | Market     |
      | Objective  |
      | Option     |
      | OrgGroup   |
      | Policy     |
      | Process    |
      | Product    |
      | Project    |
      | Regulation |
      | Section    |
      | System     |
