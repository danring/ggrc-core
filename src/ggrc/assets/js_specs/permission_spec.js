/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

describe("Permission", function() {
  var make_permissions
    , set_permissions
    , reset_permissions
    , current_permissions
    , last_permissions
    , make_model
      // All models except Cycle, since that is unsupported
    , models = ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem", "Person", "Program", "Role"]
    , create_models = models.slice(0).filter(function(model) { return !model.match(/^(Cycle|Category|SystemSystem|SystemControl|Categorization|PopulationSample|Categorization|RelationshipType|Directive|SystemOrProcess|Option)$/) })
    , read_models = models.slice(0).filter(function(model) { return !model.match(/^(Cycle)$/) })
    , update_models = create_models.slice(0)
    , delete_models = create_models.slice(0)
    , roles = {
          Admin: {"__GGRC_ADMIN__": ["__GGRC_ALL__"]}
        , PrivateProgram: {
              ProgramOwner: {"read": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship", "UserRole"], "create": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship", "UserRole"], "update": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship", "UserRole"], "delete": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship", "UserRole"]}
            , ProgramEditor: {"read": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship"], "create": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship"], "update": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship"], "delete": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "ProgramControl", "ProgramDirective", "Relationship"]}
            , ProgramReader: {"read": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship"], "create": [], "update": [], "delete": []}  
          }
        , System: {
              RoleReader: {"read": ["Role"], "create": [], "update": [], "delete": []}
            , Reader: {"read": ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem", "Person", "Program", "Role"]}
            , ObjectEditor: {"read": ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem", "Person", "Program", "Role"], "create": ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem", "Person"], "update": ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem", "Person"], "delete": ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem"]}
            , ProgramCreator: {"create": ["Program"]}
          }
      }
    , role_can = function(role, action, model) {
        return role[action] && role[action].indexOf(model) > -1;
      }
    , success
    , error
    , reset
    , response
    , created
    , unique_id
    ; 

  beforeEach(function() {
    jasmine.Clock.useMock();
    unique_id || (unique_id = 1);
    created = [];

    reset || (reset = function() {
      // Make everything synchronous
      $.ajaxSetup({
          async: false
        , success: function() {
            response = arguments[0];
          }
        , error: function() {
            response = arguments[0];
          }
      });
      spyOn($.ajaxSettings, "success").andCallThrough();
      spyOn($.ajaxSettings, "error").andCallThrough();
      success = $.ajaxSettings.success;
      error = $.ajaxSettings.error;
    });

    // Creates a model instance
    make_model || (make_model = function(model, attrs) {
      var Model = CMS.Models[model];
      if (Model) {
        attrs = can.extend({ context: null }, attrs || {});
        attrs.name = attrs.title = "permission_" + Date.now() + (++unique_id);
        if (new Model() instanceof can.Model.Join) {
          // Use the admin to create temporary objects used in joins
          set_permissions("Admin");

          // Create temporary objects
          if (model === 'ObjectSection') {
            attrs.section = make_model('Section');
            attrs.section.save();
            attrs.sectionable = attrs.section.directive;
          }
          else {
            can.each(Model.join_keys, function(join, key) {
              if (join === CMS.Models.Directive)
                attrs[key] = make_model('Regulation');
              else if (join === can.Model.Cacheable)
                attrs[key] = make_model('Control');
              else
                attrs[key] = make_model(join.shortName);
              attrs[key].save();
            });
          }

          reset_permissions();
        }
        else if (model === "Section") {
          // Use the admin to create temporary objects used in joins
          set_permissions("Admin");

          // Create temporary objects
          attrs.directive = make_model('Regulation');
          attrs.directive.save();

          reset_permissions();
        }
        else if (model === "Person") {
          attrs.email = "user_permission_" + Date.now() + (++unique_id) + "@example.com";
        }
        else if (model === "Role") {
          attrs.name = "user_permission_" + Date.now() + (++unique_id);
        }
        var instance = new Model(attrs);
        created.push(instance);
        return instance;
      }
    });

    // Formats a role/context into a permissions-compatible object
    make_permissions || (make_permissions = function(permissions) {
      var result = {};
      for (var action in permissions) {
        // Context ID w/CRUD
        if (action == parseInt(action,10)) {
          !function(context, permissions) {
            for (var action in permissions) {
              result[action] = result[action] || {};
              can.each(permissions[action], function(model) {
                result[action][model] = result[action][model] || [];
                result[action][model].indexOf(context) === -1 && result[action][model].push(context);
              });
            }
          }(parseInt(action,10), permissions[action]);
        }
        // CRUD
        else {
          result[action] = result[action] || {};
          can.each(permissions[action], function(model) {
            result[action][model] = result[action][model] || [];
            result[action][model].indexOf(null) === -1 && result[action][model].push(null);
          });
        }
      }
      return result;
    });

    // Sets a user with the given permissions on the backend
    set_permissions || (set_permissions = function(permissions) {
      last_permissions = current_permissions;
      current_permissions = permissions;
      user = {
          email: "user_permission@example.com"
        , name: "Test User"
        , permissions: make_permissions(typeof permissions === 'string' ? roles[permissions] : permissions)
      };


      return $.ajax("/login", {
        beforeSend: function(xhr) {
          xhr.setRequestHeader('X-ggrc-user', JSON.stringify(user));
        }
      }).pipe(function(response) {
        // Ensure that the next request waits until permissions are safe server-side
        // !jasmine.Clock.isInstalled() && jasmine.Clock.useMock();
        // jasmine.Clock.tick(100);
        // Parse permissions from the HTML response
        return GGRC.permissions = JSON.parse(response.match(/GGRC\.permissions.+/)[0].replace(/^GGRC.permissions\s*=\s*(.+?);$/, '$1'));
      });
    });

    reset_permissions || (reset_permissions = function() {
      set_permissions(last_permissions);
    });
  });
  
  // Remove every new object that was saved on teardown
  afterEach(function() {
    set_permissions("Admin");

    // Remove joins first
    created.sort(function(a, b) {
      if (a instanceof can.Model.Join && !(b instanceof can.Model.Join)) return -1;
      else if (!(a instanceof can.Model.Join) && b instanceof can.Model.Join) return 1;
      return 0;
    });

    can.each(created, function(instance) {
      instance.id && instance.destroy();
    });
  });

  // Verify CRUD abilities for each role
  describe("System Roles", function() {
    for (var role in roles.System) {
      !function(role) {
        describe(role, function() {
          beforeEach(function() {
            set_permissions(role).done(function() {console.log(arguments)});
            reset();
          });

          describe("create", function() {
            create_models.forEach(function(model) {
              it((role_can(roles.System[role], "create", model) ? "can" : "can't") + " create " + model, function() {
                if (CMS.Models[model]) {
                  make_model(model).save(success, error);
                  expect(role_can(roles.System[role], "create", model) ? success : error).toHaveBeenCalled();
                }
              });
            });
          });

          describe("read", function() {
            read_models.forEach(function(model) {
              it((role_can(roles.System[role], "read", model) ? "can" : "can't") + " read " + model, function() {
                if (CMS.Models[model] && CMS.Models[model].findAll) {
                  CMS.Models[model].findAll({ __stubs_only: true }).done(function(list) {
                    if (role_can(roles.System[role], "read", model))
                      expect(list.length).toBeGreaterThan(0);
                    else
                      expect(list.length).toEqual(0);
                  });
                }
              });
            });
          });

          describe("update", function() {
            update_models.forEach(function(model) {
              it((role_can(roles.System[role], "update", model) ? "can" : "can't") + " update " + model, function() {
                if (CMS.Models[model]) {
                  // Create as an admin first
                  set_permissions("Admin");
                  reset();
                  var instance = make_model(model);
                  instance.save(success, error);
                  expect(success).toHaveBeenCalled();

                  // Try to update
                  set_permissions(role);
                  reset();
                  instance.save(success, error);
                  expect(role_can(roles.System[role], "update", model) ? success : error).toHaveBeenCalled();
                }
              });
            });
          });

          describe("delete", function() {
            delete_models.forEach(function(model) {
              it((role_can(roles.System[role], "delete", model) ? "can" : "can't") + " delete " + model, function() {
                if (CMS.Models[model]) {
                  // Create as an admin first
                  set_permissions("Admin");
                  reset();
                  var instance = make_model(model);
                  instance.save(success, error);
                  expect(success).toHaveBeenCalled();

                  // Try to delete
                  set_permissions(role);
                  reset();
                  instance.destroy(success, error);
                  expect(role_can(roles.System[role], "delete", model) ? success : error).toHaveBeenCalled();
                }
              });
            });
          });
        });
      }(role);
    }
  });
});
