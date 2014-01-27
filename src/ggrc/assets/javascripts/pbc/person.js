/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

//= require can.jquery-all
//= require models/cacheable

(function(ns, can) {

can.Model.Cacheable("CMS.Models.Person", {
   root_object : "person"
   , root_collection : "people"
   , category : "entities"
   , findAll : "GET /api/people"
   , findOne : "GET /api/people/{id}"
   , create : "POST /api/people"
   , update : "PUT /api/people/{id}"
   , destroy : "DELETE /api/people/{id}"
   , search : function(request, response) {
        return $.ajax({
            type : "get"
            , url : "/api/people"
            , dataType : "json"
            , data : {s : request.term}
            , success : function(data) {
                response($.map( data, function( item ) {
                  return can.extend({}, item.person, {
                    label: item.person.email
                    , value: item.person.id
                  });
                }));
            }
        });
    }
    , attributes : {
        modified_by : "CMS.Models.Person.stub"
      , object_people : "CMS.Models.ObjectPerson.stubs"
      , language : "CMS.Models.Option.stub"
      , user_roles : "CMS.Models.UserRole.stubs"
    }
    , defaults : {
      name : ""
      , email : ""
    }
    , findInCacheByEmail : function(email) {
      var result = null, that = this;
      can.each(Object.keys(this.cache || {}), function(k) {
        if(that.cache[k].email === email) {
          result = that.cache[k];
          return false;
        }
      });
      return result;
    }
  , tree_view_options: {
        show_view: GGRC.mustache_path + "/people/tree.mustache"
        , footer_view : GGRC.mustache_path + "/people/tree_footer.mustache"
    }
  , list_view_options: {
        find_function: "findPage"
      , find_params: { "__sort": "name,email" }
      , compare_fn: null
    }
  , init : function() {
    this._super.apply(this, arguments);
    //H/T to Sebastian Porto for the email validation regex
    this.validatePresenceOf("email");
    this.validateFormatOf("email", /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])/);
  }
}, {
  display_name : function() {
    return this.email;
  }
  , autocomplete_label : function() {
    return this.name ? this.name + " <span class=\"url-link\">" + this.email + "</span>" : this.email;
  }
});

})(this, can);
