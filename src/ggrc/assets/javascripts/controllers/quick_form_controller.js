

GGRC.Controllers.Modals("GGRC.Controllers.QuickForm", {
  defaults : {
    model : null
    , instance : null
  }
}, {

  init : function() {
    if(this.options.instance && !this.options.model) {
      this.options.model = this.options.instance.constructor;
    }
    this.options.$content = this.element;
    this.options.instance.refresh();
  }

  , "input, textarea, select change" : function(el, ev) {
    var that = this;
    if(!el.is("[data-lookup]")) {
      this.set_value_from_element(el);
      setTimeout(function() {
        that.options.instance.save();
      }, 100);
    }
  }

  , autocomplete_select : function(el, event, ui) {
    var that = this;
    if(this._super.apply(this, arguments) !== false) {
      setTimeout(function() {
        that.options.instance.save();
      }, 100);
    } else {
      return false;
    }
  }

  , "input, select, textarea click" : function(el, ev) {
    this._super && this._super.apply(this, arguments);
    ev.stopPropagation();
  }

});