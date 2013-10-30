!function() {

var cache = []
  , Permission
  , ObjectFactory
  , success_or_error = jasmine.GGRC.Helpers.success_or_error
  , unique_id = 1
  ;

jasmine.GGRC.Helpers.ObjectFactory = ObjectFactory = {
    // Creates a new model instance
    make : function(model, attrs, skip_save) {
      !Permission && (Permission = jasmine.GGRC.Helpers.Permission);
      var Model = CMS.Models[model]
        , def = new $.Deferred()
        , waits = []
        , make_with_admin = ObjectFactory.make_with_admin
        ;
      attrs = can.extend({ context: { id: null } }, attrs);

      // Create objects used for joins
      if (new Model() instanceof can.Model.Join) {
        if (model === 'ObjectSection') {
          waits.push(make_with_admin('Section').done(function(section) {
            attrs.section = section;
            attrs.sectionable = section.directive;
          }));
        }
        else {
          var keyed = false;
          can.each(Model.join_keys, function(join, key) {
            if (!attrs[key]) {
              // Using the same value for both keys will result in duplicate entry errors during similar tests
              if (attrs.context.id && !keyed && (join === can.Model.Cacheable || join === context.constructor)) {
                keyed = true;
                attrs[key] = attrs.context;
              }
              else if (join === CMS.Models.Directive) {
                waits.push(make_with_admin('Regulation').done(function(regulation) {
                  attrs[key] = regulation;
                }));
              }
              else if (join === can.Model.Cacheable) {
                waits.push(make_with_admin('Control').done(function(control) {
                  attrs[key] = control;
                }));
              }
              else {
                waits.push(make_with_admin(join.shortName).done(function(inst) {
                  attrs[key] = inst;
                }));
              }
            }
          });
        }
      }
      else if (model === "Section") {
        waits.push(make_with_admin('Regulation').done(function(regulation) {
          attrs.directive = regulation;
        }));
      }
      else if (model === "Person") {
        !attrs.email && (attrs.email = "user_permission_" + Date.now() + "-" + (++unique_id) + "@example.com");
        !attrs.name && (attrs.name = "user_permission_" + Date.now() + "-" + (unique_id));
      }
      else if (model === "Role") {
        !attrs.name && (attrs.name = "user_permission_" + Date.now() + "-" + (unique_id));
      }

      // Create the instance (after related instances have been created)
      $.when.apply($, waits).done(function() {
        var instance = new Model(attrs);
        cache.push(instance);
        
        if (skip_save) {
          def.resolve(instance);
        }
        else {
          instance.save(function() {
            def.resolve(instance);
          });
        }
      });

      return def;
    }

    // Creates a new model instance using the admin user
  , make_with_admin : function(model, attrs) {
      !Permission && (Permission = jasmine.GGRC.Helpers.Permission);
      var current_user = Permission.current_user
        , def = new $.Deferred()
        ;

      Permission.login().done(function() {
        ObjectFactory.make(model, attrs).done(function(instance) {
          Permission.login(current_user).done(function() {
            def.resolve(instance);
          });
        });
      });

      return def;
    }

    // Destroys all instances created
  , destroy : function() {
      var def = new $.Deferred();

      Permission.login().done(function(user, permissions) {
        // Sort objects by whether they're a join
        var local_cache = cache.slice(0).sort(function(a, b) {
              if (a instanceof can.Model.Join && !(b instanceof can.Model.Join)) return -1;
              else if (!(a instanceof can.Model.Join) && b instanceof can.Model.Join) return 1;
              else if (a instanceof CMS.Models.Section && !(b instanceof CMS.Models.Section)) return -1;
              else if (!(a instanceof CMS.Models.Section) && b instanceof CMS.Models.Section) return 1;
              return 0;
            })
          , count = 0
          ;

        // Destroy all objects in order
        !function destroy_front() {
          if (local_cache.length > 0) {
            success_or_error(function(s,e) {
              local_cache.splice(0,1)[0].destroy(s,e);
            }).done(function() {
              destroy_front();
            });
          }
          else {
            def.resolve();
          }
        }();

        cache = [];
      });

      return def;
    }
};

}();
