!function() {

var cache = []
	, Permission
	, ObjectFactory
	;

jasmine.GGRC.Helpers.ObjectFactory = ObjectFactory = {
		// Creates a new model instance
		make : function(model, attrs, skip_save) {
			!Permission && (Permission = jasmine.GGRC.Helpers.Permission);
			var Model = CMS.Models[model]
				, def = new $.Deferred()
				;

			attrs = can.extend({ context: { id: null } }, attrs);
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

			Permission.login().done(function(user) {
				var count = 0
					, handle = function() {
							++count;
							if (count === cache.length)
								def.resolve();
						}
					;
				can.each(cache.slice(0), function(instance) {
					instance.destroy(handle, handle);
				});
				cache = [];
				def.resolve();
			});

			return def;
		}
};

}();
