/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: andy@reciprocitylabs.com
    Maintained By: andy@reciprocitylabs.com
*/

// IMPORTANT: Never run more than one instance of this script simultaneously!

describe("Permission", function() {
      // Models helpers
  var Helpers
    , ObjectFactory
    , Permission
    , login
    , login_with_roles
    , logout
    , load
    , unload
    , make
    , make_with_admin
    , debug = false
    , models = ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem", "Person", "Program", "Role"]
    , base_instances = {}
    , create_models = models.slice(0).filter(function(model) { return !model.match(/^(Cycle|Category|SystemSystem|SystemControl|Categorization|PopulationSample|Categorization|RelationshipType|Directive|SystemOrProcess|Option)$/) })
    , read_models = models.slice(0).filter(function(model) { return !model.match(/^(Cycle)$/) })
    , update_models = create_models.slice(0)
    , delete_models = create_models.slice(0)
      // FIXME: Retrieve directly from /api/roles
    , roles = {
          System: {
              Admin: {"__GGRC_ADMIN__": { "__GGRC_ALL__": [0] }}
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
      // It isn't actually possible to map a context-specific ObjectSection
    , private_program_models = roles.PrivateProgram.ProgramOwner.create.slice(0).filter(function(model) { return !model.match(/^(Cycle|ObjectSection)$/) })
    , role_can = function(role, action, model) {
        return !!role.__GGRC_ADMIN__ || (role[action] && role[action].indexOf(model) > -1);
      }
    , make_model = function(model, deferred, attrs, context) {
        deferred = deferred || new $.Deferred();
        var Model = CMS.Models[model];
        if (Model) {
          attrs = can.extend({ context: { id: null } }, attrs);
          if (!(new Model() instanceof can.Model.Join)) {
            attrs.name = attrs.title = "permission_" + Date.now() + (++unique_id);
          }

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
                var keyed = false;
                can.each(Model.join_keys, function(join, key) {
                  if (!attrs[key]) {
                    // Using the same value for both keys will result in duplicate entry errors during similar tests
                    if (context && !keyed && (join === can.Model.Cacheable || join === context.constructor)) {
                      keyed = true;
                      attrs[key] = context;
                    }
                    else {
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
                    }
                  }
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
            attrs.email = "user_permission_" + Date.now() + "-" + (++unique_id) + "@example.com";
            attrs.name = "user_permission_" + Date.now() + "-" + (unique_id);
          }
          else if (model === "Role") {
            attrs.name = "user_permission_" + Date.now() + "-" + (++unique_id);
          }

          runs(function() {
            // Check for context
            if (context && context.context) {
              attrs.context = context.context;
            }

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
    , last
    , after_last = false
    ; 

  beforeEach(function() {
    Helpers = jasmine.GGRC.Helpers;
    ObjectFactory = Helpers.ObjectFactory;
    Permission = Helpers.Permission;
    load = Helpers.load;
    unload = Helpers.unload;
    login = Permission.login;
    login_with_roles = Permission.login_with_roles;
    logout = Permission.logout;
    make = ObjectFactory.make;
    make_with_admin = ObjectFactory.make_with_admin;
    waitsFor(Permission.init());
  });

  afterEach(function() {
    waitsFor(ObjectFactory.destroy());
  });

  // beforeEach(function() {
  //   if (before_first) {
  //     before_first = false;
  //     after_last = $.debounce(5000, function() {
  //       $.ajaxSetup({ async: false });
  //       set_permissions("Admin");

  //       // Remove joins first
  //       created.sort(function(a, b) {
  //         if (a instanceof can.Model.Join && !(b instanceof can.Model.Join)) return -1;
  //         else if (!(a instanceof can.Model.Join) && b instanceof can.Model.Join) return 1;
  //         return 0;
  //       });

  //       can.each(created, function(instance) {
  //         instance.id && instance.destroy();
  //       });

  //       // Reset as base admin user
  //       set_permissions({ "email" : "user@example.com", "name" : "Test User" });
  //     });
  //   }

  //   unique_id || (unique_id = 1);
  //   created = [];
  // });
  
  // Remove every new object that was saved on teardown
  // afterEach(function() {
  //   after_last();
  // });

  // Verify CRUD abilities for each role
  describe("System roles", function() {
    var scope = "System";
    for (var role in roles[scope]) {
      !function(role) {
        describe(role, function() {
          // Login before each test
          beforeEach(function() {
            waitsFor(set_permissions(role));
          });

          describe("create", function() {
            create_models.forEach(function(model) {
              it((role_can(roles[scope][role], "create", model) ? "can" : "can't") + " create " + model, function() {
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
                      expect(role_can(roles[scope][role], "create", model) ? success : error).toHaveBeenCalled();
                    });
                  }
                });
              });
            });
          });

          describe("read", function() {
            read_models.forEach(function(model) {
              it((role_can(roles[scope][role], "read", model) ? "can" : "can't") + " read " + model, function() {
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
                      if (role_can(roles[scope][role], "read", model))
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
              it((role_can(roles[scope][role], "update", model) ? "can" : "can't") + " update " + model, function() {
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
                          expect(role_can(roles[scope][role], "update", model) ? success : error).toHaveBeenCalled();
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
              it((role_can(roles[scope][role], "delete", model) ? "can" : "can't") + " delete " + model, function() {
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

                    // Try to delete
                    runs(function() {
                      waitsFor(set_permissions(role));
                      runs(function() {
                        reset();
                        instance.destroy(success, error);
                        waitsFor(success_or_error);
                        runs(function() {
                          expect(role_can(roles[scope][role], "delete", model) ? success : error).toHaveBeenCalled();
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
  
  describe("Private Program roles", function() {
    var scope = "PrivateProgram";
    for (var role in roles[scope]) {
      !function(role) {
        var program
          , permissions = {}
          ;

        describe(role, function() {
          // Login before each test
          beforeEach(function() {
            if (!program) {
              var def = new $.Deferred();
              waitsFor(set_permissions("Admin"));
              runs(function() {
                waitsFor(make_model("Program", def, { "private": true }));
                runs(function() {
                  def.done(function(instance) {
                    reset();
                    instance.save(success, error);
                    waitsFor(success_or_error);
                    program = instance;
                  });
                });
              });
            }

            runs(function() {
              permissions[program.context.id] = lookup_permissions(role);
              waitsFor(set_permissions(permissions));
            });
          });

          describe("create", function() {
            private_program_models.forEach(function(model) {
              it((role_can(roles[scope][role], "create", model) ? "can" : "can't") + " create " + model, function() {
                runs(function() {
                  if (CMS.Models[model]) {
                    var def;
                    waitsFor(make_model(model, def = new $.Deferred(), null, program));
                    runs(function() {
                      def.done(function(instance) {
                        reset();
                        instance.save(success, error);
                        waitsFor(success_or_error);
                      });
                    })
                    runs(function() {
                      expect(role_can(roles[scope][role], "create", model) ? success : error).toHaveBeenCalled();
                    });
                  }
                });
              });
            });
          });

          describe("read", function() {
            private_program_models.forEach(function(model) {
              it((role_can(roles[scope][role], "read", model) ? "can" : "can't") + " read " + model, function() {
                runs(function() {
                  if (CMS.Models[model] && CMS.Models[model].findAll) {
                    var instance;

                    if (model !== "Program") {
                      // Create as an admin first
                      waitsFor(set_permissions("Admin"));
                      runs(function() {
                        var def = new $.Deferred();
                        waitsFor(make_model(model, def, null, program));
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
                    }

                    // Try to update
                    runs(function() {
                      waitsFor(set_permissions(permissions));
                      runs(function() {
                        reset();

                        var list;
                        if (model === "Program") {
                        // console.log('here', CMS.Models[model].findOne)
                          CMS.Models[model].findOne({ id: program.id }).done(function() {
                            list = arguments[0] && [arguments[0]];
                          });
                        }
                        else {
                          CMS.Models[model].findAll({ __stubs_only: true, context_id: program.context.id }).done(function() {
                            list = arguments[0];
                          });
                        }

                        waitsFor(function() {
                          return list;
                        });

                        runs(function() {
                          if (role_can(roles[scope][role], "read", model))
                            expect(list.length).toBeGreaterThan(0);
                          else
                            expect(list.length).toEqual(0);
                        });
                      });
                    });
                  }
                });
              });
            });
          });

          describe("update", function() {
            private_program_models.forEach(function(model) {
              it((role_can(roles[scope][role], "update", model) ? "can" : "can't") + " update " + model, function() {
                runs(function() {
                  if (CMS.Models[model]) {
                    var instance;

                    // Create as an admin first
                    waitsFor(set_permissions("Admin"));
                    runs(function() {
                      var def = new $.Deferred();
                      waitsFor(make_model(model, def, null, program));
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
                      waitsFor(set_permissions(permissions));
                      runs(function() {
                        reset();
                        instance.save(success, error);
                        waitsFor(success_or_error);
                        runs(function() {
                          expect(role_can(roles[scope][role], "update", model) ? success : error).toHaveBeenCalled();
                        });
                      });
                    });
                  }
                });
              });
            });
          });

          describe("delete", function() {
            private_program_models.forEach(function(model) {
              it((role_can(roles[scope][role], "delete", model) ? "can" : "can't") + " delete " + model, function() {
                runs(function() {
                  if (CMS.Models[model]) {
                    var instance;

                    // Create as an admin first
                    waitsFor(set_permissions("Admin"));
                    runs(function() {
                      var def = new $.Deferred();
                      waitsFor(make_model(model, def, null, program));
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

                    // Try to delete
                    runs(function() {
                      waitsFor(set_permissions(permissions));
                      runs(function() {
                        reset();
                        instance.destroy(success, error);
                        waitsFor(success_or_error);
                        runs(function() {
                          expect(role_can(roles[scope][role], "delete", model) ? success : error).toHaveBeenCalled();
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

  describe("Private Program UI", function() {
    var program
      , page
      , objects = [
          "Regulation"
        , "Contract"
        , "Policy"
        , "Objective"
        , "Control"
        , "System"
        , "Process"
        , "DataAsset"
        , "Product"
        , "Project"
        , "Facility"
        , "Market"
        , "OrgGroup"
        , "Person"
        , "Document"
        // , "Audit"
        ]
      ;

    beforeEach(function() {
      waitsFor(make_with_admin("Program", { "private": true }).done(function(instance) {
        program = instance;
      }));
    });

    afterEach(function() {
      program = undefined;
      page = undefined;
      unload();
    });

    describe("ProgramOwner", function() {
      it("can map objects", function() {
        waitsFor(login_with_roles(['Reader'], [program.context, 'ProgramOwner']));
        runs(function() {
          waitsFor(page = load('/programs/' + program.id));
        });
        runs(function() {
          page.done(function($) {
            objects.forEach(function(obj) {
              var selector = '#'+CMS.Models[obj].table_singular+'_widget'
                , go = false
                ;
              waitsFor(function() {
                if ($(selector + ' .cms_controllers_tree_view').length) {
                  setTimeout(function() { go = true }, 0);
                }
                return go;
              });
              runs(function() {
                expect($(selector + ' [data-toggle="multitype-modal-selector"][data-join-option-type="'+obj+'"], '
                  + selector + ' [data-toggle="modal-ajax-form"][data-object-singular="'+obj+'"]').length).toBeGreaterThan(0);
              });
            });
          });
        });
      });
    });

    describe("ProgramEditor", function() {
      it("can map objects", function() {
        waitsFor(login_with_roles(['Reader'], [program.context, 'ProgramEditor']));
        runs(function() {
          waitsFor(page = load('/programs/' + program.id));
        });
        runs(function() {
          page.done(function($) {
            objects.forEach(function(obj) {
              var selector = '#'+CMS.Models[obj].table_singular+'_widget'
                , go = false
                ;
              waitsFor(function() {
                if ($(selector + ' .cms_controllers_tree_view').length) {
                  setTimeout(function() { go = true }, 0);
                }
                return go;
              })
              runs(function() {
                expect($(selector + ' [data-toggle="multitype-modal-selector"][data-join-option-type="'+obj+'"], '
                  + selector + ' [data-toggle="modal-ajax-form"][data-object-singular="'+obj+'"]').length).toBeGreaterThan(0);
              });
            });
          });
        });
      });
    });
    
    describe("ProgramReader", function() {
      it("can't map objects", function() {
        waitsFor(login_with_roles(['Reader'], [program.context, 'ProgramReader']));
        runs(function() {
          waitsFor(page = load('/programs/' + program.id));
        });
        runs(function() {
          page.done(function($) {
            objects.forEach(function(obj) {
              var selector = '#'+CMS.Models[obj].table_singular+'_widget'
                , go = false
                ;
              waitsFor(function() {
                if ($(selector + ' .cms_controllers_tree_view').length) {
                  setTimeout(function() { go = true }, 0);
                }
                return go;
              })
              runs(function() {
                expect($(selector + ' [data-toggle="multitype-modal-selector"][data-join-option-type="'+obj+'"], '
                  + selector + ' [data-toggle="modal-ajax-form"][data-object-singular="'+obj+'"]').length).toEqual(0);
              });
            });
          });
        });
      });
    });
  });

});
