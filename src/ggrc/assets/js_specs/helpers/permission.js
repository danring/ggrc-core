!function() {

var unique_id = 1
	, roles = new $.Deferred()
		// Retrieves a role from the database by name
	, role_by_name = function(name) {
			var def = new $.Deferred();
			roles.done(function(roles) {
				def.resolve(roles[name]);
			});
			return def;
		}
	, ObjectFactory = jasmine.GGRC.Helpers.ObjectFactory
	, users = {}
	, initialized = false
	, Permission
	;

jasmine.GGRC.Helpers.Permission = Permission = {
		current_user : undefined

	, init : function() {
			var def = new $.Deferred;
			if (!initialized) {
				initialized = new $.Deferred();

				// Login as admin and retrieve roles
				Permission.login().done(function() {
					CMS.Models.Role.findAll({ scope__in: 'Private Program,Admin,System' }).done(function(list) {
						var lookup = {};
						can.each(list, function(role) {
							lookup[role.name] = role;
						})
						roles.resolve(lookup);
						initialized.resolve();
					})
				});
			}		

			initialized.done(function() {
				def.resolve();
			});
			return def;
		}

	, login : function(user) {
			var def = new $.Deferred
				;
			// Logs in as the example admin if no arguments are specified
			if (user) {
				user = {
						email: user.email
					, name: user.name
				};
			}
			user = user || {};

			Permission.logout().done(function() {
	      $.ajax("/login", {
	        beforeSend: function(xhr) {
	          xhr.setRequestHeader('X-ggrc-user', JSON.stringify(user));
	        }
	      }).pipe(function(response) {
	        GGRC.permissions = Permission.permissions = JSON.parse(response.match(/GGRC\.permissions.+/)[0].replace(/^GGRC.permissions\s*=\s*(.+?);$/, '$1'));
	        GGRC.current_user = Permission.current_user = new CMS.Models.Person(JSON.parse(response.match(/GGRC\.current_user.+/)[0].replace(/^GGRC.current_user\s*=\s*(.+?);$/, '$1')));
					def.resolve(GGRC.current_user);
	      });
			});

			return def;
		}

	, logout : function() {
			return $.ajax("/logout");
		}

	  // Creates a new user with the given roles
	  // Permission.user_by_roles(['gGRC Admin', 'Reader'], [3, 'ProgramEditor']).done(...)
	, user_with_roles : function(role_names, context_role_names) {
			if (!(role_names instanceof Array)) {
				role_names = [role_names];
			}
			context_role_names = context_role_names || [];
			var def = new $.Deferred()
				, context = context_role_names.splice(0, 1)[0]
				;

			// Create a user with these roles if one doesn't exist
			var hash = role_names.join(',') + ';' + ((context && context.id) || '') + ';' + context_role_names.join(',');
			if (!users[hash]) {
				var email = 'test_user_' + Date.now() + '-' + (++unique_id) + '@example.com';
				users[hash] = new $.Deferred();

				$.when.apply($, [
					ObjectFactory.make('Person', {
							name: email
						, email: email
					})
				].concat($.map(role_names.slice(0).concat(context_role_names), function(role_name) {
					return role_by_name(role_name);
				}))).done(function(user) {
					// After creating the user and retrieving roles, create user roles
					$.when.apply($, $.map(arguments, function(role, i) {
						if (i > 0) {
							return ObjectFactory.make('UserRole', {
									role: role
								, person: user
								, context: context && context_role_names.indexOf(role.name) > -1 ? context : { id: null }
							});
						}
					})).done(function() {
						users[hash].resolve(user);
					});
				});
			}

			users[hash].done(function(user) {
				def.resolve(user);
			});

			return def;
		}

		// Same as user_with_roles, but also logs in
	, login_with_roles : function(role_names, context_role_names) {
		var def = new $.Deferred();
		Permission.user_with_roles(role_names, context_role_names).done(function(user) {
			Permission.login(user).done(function(current_user) {
				def.resolve(current_user);
			});
		});
		return def;
	}
};

}();
