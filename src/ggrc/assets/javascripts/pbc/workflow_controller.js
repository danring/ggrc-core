/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By: brad@reciprocitylabs.com
 * Maintained By: brad@reciprocitylabs.com
 */


(function(can, $) {

can.Control("GGRC.Controllers.PbcWorkflows", {

}, {

  "{CMS.Models.Audit} created" : function(model, ev, instance) {
    var refresh_queue
    , that = this
    if(instance instanceof CMS.Models.Audit) {
      if(instance.auto_generate) {
        refresh_queue = new RefreshQueue();

        instance.program.reify().refresh()
        .then(function(program) {
          can.each(program.objectives.reify(), function(obj) {
            refresh_queue.enqueue(obj);
          });
          return refresh_queue.trigger();
        })
        .then(function(objectives) {
          can.each(objectives, function(objective) {
            that.create_request(instance, objective)
            .then(that.proxy("create_response"));
          });
        });
      } else {
        this.create_objective(instance)
        .then(this.proxy("map_objective_to_program", instance.program.reify()))
        .then(function(object_objective) {
          return object_objective.objective.reify();
        })
        .then(that.proxy("create_request", instance))
        .done(that.proxy("update_objective_title"))
        .done(this.proxy("create_response"));
      }
    }
  }

  , create_objective : function(audit) {
    return new CMS.Models.Objective({
      title : "Generic request"
      , context : audit.context
      , owner : audit.owner || CMS.Models.Person.model(GGRC.current_user)
    }).save();
  }

  , map_objective_to_program : function(program, objective) {
    return new CMS.Models.ObjectObjective({
      objectiveable : program.stub()
      , objective : objective.stub()
      , context : objective.context
    }).save();
  }

  , create_request : function(audit, objective) {
    return new CMS.Models.Request({
      assignee : audit.owner || CMS.Models.Person.model(GGRC.current_user)
      , audit : audit.stub()
      , start_at : new Date()
      , end_at : moment().add(30, "days").toDate()
      , objective : objective.stub()
      , request_type : "documentation"
      , description : "Please provide evidence of the type requested to demonstrate this Objective has been met."
      , context : audit.context
    }).save();
  }

  , update_objective_title : function(request) {
    var objective = request.objective.reify();
    objective.refresh().then(function() {
      objective.attr("title", objective.title + " " + request.attr("id")).save();
    });
    return request;
  }

  , create_response : function(request) {
    return new CMS.Models[request.response_model_class()]({
      pbc_response : "Generic response"
      , request : request.stub()
      , context : request.context
      , owner : request.assignee
    }).save();
  }

});

$(function() {
  $(document.body).ggrc_controllers_pbc_workflows();
});

})(this.can, this.can.$);