/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: andy@reciprocitylabs.com
    Maintained By: andy@reciprocitylabs.com
*/

describe("Permission", function() {
      // Models helpers
  var models = ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem", "Person", "Program", "Role"]
    , base_instances = {}
    , create_models = models.slice(0).filter(function(model) { return !model.match(/^(Cycle|Category|SystemSystem|SystemControl|Categorization|PopulationSample|Categorization|RelationshipType|Directive|SystemOrProcess|Option)$/) })
    , read_models = models.slice(0).filter(function(model) { return !model.match(/^(Cycle)$/) })
    , update_models = create_models.slice(0)
    , delete_models = create_models.slice(0)
    , roles = {
          System: {
              Admin: {"__GGRC_ADMIN__": ["__GGRC_ALL__"]}
            , RoleReader: {"read": ["Role"], "create": [], "update": [], "delete": []}
            , Reader: {"read": ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem", "Person", "Program", "Role"]}
            , ObjectEditor: {"read": ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem", "Person", "Program", "Role"], "create": ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem", "Person"], "update": ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem", "Person"], "delete": ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem"]}
            , ProgramCreator: {"create": ["Program"]}
          }
        , PrivateProgram: {
              ProgramOwner: {"read": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship", "UserRole"], "create": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship", "UserRole"], "update": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship", "UserRole"], "delete": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship", "UserRole"]}
            , ProgramEditor: {"read": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship"], "create": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship"], "update": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship"], "delete": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "ProgramControl", "ProgramDirective", "Relationship"]}
            , ProgramReader: {"read": ["Cycle", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Program", "ProgramControl", "ProgramDirective", "Relationship"], "create": [], "update": [], "delete": []}  
          }
      }
    , role_can = function(role, action, model) {
        return !!role.__GGRC_ADMIN__ || (role[action] && role[action].indexOf(model) > -1);
      }

      // Permissions helpers
    , current_permissions
    , last_permissions
    , make_permissions = function(permissions) {
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
      }
    , set_permissions = function(permissions) {
        var result = {},
          lookup = function(role) {
            for (var type in roles) {
              if (type === role) return roles[type];
              else {
                for (var type2 in roles[type]) {
                  if (type2 === role) return roles[type][type2];
                }
              }
            }
          };
        last_permissions = current_permissions;
        current_permissions = permissions;
        user = {
            email: "user_permission@example.com"
          , name: "Test User"
          , permissions: make_permissions(typeof permissions === 'string' ? lookup(permissions) : permissions)
        };

        $.ajax("/login", {
          beforeSend: function(xhr) {
            xhr.setRequestHeader('X-ggrc-user', JSON.stringify(user));
          }
        }).pipe(function(response) {
          // Parse permissions from the HTML response
          return result.permissions = GGRC.permissions = JSON.parse(response.match(/GGRC\.permissions.+/)[0].replace(/^GGRC.permissions\s*=\s*(.+?);$/, '$1'));
        });

        return function() {
          result.permissions && reset();
          return !!result.permissions;
        };
      }
    , reset_permissions = function() {
        return set_permissions(last_permissions);
      }
    , make_model = function(model, deferred, attrs) {
        deferred = deferred || new $.Deferred();
        var Model = CMS.Models[model];
        if (Model) {
          attrs = can.extend({ context: null }, attrs || {});
          attrs.name = attrs.title = "permission_" + Date.now() + (++unique_id);
          if (new Model() instanceof can.Model.Join) {
            // Use the admin to create temporary objects used in joins
            runs(function() {
              waitsFor(set_permissions("Admin"));
            });

            runs(function() {
              var def = new $.Deferred();

              // Create temporary objects
              if (model === 'ObjectSection') {
                waitsFor(make_model('Section', def));
                runs(function() {
                  def.done(function(section) {
                    var save = jasmine.createSpy();
                    attrs.section = section;
                    attrs.section.save(save);
                    attrs.sectionable = attrs.section.directive;
                    waitsFor(function() {
                      return save.callCount;
                    });
                  });
                });
              }
              else {
                can.each(Model.join_keys, function(join, key) {
                  var def = new $.Deferred();
                  if (join === CMS.Models.Directive) {
                    waitsFor(make_model('Regulation', def));
                    runs(function() {
                      def.done(function(regulation) {
                        attrs[key] = regulation;
                      });
                    });
                  }
                  else if (join === can.Model.Cacheable) {
                    waitsFor(make_model('Control', def));
                    runs(function() {
                      def.done(function(control) {
                        attrs[key] = control;
                      });
                    });
                  }
                  else {
                    waitsFor(make_model(join.shortName, def));
                    runs(function() {
                      def.done(function(inst) {
                        attrs[key] = inst;
                      });
                    });
                  }
                  runs(function() {
                    var save = jasmine.createSpy();
                    attrs[key].save(save);
                    waitsFor(function() {
                      return save.callCount;
                    });
                  });
                });
              }

              runs(function() {
                waitsFor(reset_permissions());
              });
            });
          }
          else if (model === "Section") {
            // Use the admin to create temporary objects used in joins
            runs(function() {
              waitsFor(set_permissions("Admin"));
            });

            runs(function() {
              var def = new $.Deferred();
              waitsFor(make_model('Regulation', def));
              runs(function() {
                def.done(function(regulation) {
                  // Create temporary objects
                  var save = jasmine.createSpy();
                  attrs.directive = regulation;
                  attrs.directive.save(save);
                  waitsFor(function() {
                    return save.callCount;
                  });
                });
              });

              runs(function() {
                waitsFor(reset_permissions());
              });
            });
          }
          else if (model === "Person") {
            attrs.email = "user_permission_" + Date.now() + (++unique_id) + "@example.com";
          }
          else if (model === "Role") {
            attrs.name = "user_permission_" + Date.now() + (++unique_id);
          }

          runs(function() {
            var instance = new Model(attrs);
            created.push(instance);
            reset();
            deferred.resolve(instance);
          });

          return function() {
            return deferred.state() === "resolved";
          };
        }
      }

      // Test helpers
    , reset = function() {
        // Make everything synchronous
        $.ajaxSetup({
            async: true
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
      }
    , success
    , error
    , success_or_error = function() {
        return success.callCount || error.callCount;
      }
    , response
    , created
    , unique_id
    , before_first = true
    , after_last = true
    ; 

  beforeEach(function() {
    // FIXME for efficiency?
    // Create child objects for joins
    // // Create a test object for each type
    // if (before_first) {
    //   var created = 0;
    //   // waitsFor(set_permissions("Admin"));

    //   runs(function() {
    //     // Create non-joins first
    //     create_models.filter(function(model) {
    //       return !(new CMS.Models[model]() instanceof can.Model.Join);
    //     }).forEach(function(model) {

    //     });
    //   });
    // }

    unique_id || (unique_id = 1);
    created = [];
  });
  
  // Remove every new object that was saved on teardown
  afterEach(function() {
    waitsFor(set_permissions("Admin"));
    runs(function() {
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
  });

  // Verify CRUD abilities for each role
  describe("System Roles", function() {
    for (var role in roles.System) {
      !function(role) {
        describe(role, function() {
          beforeEach(function() {
            waitsFor(set_permissions(role));
          });

          describe("create", function() {
            create_models.forEach(function(model) {
              it((role_can(roles.System[role], "create", model) ? "can" : "can't") + " create " + model, function() {
                runs(function() {
                  if (CMS.Models[model]) {
                    var def;
                    waitsFor(make_model(model, def = new $.Deferred()));
                    runs(function() {
                      def.done(function(instance) {
                        reset();
                        instance.save(success, error);
                        waitsFor(success_or_error);
                      });
                    })
                    runs(function() {
                      expect(role_can(roles.System[role], "create", model) ? success : error).toHaveBeenCalled();
                    });
                  }
                });
              });
            });
          });

          describe("read", function() {
            read_models.forEach(function(model) {
              it((role_can(roles.System[role], "read", model) ? "can" : "can't") + " read " + model, function() {
                runs(function() {
                  if (CMS.Models[model] && CMS.Models[model].findAll) {
                    var list;
                    CMS.Models[model].findAll({ __stubs_only: true }).done(function() {
                      list = arguments[0];
                    });

                    waitsFor(function() {
                      return list;
                    });

                    runs(function() {
                      if (role_can(roles.System[role], "read", model))
                        expect(list.length).toBeGreaterThan(0);
                      else
                        expect(list.length).toEqual(0);
                    });
                  }
                });
              });
            });
          });

          describe("update", function() {
            update_models.forEach(function(model) {
              it((role_can(roles.System[role], "update", model) ? "can" : "can't") + " update " + model, function() {
                runs(function() {
                  if (CMS.Models[model]) {
                    var instance;

                    // Create as an admin first
                    waitsFor(set_permissions("Admin"));
                    runs(function() {
                      var def = new $.Deferred();
                      waitsFor(make_model(model, def));
                      runs(function() {
                        def.done(function(inst) {
                          instance = inst;
                          reset();
                          instance.save(success, error);
                          waitsFor(success_or_error);
                          runs(function() {
                            expect(success).toHaveBeenCalled();
                          });
                        })
                      });
                    });

                    // Try to update
                    runs(function() {
                      waitsFor(set_permissions(role));
                      runs(function() {
                        reset();
                        instance.save(success, error);
                        waitsFor(success_or_error);
                        runs(function() {
                          expect(role_can(roles.System[role], "update", model) ? success : error).toHaveBeenCalled();
                        });
                      });
                    });
                  }
                });
              });
            });
          });

          describe("delete", function() {
            delete_models.forEach(function(model) {
              it((role_can(roles.System[role], "delete", model) ? "can" : "can't") + " delete " + model, function() {
                runs(function() {
                  if (CMS.Models[model]) {
                    var instance;

                    // Create as an admin first
                    waitsFor(set_permissions("Admin"));
                    runs(function() {
                      var def = new $.Deferred();
                      waitsFor(make_model(model, def));
                      runs(function() {
                        def.done(function(inst) {
                          instance = inst;
                          reset();
                          instance.save(success, error);
                          waitsFor(success_or_error);
                          runs(function() {
                            expect(success).toHaveBeenCalled();
                          });
                        })
                      });
                    });

                    // Try to update
                    runs(function() {
                      waitsFor(set_permissions(role));
                      runs(function() {
                        reset();
                        instance.save(success, error);
                        waitsFor(success_or_error);
                        runs(function() {
                          expect(role_can(roles.System[role], "delete", model) ? success : error).toHaveBeenCalled();
                        });
                      });
                    });
                  }
                });
              });
            });
          });
        });
      }(role);
    }
  });
});
