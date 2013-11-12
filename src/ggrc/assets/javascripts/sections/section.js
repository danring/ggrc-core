/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

//= require can.jquery-all
//= require controls/control
//= require models/cacheable

can.Model.Cacheable("CMS.Models.Section", {
  root_object : "section"
  , root_collection : "sections"
  , model_plural : "Sections"
  , table_plural : "sections"
  , title_plural : "Sections"
  , model_singular : "Section"
  , title_singular : "Section"
  , table_singular : "section"
  , category : "governance"
  , root_model : "Section"
  , findAll : "GET /api/sections"
  , findOne : "GET /api/sections/{id}"
  , create : "POST /api/sections"
  , update : "PUT /api/sections/{id}"
  , destroy : "DELETE /api/sections/{id}"
  , attributes : {
      contact : "CMS.Models.Person.stub"
    , owners : "CMS.Models.Person.stubs"
    , modified_by : "CMS.Models.Person.stub"
    , object_people : "CMS.Models.ObjectPerson.stubs"
    , people : "CMS.Models.Person.stubs"
    , object_documents : "CMS.Models.ObjectDocument.stubs"
    , documents : "CMS.Models.Document.stubs"
    , object_controls : "CMS.Models.ObjectControl.stubs"
    , controls : "CMS.Models.Control.stubs"
    , directive : "CMS.Models.get_stub"
    //, parent : "CMS.Models.Section.stub"
    , children : "CMS.Models.Section.stubs"
    , control_sections : "CMS.Models.ControlSection.stubs"
    , controls : "CMS.Models.Control.stubs"
    , section_objectives : "CMS.Models.SectionObjective.stubs"
    , objectives : "CMS.Models.Objective.stubs"
    , object_sections : "CMS.Models.ObjectSection.stubs"
  }

  , defaults : {
      title : ""
    , slug : ""
    , description : ""
    , url : ""
  }

  , tree_view_options : {
    show_view : "/static/mustache/sections/tree.mustache"
    , footer_view : GGRC.mustache_path + "/sections/tree_footer.mustache"
    , child_options : [{
        model : can.Model.Cacheable
      , mapping : "related_and_able_objects"
      , title_plural : "Business Objects"
      , draw_children : false
      , footer_view : GGRC.mustache_path + "/base_objects/tree_footer.mustache"
    }]
  }

  /*, findTree : function(params) {
    function filter_out(original, predicate) {
      var target = [];
      for(var i = original.length - 1; i >= 0; i--) {
        if(predicate(original[i])) {
          target.unshift(original.splice(i, 1)[0]);
        }
      }
      return target;
    }

    function treeify(list, directive_id, pid) {
      var ret = filter_out(list, function(s) { 
        return (!s.parent && !pid) || (s.parent.id == pid && (!directive_id || (s.directive && s.directive.id === directive_id)));
      });
      can.$(ret).each(function() {
        this.children = treeify(list, this.directive ? this.directive.id : null, this.id);
      });
      return ret;
    }

    return this.findAll(params).then(
        function(list, xhr) {
          var current;
          can.$(list).each(function(i, s) {
            can.extend(s, s.section);
            delete s.section;
          });
          var roots = treeify(list); //empties the list if all roots (no parent in list) are actually roots (null parent id)
          // for(var i = 0; i < roots.length; i++)
          //   list.push(roots[i]);
          function findRoot(i, v) {
            // find a pseudo-root whose parent wasn't in the returned sections
            if(can.$(list).filter(function(j, c) { return c !== v && v.parent && c.id === v.parent.id && ((!c.directive && !v.directive) || (c.directive && v.directive && c.directive.id === v.directive.id)) }).length < 1) {
              current = v;
              list.splice(i, 1); //remove current from list
              return false;
            }
          }
          while(list.length > 0) {
            can.$(list).each(findRoot);
            current.attr ? current.attr("children", treeify(list, current.id)) : (children = treeify(list, current.id));
            roots.push(current);
          }
          return roots;
        });
  }*/
  , init : function() {
    this._super.apply(this, arguments);
    //this.tree_view_options.child_options[3].model = this;
    this.validatePresenceOf("title");
    this.bind("created updated", function(ev, inst) {
      can.each(this.attributes, function(v, key) {
        (inst.key instanceof can.Observe.List) && inst.key.replace(inst.key); //force redraw in places
      });
    });
  }
  , map_object : function(params, section) {
    var join_ids, joins;

    if(params.u) {
      join_ids = can.map(params.object[params.join_model.root_collection], function(v) {
        return v.id;
      });

      joins = can.map(section[params.join_model.root_collection], function(sc) {
        return ~can.inArray(sc.id, join_ids) ? sc : undefined;
      });

      return $.when.apply($, can.map(joins, function(join) {
        return join.refresh().then(function(j) {
          return j.destroy();
        });
      }));
    } else {
      var j = new params.join_model({
        section : section.stub()
        , context : { id : params.context_id }
      });
      j.attr(params.object.constructor.root_object, params.object.stub());
      return j.save();
    }

  }
  , map_control : function(params, section) {
    var p = $.extend({}, params);
    p.object = p.control;
    p.join_model = CMS.Models.ControlSection;
    delete p.control;
    return this.map_object(p, section);
  }
  , map_objective : function(params, section) {
    var p = $.extend({}, params);
    p.object = p.objective;
    p.join_model = CMS.Models.SectionObjective;
    delete p.objective;
    return this.map_object(p, section);
  }
}, {
  map_control : function(params) {
    return this.constructor.map_control(
      can.extend({}, params, { section : this })
      , this);
  }
  , map_objective : function(params) {
    return this.constructor.map_objective(
      can.extend({}, params, { section : this })
      , this);
  }

});
