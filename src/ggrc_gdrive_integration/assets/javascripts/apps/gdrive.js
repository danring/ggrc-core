/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By: Bradley Momberger
 * Maintained By: Bradley Momberger
 */

(function($, CMS, GGRC) {
  var scopes = ['https://www.googleapis.com/auth/userinfo.email'];

  window.gapi_authorize = function(newscopes) {
    newscopes = newscopes || [];
    newscopes = can.map(newscopes, function(ns) {
      if(!~can.inArray(ns, scopes)) {
        scopes.push(ns);
        return ns;
      }
    });
    //reauthorize if we're going to change scope
    return newscopes.length ? window.oauth_dfd.then($.proxy(window.doGAuth, window, false)) : window.oauth_dfd;
  };

  $('head').append("<scr" + "ipt type='text/javascript' src='https://apis.google.com/js/client.js?onload=doGAuth'></script>");

  var google_oauth = null;
  window.oauth_dfd = new $.Deferred();

  window.doGAuth = function(use_popup) {
    var o2dfd = new $.Deferred()
    , authdfd = new $.Deferred();
    if(window.oauth_dfd.state() !== "pending") {
      window.oauth_dfd = new $.Deferred();
    }
    window.gapi.client.load('drive', 'v2');
    window.gapi.client.load('oauth2', 'v2', function(result) {
      if(!result){
        o2dfd.resolve();
      } else {
        o2dfd.reject(result);
      }
    });
    window.gapi.auth.authorize({
      'client_id': GGRC.config.GAPI_CLIENT_ID
      , 'scope': scopes
      , 'immediate': !use_popup
      , 'login_hint' : GGRC.current_user && GGRC.current_user.email
    }, function(authresult) {
      authdfd.resolve(authresult);
    });
    $.when(authdfd, o2dfd)
    .then(function(authresult) {
      var o2d = new $.Deferred();
      if(!authresult && !use_popup) {
        doGAuth(true);
        return new $.Deferred().reject("login required. Switching to non-immediate");
      } else if(!authresult) {
        window.oauth_dfd.reject("auth failed");
        return new $.Deferred().reject();
      } else {
        gapi.client.oauth2.userinfo.get().execute(function(user) {
          if(user.error) {
            $(document.body.trigger("ajax:flash", { error : user.error }));
            o2d.reject(user.error);
          } else {
            o2d.resolve(user);
          }
        });
        return $.when(authresult, o2d);
      }
    })
    .done(function(authresult, o2result){  //success
      if(!authresult)
        return; //assume we had to do a non-immediate auth

      if(o2result.email.toLowerCase().trim() !== GGRC.current_user.email.toLowerCase().trim()) {
        $(document.body).trigger(
          "ajax:flash"
          , { warning : [
            "You are signed into GGRC as"
            , GGRC.current_user.email
            , "and into Google Apps as"
            , o2result.email
            , ". You may experience problems uploading evidence."
            ].join(' ')
          });
      }
      google_oauth = authresult;
      oauth_dfd.resolve(authresult, o2result);
    });
  };

  GGRC.config = GGRC.config || {};
  CMS.Models.GCal.getPrimary().done(function(d) {
    GGRC.config.USER_PRIMARY_CALENDAR = d;
    if(!GGRC.config.DEFAULT_CALENDAR) {
      GGRC.config.DEFAULT_CALENDAR = d;
    }
  });


  $.extend(true, CMS.Models.Program.attributes, {
    "object_folders" : "CMS.Models.ObjectFolder.stubs"
    , "folders" : "CMS.Models.GDriveFolder.stubs"
  });
  // GGRC.Mappings.Program.object_folders = new GGRC.ListLoaders.DirectListLoader("ObjectFolder", "folderable");
  GGRC.Mappings.Program.folders = new GGRC.ListLoaders.ProxyListLoader("ObjectFolder", "folderable", "folder", "object_folders", "GDriveFolder");
  GGRC.register_hook("Program.extended_info", GGRC.mustache_path + "/programs/gdrive_info.mustache");

  $.extend(true, CMS.Models.Audit.attributes, {
    "object_folders" : "CMS.Models.ObjectFolder.stubs"
    , "folders" : "CMS.Models.GDriveFolder.stubs"
  });
  can.getObject("GGRC.Mappings.Audit", window, true).folders = new GGRC.ListLoaders.ProxyListLoader("ObjectFolder", "folderable", "folder", "object_folders", "GDriveFolder");
  //GGRC.Mappings.Audit.object_folders = new GGRC.ListLoaders.DirectListLoader("ObjectFolder", "folderable");
  CMS.Models.Audit.tree_view_options.show_view = GGRC.mustache_path + "/audits/gdrive_tree.mustache";

  GGRC.register_hook("Audit.tree_view_info", GGRC.mustache_path + "/audits/gdrive_info.mustache");


  $.extend(true, CMS.Models.Request.attributes, {
    "object_folders" : "CMS.Models.ObjectFolder.stubs"
    , "folders" : "CMS.Models.GDriveFolder.stubs"
  });
  can.getObject("GGRC.Mappings.Request", window, true).folders = new GGRC.ListLoaders.ProxyListLoader("ObjectFolder", "folderable", "folder", "object_folders", "GDriveFolder");
  GGRC.register_hook("Request.tree_view_info", GGRC.mustache_path + "/requests/gdrive_info.mustache");

  $.extend(true, CMS.Models.DocumentationResponse.attributes, {
    "object_files" : "CMS.Models.ObjectFile.stubs"
    , "files" : "CMS.Models.GDriveFile.stubs"
  });
  $.extend(true, CMS.Models.PopulationSampleResponse.attributes, {
    "object_files" : "CMS.Models.ObjectFile.stubs"
    , "files" : "CMS.Models.GDriveFile.stubs"
  });
  $.extend(true, CMS.Models.Document.attributes, {
    "object_files" : "CMS.Models.ObjectFile.stubs"
    , "files" : "CMS.Models.GDriveFile.stubs"
  });
  can.getObject("GGRC.Mappings.Document", window, true).files = new GGRC.ListLoaders.ProxyListLoader("ObjectFile", "fileable", "file", "object_files", "GDriveFile");

  CMS.Models.Response.tree_view_options.child_options[1].show_view = GGRC.mustache_path + "/responses/gdrive_evidence_tree.mustache";
  CMS.Models.Response.tree_view_options.child_options[1].footer_view = GGRC.mustache_path + "/responses/gdrive_upload_evidence.mustache";
  //We are no longer mapping GDrive files directly to responses.  It makes it difficult to figure out which GDrive file is which
  // document when we go to present. however, this functionality is still supported. 
  can.getObject("GGRC.Mappings.Response", window, true).files = new GGRC.ListLoaders.ProxyListLoader("ObjectFile", "fileable", "file", "object_files", "GDriveFile");
  can.getObject("GGRC.Mappings.DocumentationResponse", window, true).files = new GGRC.ListLoaders.ProxyListLoader("ObjectFile", "fileable", "file", "object_files", "GDriveFile");
  can.getObject("GGRC.Mappings.PopulationSampleResponse", window, true).files = new GGRC.ListLoaders.ProxyListLoader("ObjectFile", "fileable", "file", "object_files", "GDriveFile");

  can.getObject("GGRC.Mappings.GDriveFolder", window, true).permissions = new GGRC.ListLoaders.DirectListLoader("GDriveFolderPermission", "id");
  can.getObject("GGRC.Mappings.GDriveFile", window, true).permissions = new GGRC.ListLoaders.DirectListLoader("GDriveFilePermission", "id");
  can.getObject("GGRC.Mappings.GDriveFolder", window, true).revisions = new GGRC.ListLoaders.DirectListLoader("GDriveFileRevision", "id");
  can.getObject("GGRC.Mappings.GDriveFile", window, true).revisions = new GGRC.ListLoaders.DirectListLoader("GDriveFileRevision", "id");


  // GGRC.JoinDescriptor.from_arguments_list([
  //   [["Program", "Audit", "Request"], "GDriveFolder", "ObjectFolder", "folder", "folderable"]
  //   , ["Response", "GDriveFile", "ObjectFile", "file", "fileable"]
  // ]);

  $.extend(true, CMS.Models.Meeting.attributes, {
    "object_events" : "CMS.Models.ObjectEvent.stubs"
    , "events" : "CMS.Models.GCalEvent.stubs"
  });
  can.getObject("GGRC.Mappings.Meeting", window, true).events = new GGRC.ListLoaders.ProxyListLoader("ObjectEvent", "eventable", "event", "object_events", "GCalEvent");
  GGRC.register_hook("Meeting.tree_view_info", GGRC.mustache_path + "/meetings/gcal_info.mustache");

  // Enable these hooks when the deployment allows G+ APIs
  // GGRC.register_hook("Person.popover_actions", GGRC.mustache_path + "/people/gplus_actions.mustache");
  // GGRC.register_hook("Person.popover_info", GGRC.mustache_path + "/people/gplus_photo.mustache");

})(this.can.$, this.CMS, this.GGRC);
