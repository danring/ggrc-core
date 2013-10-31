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
    , success_or_error
    , models = ["Categorization", "Category", "Control", "ControlControl", "ControlSection", "Cycle", "DataAsset", "Directive", "Contract", "Policy", "Regulation", "DirectiveControl", "Document", "Facility", "Help", "Market", "Objective", "ObjectiveControl", "ObjectControl", "ObjectDocument", "ObjectObjective", "ObjectPerson", "ObjectSection", "Option", "OrgGroup", "PopulationSample", "Product", "ProgramControl", "ProgramDirective", "Project", "Relationship", "RelationshipType", "Section", "SectionObjective", "SystemOrProcess", "System", "Process", "SystemControl", "SystemSystem", "Person", "Program", "Role"]
    , create_models = models.slice(0).filter(function(model) { return !model.match(/^(Cycle|Category|SystemSystem|SystemControl|Categorization|PopulationSample|Categorization|RelationshipType|Directive|SystemOrProcess|Option)$/) })
    , read_models = models.slice(0).filter(function(model) { return !model.match(/^(Cycle)$/) })
    , update_models = create_models.slice(0)
    , delete_models = create_models.slice(0)
      // It isn't actually possible to map a context-specific ObjectSection
    , private_program_models = create_models.slice(0).filter(function(model) { return !model.match(/^(Cycle|ObjectSection)$/) })
    , role_can = function(role, action, model) {
        return !!role.__GGRC_ADMIN__ || (role[action] && role[action].indexOf(model) > -1);
      }
    ;

  beforeEach(function() {
    Helpers = jasmine.GGRC.Helpers;
    ObjectFactory = Helpers.ObjectFactory;
    Permission = Helpers.Permission;
    load = Helpers.load;
    unload = Helpers.unload;
    success_or_error = Helpers.success_or_error;
    login = Permission.login;
    login_with_roles = Permission.login_with_roles;
    logout = Permission.logout;
    make = ObjectFactory.make;
    make_with_admin = ObjectFactory.make_with_admin;
    waitsFor(Permission.init());
  });

  afterEach(function() {
    waitsFor(logout());
    runs(function() {
      waitsFor(ObjectFactory.destroy());
    });
  });

  // Verify CRUD abilities for each role
  describe("System roles", function() {
    ["gGRC Admin", "Reader", "ObjectEditor", "ProgramCreator"].forEach(function(role) {

      describe(role, function() {
        var user
          , permissions
          ;

        beforeEach(function() {
          waitsFor(login_with_roles(role).done(function() {
            user = arguments[0];
            permissions = arguments[1];
          }));
        });

        afterEach(function() {
          user = undefined;
          permissions = undefined;
        });

        describe("create", function() {
          create_models.forEach(function(model) {
            it(model, function() {
              if (CMS.Models[model]) {
                var instance
                  , result
                  ;

                waitsFor(make(model, null, true).done(function(inst) {
                  instance = inst;
                }));

                runs(function() {
                  waitsFor(result = success_or_error(function(s,e) { instance.save(s,e); }));
                });

                runs(function() {
                  expect(role_can(permissions, "create", model) ? result.success : result.error).toHaveBeenCalled();
                });
              }
            });
          });
        });

        describe("read", function() {
          read_models.forEach(function(model) {
            it(model, function() {
              if (CMS.Models[model] && CMS.Models[model].findAll) {
                var instance
                  , result
                  ;

                waitsFor(make_with_admin(model).done(function(inst) {
                  instance = inst;
                }));

                runs(function() {
                  waitsFor(CMS.Models[model].findOne({ id: instance.id }).done(function() {
                    console.log(arguments);
                    result = arguments[0];
                  }));
                });

                runs(function() {
                  if (role_can(permissions, "read", model))
                    expect(result).toBeDefined();
                  else
                    expect(result).toBeUndefined();
                });
              }
            });
          });
        });

        describe("update", function() {
          update_models.forEach(function(model) {
            it(model, function() {
              if (CMS.Models[model]) {
                var instance
                  , result
                  ;

                waitsFor(make_with_admin(model).done(function(inst) {
                  instance = inst;
                }));

                runs(function() {
                  waitsFor(result = success_or_error(function(s,e) { instance.save(s,e); }));
                });

                runs(function() {
                  expect(role_can(permissions, "update", model) ? result.success : result.error).toHaveBeenCalled();
                });
              }
            });
          });
        });

        describe("delete", function() {
          delete_models.forEach(function(model) {
            it(model, function() {
              if (CMS.Models[model]) {
                var instance
                  , result
                  ;

                waitsFor(make_with_admin(model).done(function(inst) {
                  instance = inst;
                }));

                runs(function() {
                  waitsFor(result = success_or_error(function(s,e) { instance.destroy(s,e); }));
                });
                
                runs(function() {
                  expect(role_can(permissions, "delete", model) ? result.success : result.error).toHaveBeenCalled();
                });
              }
            });
          });
        });

      });
    });
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
