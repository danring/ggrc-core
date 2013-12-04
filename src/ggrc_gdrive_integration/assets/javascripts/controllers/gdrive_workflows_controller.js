(function(can, $) {
var create_folder = function(cls, title_generator, parent_attr, model, ev, instance) {
  var that = this
  , dfd
  , owner = cls === CMS.Models.Request ? "assignee" : "owner";

  if(instance instanceof cls) {
    if(parent_attr) {
      dfd = instance[parent_attr].reify().get_binding("folders").refresh_instances();
    } else {
      dfd = $.when([{}]); //make parent_folder instance be undefined; 
                          // GDriveFolder.create will translate that into 'root'
    }
    var redirectProgram = function(){
      if(instance instanceof CMS.Models.Program) {
        window.location.assign(instance.selfLink.replace('/api', ''));
      }
    }
    return dfd.then(function(parent_folders) {
      return new CMS.Models.GDriveFolder({
        title : title_generator(instance)
        , parents : parent_folders[0].instance
      }).save();
    }, redirectProgram).then(function(folder) {
      var refresh_queue;

      new CMS.Models.ObjectFolder({
        folder : folder
        , folderable : instance
        , context : instance.context || { id : null }
      }).save();

      if(instance[owner] && instance[owner].id !== GGRC.current_user.id) {
        refresh_queue = new RefreshQueue().enqueue(instance[owner].reify());
        refresh_queue.trigger().done(function() {
          new CMS.Models.GDriveFolderPermission({
            folder : folder
            , person : instance[owner]
            , role : "writer"
          }).save();
        });
      }
    }, redirectProgram).then(redirectProgram);
  }
  else {
    dfd = new $.Deferred();
    return dfd.reject("Type mismatch");
  }
};

function partial_proxy(fn) {
  var args = can.makeArray(arguments).slice(1);
  return function() {
    return fn.apply(this, args.concat(can.makeArray(arguments)));
  };
}

can.Control("GGRC.Controllers.GDriveWorkflow", {

}, {
  request_create_queue : []

  , create_program_folder : partial_proxy(create_folder, CMS.Models.Program, function(inst) { return inst.title + " Audits"; }, null)
  , "{CMS.Models.Program} created" : "create_program_folder"

  , create_audit_folder : partial_proxy(create_folder, CMS.Models.Audit, function(inst) { return inst.title; }, "program")
  , "{CMS.Models.Audit} created" : function(model, ev, instance) {
    if(instance instanceof CMS.Models.Audit) {
      var that = this;
      this._audit_create_in_progress = true;
      instance.program.reify().refresh()
      .then(this.proxy("create_folder_if_nonexistent"))
      .then($.proxy(instance.program.reify(), "refresh"))
      .then(function() {
        that.create_audit_folder(model, ev, instance);
        delete that._audit_create_in_progress;
      });
    }
  }

  // if we had to wait for an Audit to get its own folder link on creation, we can now do the delayed creation
  //  of folder links for the audit's requests, which were created first in the PBC workflow
  , "{CMS.Models.ObjectFolder} created" : function(model, ev, instance) {
    var i, that = this, folderable;
    if(instance instanceof CMS.Models.ObjectFolder && (folderable = instance.folderable.reify()) instanceof CMS.Models.Audit) {
      folderable.refresh().then(function() {
        folderable.get_binding("folders").refresh_instances().then(function() {
          for(i = that.request_create_queue.length; i--;) {
            if(that.request_create_queue[i].audit.reify() === instance.folderable.reify()) {
              that.create_request_folder(CMS.Models.Request, ev, that.request_create_queue[i]);
              that.request_create_queue.splice(i, 1);
            }
          }
        });
      });
    }
  }

  // When creating requests as part of audit workflow, wait for audit to have a folder link before
  // trying to create subfolders for request.  If the audit and its folder link are already created
  //  we can do the request folder immediately.
  , create_request_folder : partial_proxy(create_folder, CMS.Models.Request, function(inst) { return inst.objective.reify().title; }, "audit")
  , "{CMS.Models.Request} created" : function(model, ev, instance) {
    if(instance instanceof CMS.Models.Request) {
      if(this._audit_create_in_progress || instance.audit.reify().object_folders.length < 1) {
        this.request_create_queue.push(instance);
      } else {
        this.create_request_folder(model, ev, instance);
      }
    }
  }

  , update_owner_permission : function(model, ev, instance, role, person) {
    var dfd
    , owner = instance instanceof CMS.Models.Request ? "assignee" : "contact";

    // TODO check whether person is the logged-in user, and use OAuth2 identifier if so?
    role = role || "writer";
    if(~can.inArray(instance.constructor.shortName, ["Program", "Audit", "Request"]) && (person || instance[owner])) {
      person = (person || instance[owner]).reify();
      if(person.selfLink) {
        dfd = $.when(person);
      } else {
        dfd = person.refresh();
      }
      dfd.then(function() {
        $.when(
          CMS.Models.GDriveFilePermission.findUserPermissionId(person)
          , instance.get_binding("folders").refresh_instances()
          , GGRC.config.GAPI_ADMIN_GROUP 
            ? CMS.Models.GDriveFilePermission.findUserPermissionId(GGRC.config.GAPI_ADMIN_GROUP)
            : undefined
        ).then(function(user_permission_id, list, admin_permission_id) {
          can.each(list, function(binding) {
            binding.instance.findPermissions().then(function(permissions) {
              var owners_matched = !GGRC.config.GAPI_ADMIN_GROUP;  //if no admin group, ignore.
              var matching = can.map(permissions, function(permission) {
                if(admin_permission_id
                   && permission.type === "group"
                   && (permission.id === admin_permission_id)
                       || (permission.emailAddress && permission.emailAddress.toLowerCase() === GGRC.config.GAPI_ADMIN_GROUP.toLowerCase())
                ) {
                  owners_matched = true;
                }
                /* NB: GDrive sometimes provides the email address assigned to a permission and sometimes not.
                   Email addresses will match on permissions that are sent outside of GMail/GApps/google.com
                   while "Permission IDs" will match on internal account permissions (where email address is
                   usually not provided).  Check both.
                */
                if(permission.type === "user"
                  && (permission.id === user_permission_id
                      || (permission.emailAddress && permission.emailAddress.toLowerCase() === person.email.toLowerCase()))
                  && (permission.role === "owner" || permission.role === "writer" || permission.role === role)
                ) {
                  return permission;
                }
              });
              if(matching.length < 1) {
                new CMS.Models.GDriveFolderPermission({
                  folder : binding.instance
                  , person : person
                  , role : role
                }).save();
              }
              if(!owners_matched) {
                new CMS.Models.GDriveFolderPermission({
                  folder : binding.instance
                  , email : GGRC.config.GAPI_ADMIN_GROUP
                  , role : "writer"
                  , permission_type : "group"
                }).save();
              }
            });
          });
        });
      });
    }
  }
  , "{CMS.Models.Program} updated" : "update_owner_permission"
  , "{CMS.Models.Audit} updated" : "update_owner_permission"
  , "{CMS.Models.Request} updated" : "update_owner_permission"


  , "a[data-toggle=gdrive-picker] click" : function(el, ev) {
    var response = CMS.Models.Response.findInCacheById(el.data("response-id"))
    , request = response.request.reify()
    , parent_folder = (request.get_mapping("folders")[0] || {}).instance;

    if(!parent_folder) {
      el.trigger("ajax:flash", { warning : 'No GDrive folder found for PBC Request "' + request.objective.reify().title + '"'});
    }
    //NB: resources returned from uploadFiles() do not match the properties expected from getting
    // files from GAPI -- "name" <=> "title", "url" <=> "alternateLink".  Of greater annoyance is
    // the "url" field from the picker differs from the "alternateLink" field value from GAPI: the
    // URL has a query parameter difference, "usp=drive_web" vs "usp=drivesdk".  For consistency,
    // when getting file references back from Picker, always put them in a RefreshQueue before
    // using their properties. --BM 11/19/2013
    parent_folder.uploadFiles().then(function(files) {
      return new RefreshQueue().enqueue(files).trigger().then(function(fs) {
        return $.when.apply($, can.map(fs, function(f) {
          if(!~can.inArray(parent_folder.id, can.map(f.parents, function(p) { return p.id; }))) {
            return f.copyToParent(parent_folder);
          } else {
            return f;
          }
        }));
      });
    }).done(function() {
      var files = can.makeArray(arguments);
      can.each(files, function(file) {
        //Since we can re-use existing file references from the picker, check for that case.
        CMS.Models.Document.findAll({link : file.alternateLink }).done(function(d) {
          if(d.length) {
            //file found, just link to Response
            new CMS.Models.ObjectDocument({
              context : response.context || {id : null}
              , documentable : response
              , document : d[0]
            }).save();
            CMS.Models.ObjectFile.findAll({ file_id : file.id, fileable : d[0] })
            .done(function(ofs) {
              if(ofs.length < 1) {
                new CMS.Models.ObjectFile({
                  context : response.context || {id : null}
                  , file : file
                  , fileable : d[0]
                }).save();
              }
            });
          } else {
            //file not found, make Document object.
            new CMS.Models.Document({
              context : response.context || {id : null}
              , title : file.title
              , link : file.alternateLink
            }).save().then(function(doc) {
              new CMS.Models.ObjectDocument({
                context : response.context || {id : null}
                , documentable : response
                , document : doc
              }).save();
              new CMS.Models.ObjectFile({
                context : response.context || {id : null}
                , file : file
                , fileable : doc
              }).save();
            });
          }
        });
      });
    });
  }
  , "a.create-folder click" : function(el, ev) {
    var data = el.closest("[data-model], :data(model)").data("model") || GGRC.make_model_instance(GGRC.page_object);
    this.create_folder_if_nonexistent(data);
  }
  , create_folder_if_nonexistent : function(object) {
    var dfd = new $.Deferred()
    , that = this
    , parent_prop = {
      "Program" : null
      , "Audit" : "program"
      , "Request" : "audit"
    };
    if(parent_prop[object.constructor.shortName]) {
      dfd = this.create_folder_if_nonexistent(object[parent_prop[object.constructor.shortName]].reify());
    } else {
      dfd.resolve();
    }
    return dfd.then(function foldercheck() {
      if(object.get_mapping("folders").length) {
        //assume we already tried refreshing folders.
      } else if(object instanceof CMS.Models.Request) {
        if(that._audit_create_in_progress || object.audit.reify().get_mapping("folders").length < 1) {
          that.request_create_queue.push(object);
        } else {
          that.create_request_folder(object.constructor, {}, object);
        }
      } else {
        return that["create_" + object.constructor.table_singular + "_folder"](object.constructor, {}, object);
      }
    });
  }

  // FIXME I can't figure out from the UserRole what context it applies to.  Assuming that we are on
  //  the program page and adding ProgramReader/ProgramEditor/ProgramOwner.
  , "{CMS.Models.UserRole} created" : function(model, ev, instance) {
    if(instance instanceof CMS.Models.UserRole 
       && GGRC.page_instance() instanceof CMS.Models.Program 
       && /^Program/.test(instance.role.reify().name)
    ) {
      this.update_owner_permission(
        model
        , ev
        , GGRC.page_instance()
        , instance.role.reify().name === "ProgramReader" ? "reader" : "writer"
        , instance.person
      );
    }
  }

  , "{CMS.Models.Meeting} created" : function(model, ev, instance) {
    if(instance instanceof CMS.Models.Meeting) {
      new CMS.Models.GCalEvent({
        calendar : GGRC.config.DEFAULT_CALENDAR
        , summary : instance.title
        , start : instance.start_at
        , end : instance.end_at
        , attendees : can.map(instance.get_mapping("people"), function(m) { return m.instance; })
      }).save().then(function(cev) {
        var subwin;

        function poll() {
          if(subwin.closed) {
            cev.refresh().then(function() {
              instance.attr({
                title : cev.summary
                , start_at : cev.start
                , end_at : cev.end
              });
              can.each(instance.get_mapping("people"), function(person_binding) {
                instance.mark_for_deletion("people", person_binding.instance);
              });
              can.each(cev.attendees, function(attendee) {
                instance.mark_for_addition("people", attendee);
              });
              instance.save();
            });
          } else {
            setTimeout(poll, 5000);
          }
        }

        new CMS.Models.ObjectEvent({
          eventable : instance
          , calendar : GGRC.config.DEFAULT_CALENDAR
          , event : cev
          , context : instance.context || { id : null }
        }).save();

        subwin = window.open(cev.htmlLink, cev.summary);
        setTimeout(poll, 5000);

      });
    }
  }
});

$(function() {
  $(document.body).ggrc_controllers_g_drive_workflow();
});

})(this.can, this.can.$);
