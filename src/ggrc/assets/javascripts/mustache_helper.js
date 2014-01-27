/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

(function(namespace, $, can) {

//chrome likes to cache AJAX requests for Mustaches.
var mustache_urls = {};
$.ajaxPrefilter(function( options, originalOptions, jqXHR ) {
  if ( /\.mustache$/.test(options.url) ) {
    if(mustache_urls[options.url]) {
      options.url = mustache_urls[options.url];
    } else {
      mustache_urls[options.url] = options.url += "?r=" + Math.random();
    }
  }
});

function get_template_path(url) {
  var match;
  match = url.match(/\/static\/mustache\/(.*)\.mustache/);
  return match && match[1];
}

// Check if the template is available in "GGRC.Templates", and if so,
//   short-circuit the request.
$.ajaxTransport("text", function(options, _originalOptions, _jqXHR) {
  var template_path = get_template_path(options.url),
      template = template_path && GGRC.Templates[template_path];

  if (template) {
    return {
      send: function(headers, completeCallback) {
        function done() {
          if (template)
            completeCallback(200, "success", { text: template });
        }
        if (options.async)
          setTimeout(done, 0);
        else
          done();
      },

      abort: function() {
        template = null;
      }
    }
  }
});

  Mustache.registerHelper("join", function() {
    var prop, context = this, ret, options = arguments[arguments.length - 1];

    switch(arguments.length) {
      case 1:
        break;
      case 2:
        typeof arguments[0] === 'string' ? prop = arguments[0] : context = arguments[0];
        break;
      default:
        prop = arguments[0];
        context = arguments[1];
    }
    if(!context) {
      ret =  "";
    } else if(context.length) {
      ret = $(context).map(function() { return prop ? (can.getObject(prop, this) || "").toString() : this.toString(); }).get().join(", ");
    } else {
      ret = prop ? (can.getObject(prop, context) || "").toString() : context.toString();
    }
    return ret;
  });

  var quickHash = function(str, seed) {
    var bitval = seed || 1;
    str = str || "";
    for(var i = 0; i < str.length; i++)
    {
      bitval *= str.charCodeAt(i);
      bitval = Math.pow(bitval, 7);
      bitval %= Math.pow(7, 37);
    }
    return bitval;
  }


  var getParentNode = function (el, defaultParentNode) {
    return defaultParentNode && el.parentNode.nodeType === 11 ? defaultParentNode : el.parentNode;
  }


    function isExtendedFalsy(obj) {
      return !obj 
        || (typeof obj === "object" && can.isEmptyObject(obj))
        || (obj.length != null && obj.length == 0) 
        || (obj.serialize && can.isEmptyObject(obj.serialize()));
    }

    function preprocessClassString(str) {
      var ret = []
      , src = str.split(" ");

      for(var i = 0; i < src.length; i++) {
        var expr = src[i].trim();
        if(expr.charAt(0) === "=") {
          ret.push({ attr : src[i].trim().substr(1) });
        } else if(expr.indexOf(":") > -1) {
          var spl = expr.split(":");
          var arr = [];
          for(var j = 0; j < spl.length - 1; j ++) {
            var inverse = spl[j].trim()[0] === "!"
            , attr_name = spl[j].trim().substr(inverse ? 1 : 0)
            
            arr.push({attr : attr_name, inverse : inverse});
          }
          arr.value = spl[spl.length - 1];
          ret.push(arr);
        } else {
          ret.push(expr);
        }
      }
      return ret;
    }

    function buildClassString(arr, context) {
      var ret = [];
      for(var i = 0; i < arr.length; i++) {
        if(typeof arr[i] === "string") {
          ret.push(arr[i]);
        } else if(typeof arr[i] === "object" && arr[i].attr) {
          ret.push(can.getObject(arr[i].attr, context));
        } else if(can.isArray(arr[i]) && arr[i].value) {
          var p = true;
          for(var j = 0; j < arr[i].length; j ++) {
            var attr = can.getObject(arr[i][j].attr, context);
            if(arr[i][j].inverse ? !isExtendedFalsy(attr) : isExtendedFalsy(attr)) {
              p = false;
              break;
            }
          }
          if(p) {
            ret.push(arr[i].value);
          }
        } else {
          throw "Unsupported class building expression: " + JSON.stringify(arr[i]);
        }
      }

      return ret.join(" ");
    }

  /**
  * helper withclass
  * puts a class string on the element, includes live binding:
  * usage:
  * {{#withclass 'class strings'}}<element>...</element>{{/withclass}}
  * {{{withclass 'class strings'}}} to apply to the parent element a la XSLT <xsl:attribute>. Note the triple braces!
  * Tokens usable in class strings:
  *  =attribute : add the value of the attribute as a class
  *  attribute:value : if attribute is truthy, add value to the classes
  *  !attribute:value : if attribute is falsy, add value
  *  attr1:!attr2:value : if attr1 is truthy and attr2 is falsy, add value
  *  plainstring : use this class literally
    *  
  */
  Mustache.registerHelper("withclass", function() {
    var options = arguments[arguments.length - 1]
    , exprs = preprocessClassString(arguments[0])
    , that = this.___st4ck ? this[this.length-1] : this
    , hash = quickHash(arguments[0], quickHash(that._cid)).toString(36)
    //, content = options.fn(this).trim()
    //, index = content.indexOf("<") + 1

    // while(content[index] != " ") {
    //   index++;
    // }
    function classbinding(el, ev, newVal, oldVal) {
      $(el).attr("class", buildClassString(exprs, this));
    }


    function hookupfunc(el, parent, view_id) {
      var content = options.fn(that);

      if(content) {
        var frag = can.view.frag(content, parent);
        var $newel = $(frag.querySelector("*"));
        el.parentNode ? el.parentNode.replaceChild($newel[0], el) : $(parent).append($newel);
        el = $newel[0];
      } else {
        //we are inside the element we want to add attrs to.
        var p = el.parentNode
        p.removeChild(el)
        el = p;
      }
      for(var i = 0; i < exprs.length; i ++) {
        var expr = exprs[i];
        if(typeof expr === "object" && expr.attr && that.bind) {
          that.bind(expr.attr + "." + hash, $.proxy(classbinding, that, el));
        } else if(can.isArray(expr) && expr.value && that.bind) {
          can.each(expr, function(attr_expr) {
            var attr_token = attr_expr.attr;
            that.bind(attr_token + "." + hash, $.proxy(classbinding, that, el));
          });
        }
      }
      classbinding.call(that, el);
      
    }
    return "<div" 
    + can.view.hook(hookupfunc)
    + " data-replace='true'/>";
  });

  /**
    Add a live bound attribute to an element, avoiding buggy CanJS attribute interpolations.
    Usage:
    {{#withattr attrname attrvalue attrname attrvalue...}}<element/>{{/withattr}} to apply to the child element
    {{{withattr attrname attrvalue attrname attrvalue...}}} to apply to the parent element a la XSLT <xsl:attribute>. Note the triple braces!
    attrvalue can take mustache tokens, but they should be backslash escaped.
  */
  Mustache.registerHelper("withattr", function() {
    var args = can.makeArray(arguments).slice(0, arguments.length - 1)
    , options = arguments[arguments.length - 1]
    , attribs = []
    , that = this.___st4ck ? this[this.length-1] : this
    , data = can.extend({}, that)
    , hash = quickHash(args.join("-"), quickHash(that._cid)).toString(36)
    , attr_count = 0;

    var hook = can.view.hook(function(el, parent, view_id) {
      var content = options.fn(that);

      if(content) {
        var frag = can.view.frag(content, parent);
        var $newel = $(frag.querySelector("*"));
        var newel = $newel[0];

        el.parentNode ? el.parentNode.replaceChild(newel, el) : $(parent).append($newel);
        el = newel;
      } else {
        //we are inside the element we want to add attrs to.
        var p = el.parentNode;
        p.removeChild(el);
        el = p;
      }

      function sub_all(el, ev, newVal, oldVal) {
        var $el = $(el);
        can.each(attribs, function(attrib) {
          $el.attr(attrib.name, $("<div>").html(can.view.render(attrib.value, data)).html());
        });
      }

      for(var i = 0; i < args.length - 1; i += 2) {
        var attr_name = args[i];
        var attr_tmpl = args[i + 1];
        //set up bindings where appropriate
        attr_tmpl = attr_tmpl.replace(/\{[^\}]*\}/g, function(match, offset, string) {
          var token = match.substring(1, match.length - 1);
          if(typeof data[token] === "function") {
            data[token].bind && data[token].bind("change." + hash, $.proxy(sub_all, that, el));
            data[token] = data[token].call(that);
          }

          that.bind && that.bind(token + "." + hash, $.proxy(sub_all, that, el));

          return "{" + match + "}";
        });
        can.view.mustache("withattr_" + hash + "_" + (++attr_count), attr_tmpl);
        attribs.push({name : attr_name, value : "withattr_" + hash + "_" + attr_count });
      }

      sub_all(el);

    });

    return "<div"
    + hook
    + " data-replace='true'/>";
  });


  var controlslugs = function() {
    var slugs = [];
    slugs.push((this.title && this.title.length > 15 )? this.title.substr(0, 15) + "..." : this.title);
    can.each(this.implementing_controls, function(val) {
      slugs.push.apply(slugs, controlslugs.call(this));
    });
    return slugs;
  };

  var countcontrols = function() {
    var slugs = [];
    can.each(this.linked_controls, function() {
      slugs.push.apply(slugs, controlslugs.apply(this));
    });
    return slugs.length;
  };

  Mustache.registerHelper("controlscount", countcontrols);

  Mustache.registerHelper("controlslugs", function() {
    var slugs = [];
    can.each(this.linked_controls, function() {
      slugs.push.apply(slugs, controlslugs.apply(this)); 
    });
    return slugs.join(arguments.length > 1 ? arguments[0] : " ");
  });

$.each({
	"rcontrols" : "RegControl"
	, "ccontrols" : "Control"
}, function(key, val) {
  Mustache.registerHelper(key, function(obj, options) {
    var implementing_control_ids = []
    , ctls_list = obj.linked_controls;

    can.each(ctls_list, function(ctl) {
      var ctl_model = namespace.CMS.Models[val].findInCacheById(ctl.id);
      if(ctl_model && ctl_model.implementing_controls && ctl_model.implementing_controls.length) {
        implementing_control_ids = implementing_control_ids.concat(
          can.map(ctl_model.implementing_controls, function(ictl) { return ictl.id })
        );
      }
    });

    return can.map(
      $(ctls_list).filter( 
        function() {
          return $.inArray(this.id, implementing_control_ids) < 0;
        })
      , function(ctl) { return options.fn({ foo_controls : namespace.CMS.Models[val].findInCacheById(ctl.id) }); }
    )
    .join("\n");
  });
});

Mustache.registerHelper("if_equals", function(val1, val2, options) {
  var that = this, _val1, _val2;
  function exec() {
    if(_val1 == _val2) return options.fn(options.contexts);
    else return options.inverse(options.contexts);
  }
    if(typeof val1 === "function") { 
      if(val1.isComputed) {
        val1.bind("change", function(ev, newVal, oldVal) {
          _val1 = newVal;
          return exec();
        });
      }
      _val1 = val1.call(this);
    } else {
      _val1 = val1;
    }
    if(typeof val2 === "function") { 
      if(val2.isComputed) {
        val2.bind("change", function(ev, newVal, oldVal) {
          _val2 = newVal;
          exec();
        });
      }
      _val2 = val2.call(this);
    } else {
      _val2 = val2;
    }

  return exec();
});

Mustache.registerHelper("if_match", function(val1, val2, options) {
  var that = this
  , _val1 = resolve_computed(val1)
  , _val2 = resolve_computed(val2);
  function exec() {
    var re = new RegExp(_val2);
    if(re.test(_val1)) return options.fn(options.contexts);
    else return options.inverse(options.contexts);
  }
  return exec();
});

Mustache.registerHelper("in_array", function(needle, haystack, options) {
  needle = resolve_computed(needle);
  haystack = resolve_computed(haystack);

  return options[~can.inArray(needle, haystack) ? "fn" : "inverse"](options.contexts);
});

Mustache.registerHelper("if_null", function(val1, options) {
  var that = this, _val1;
  function exec() {
    if(_val1 == null) return options.fn(that);
    else return options.inverse(that);
  }
    if(typeof val1 === "function") { 
      if(val1.isComputed) {
        val1.bind("change", function(ev, newVal, oldVal) {
          _val1 = newVal;
          return exec();
        });
      }
      _val1 = val1.call(this);
    } else {
      _val1 = val1;
    }
  return exec();
});

can.each(["firstexist", "firstnonempty"], function(fname) {
  Mustache.registerHelper(fname, function() {
    var args = can.makeArray(arguments).slice(0, arguments.length - 1);
    for(var i = 0; i < args.length; i++) {
      var v = args[i];
      v = resolve_computed(v);
      if(v != null && (fname === "firstexist" || !!(v.toString().trim().replace(/&nbsp;|\s|<br *\/?>/g, "")))) return v.toString();
    }
    return "";
  });
});

Mustache.registerHelper("pack", function() {
  var options = arguments[arguments.length - 1];
  var objects = can.makeArray(arguments).slice(0, arguments.length - 1);
  var pack = {};
  can.each(objects, function(obj, i) {
      if(typeof obj === "function") {
          objects[i] = obj = obj();
      }
    // if(obj instanceof can.Observe) {
    //   obj.bind("change", function(ev, attr, how, newVal, oldVal) {
    //     var tokens, idx, subobj;
    //     switch(how) {
    //     case "remove":
    //     case "add":
    //     tokens = attr.split(".");
    //     idx = tokens.pop();
    //     subobj = can.getObject(tokens.join("."), pack);
    //     subobj && (subobj instanceof can.Observe.List 
    //       ? subobj.splice.apply(subobj, how === "remove" ? [+idx, 1] : [+idx, 0, newVal])
    //       : pack.attr(attr, newVal));
    //     break;
    //     default:          
    //     pack.attr(attr, newVal);
    //     }
    //   });
    // }
    if(obj._data) {
      obj = obj._data;
    }
    for(var k in obj) {
      if(obj.hasOwnProperty(k)) {
        pack[k] = obj[k];
      }
    }
  });
  if(options.hash) {
    for(var k in options.hash) {
      if(options.hash.hasOwnProperty(k)) {
        pack[k] = options.hash[k];
      }
    }
  }
  //pack.attr("packed", pack.serialize()); //account for Can 1.1.3 not constructing context stack properly
  pack = new can.Observe(pack);
  var retval = options.fn(pack);
  return retval;
});


Mustache.registerHelper("is_beta", function(){
  var options = arguments[arguments.length - 1];
  if($(document.body).hasClass('BETA')) return options.fn(this);
  else return options.inverse(this);
});

Mustache.registerHelper("if_page_type", function(page_type, options) {
  var options = arguments[arguments.length - 1];
  if (window.location.pathname.split('/')[1] == page_type)
    return options.fn(this);
  else
    return options.inverse(this);
});

// Render a named template with the specified context, serialized and
// augmented by 'options.hash'
Mustache.registerHelper("render", function(template, context, options) {
  if(!options) {
    options = context;
    context = this;
  }

  if(typeof context === "function") {
    context = context();
  }

  if(typeof template === "function") {
    template = template();
  }

  context = $.extend({}, context.serialize ? context.serialize() : context);

  if (options.hash) {
    for(var k in options.hash) {
      if(options.hash.hasOwnProperty(k)) {
        context[k] = options.hash[k];
        if (typeof context[k] == "function")
          context[k] = context[k]();
      }
    }
  }

  var ret = can.view.render(template, context instanceof can.view.Scope ? context : new can.view.Scope(context));
  can.view.hookup(ret);
  return ret;
});

// Like 'render', but doesn't serialize the 'context' object, and doesn't
// apply options.hash
Mustache.registerHelper("renderLive", function(template, context, options) {
  if(!options) {
    options = context;
    context = this;
  } else {
    options.contexts = options.contexts.add(context);
  }

  if(typeof context === "function") {
    context = context();
  }

  if(typeof template === "function") {
    template = template();
  }
  options.hash && (options.contexts = options.contexts.add(options.hash));

  return can.view.render(template, options.contexts);
});

Mustache.registerHelper("render_hooks", function(hook, options) {

  return can.map(can.getObject(hook, GGRC.hooks) || [], function(hook_tmpl) {
    return can.Mustache.getHelper("renderLive", options.context).fn(hook_tmpl, options.contexts, options);
  }).join("\n");
});

function defer_render(tag_prefix, funcs, deferred) {
  var hook
    , tag_name = tag_prefix.split(" ")[0]
    ;

  tag_name = tag_name || "span";

  if(typeof funcs === "function") {
    funcs = { done : funcs };
  }

  function hookup(element, parent, view_id) {
    var $element = $(element)
    , f = function() {
      var g = deferred && deferred.state() === "rejected" ? funcs.fail : funcs.done
        , args = arguments
        , term = element.nextSibling
        , compute = can.compute(function() { return g.apply(this, args); }, this)
        ;

      if(element.parentNode) {
        can.view.live.html(element, compute, parent);
//        can.view.live.list(element, new can.Observe.List([arguments[0]]), g, this, element.parentNode);
      } else {
        $element.after(compute());
        if ($element.next().get(0)) {
          can.view.nodeLists.update($element.get(), $element.nextAll().get());
          $element.remove();
        }
      }
    };
    if (deferred) {
      deferred.done(f);
      if (funcs.fail) {
        deferred.fail(f);
      }
    }
    else
      setTimeout(f, 13);

    if(funcs.progress) {
      // You would think that we could just do $element.append(funcs.progress()) here
      //  but for some reason we have to hookup our own fragment.
      $element.append(can.view.hookup($("<div>").html(funcs.progress())).html());
    }
  }

  hook = can.view.hook(hookup);
  return ["<", tag_prefix, " ", hook, ">", "</", tag_name, ">"].join("");
}

Mustache.registerHelper("defer", function(prop, deferred, options) {
  var context = this;
  var tag_name;
  if (!options) {
    options = prop;
    prop = "result";
  }

  tag_name = (options.hash || {}).tag_name || "span";

  deferred = resolve_computed(deferred);
  typeof deferred === "function" && (deferred = deferred());

  return defer_render(tag_name, function(items) {
    var ctx = {};
    ctx[prop] = items;
    return options.fn(options.contexts.add(ctx));
  }, deferred);
});

Mustache.registerHelper("pbc_is_read_only", function() {
  var options = arguments[arguments.length - 1];
  if (window.location.pathname.split('/')[1] == 'pbc_lists')
    return options.inverse(this);
  else
    return options.fn(this);
});

Mustache.registerHelper("with_line_breaks", function(content) { 
  var value = typeof content === "function" ? content() : content;
  if (value && value.search(/<\w+[^>]*>/) < 0)
    return value.replace(/\n/g, "<br />");
  else
    return value;
});

Mustache.registerHelper("show_expander", function() {
  var options = arguments[arguments.length - 1]
  , args = can.makeArray(arguments).slice(0, arguments.length - 1)
  , disjunctions = [[]]
  , not = false;
  for(var i = 0; i < args.length; i++) {
    if(args[i] === "||") {
      disjunctions.push([]);
    } else if (args[i] === "!") {
      not = true;
    } else {
      disjunctions[disjunctions.length - 1].push(not ? { not : args[i] } : args[i]);
      not = false;
    }
  }

  return can.reduce(disjunctions, function(a, b) {
    return a || can.reduce(b, function(c, d) {
      if(!c)
        return false;

      var not = !!d.not;
      d = d.not ? d.not : d;

      typeof d === "function" && (d = d());

      var pred = (d && (d.length == null || d.length > 0));
      if(not) pred = !pred;
      return pred;
    }, true);
  }, false) ? options.fn(this) : options.inverse(this);
});

Mustache.registerHelper("allow_help_edit", function() {
  var options = arguments[arguments.length - 1];
  var instance = this && this.instance ? this.instance : options.context.instance;
  if (instance) {
    var action = instance.isNew() ? "create" : "update";
    if (Permission.is_allowed(action, "Help", null)) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  }
  return options.inverse(this);
});

Mustache.registerHelper("all", function(type, params, options) {
  var model = CMS.Models[type] || GGRC.Models[type]
  , $dummy_content = $(options.fn({}).trim()).first()
  , tag_name = $dummy_content.prop("tagName")
  , context = this.instance ? this.instance : this instanceof can.Model.Cacheable ? this : null
  , items_dfd, hook;

  if(!options) {
    options = params;
    params = {};
  } else {
    params = JSON.parse(resolve_computed(params));
  }

  function hookup(element, parent, view_id) {
    items_dfd.done(function(items){
      var val
      , $parent = $(element.parentNode)
      , $el = $(element);
      can.each(items, function(item) {
        $(can.view.frag(options.fn(item), parent)).appendTo(element.parentNode);
      });
      if($parent.is("select")
        && $parent.attr("name")
        && context
      ) {
        val = context.attr($parent.attr("name"));
        if(val) {
          $parent.find("option[value=" + val + "]").attr("selected", true);
        } else {
          context.attr($parent.attr("name").substr(0, $parent.attr("name").lastIndexOf(".")), items[0] || null);
        }
      }
      $parent.parent().find(":data(spinner)").each(function(i, el) {
        var spinner = $(el).data("spinner");
        spinner && spinner.stop();
      });
      $el.remove();
      //since we are removing the original live bound element, replace the
      // live binding reference to it, with a reference to the new 
      // child nodes. We assume that at least one new node exists.
      can.view.nodeLists.update($el.get(), $parent.children().get());
    });
    return element.parentNode;
  }

  if($dummy_content.attr("data-view-id")) {
    can.view.hookups[$dummy_content.attr("data-view-id")] = hookup;
  } else {
    hook = can.view.hook(hookup);
    $dummy_content.attr.apply($dummy_content, can.map(hook.split('='), function(s) { return s.replace(/'|"| /, "");}));
  }

  items_dfd = model.findAll(params);
  return "<" + tag_name + " data-view-id='" + $dummy_content.attr("data-view-id") + "'></" + tag_name + ">";
});

can.each(["page_object", "current_user"], function(fname) {
  Mustache.registerHelper("with_" + fname + "_as", function(name, options) {
    if(!options) {
      options = name;
      name = fname;
    }
    var page_object = (fname === "current_user" ? CMS.Models.Person.model(GGRC.current_user) : GGRC.page_instance());
    if(page_object) {
      var p = {};
      p[name] = page_object;
      options.contexts = options.contexts.add(p);
      return options.fn(options.contexts);
    } else {
      return options.inverse(options.contexts);
    }
  });
});

Mustache.registerHelper("role_checkbox", function(role, model, operation) {
  return [
    '<input type="checkbox" name="permissions."'
    , operation
    , '" value="'
    , model.model_singular
    , '"'
    , role.allowed(operation, model) ? ' checked="checked"' : ''
    , '>'
  ].join("");
});

Mustache.registerHelper("can_link_to_page_object", function(context, options) {
  if(!options) {
    options = context;
    context = options.context;
  }

  var page_type = GGRC.infer_object_type(GGRC.page_object);
  var context_id = null;
  if (page_type === CMS.Models.Program || !(context instanceof CMS.Models.Program)) {
    context_id = GGRC.page_object[page_type.table_singular].context ?
      GGRC.page_object[page_type.table_singular].context.id : null;
  } else {
    context_id = context.context ? context.context.id : null;
  }
  var join_model_name = GGRC.JoinDescriptor.join_model_name_for(
      page_type.shortName, context.constructor.shortName);
  if (join_model_name && Permission.is_allowed('create', join_model_name, context_id)) {
    return options.fn(options.contexts);
  } else {
    return options.inverse(options.contexts);
  }
});

Mustache.registerHelper("iterate", function() {
  var args = can.makeArray(arguments).slice(0, arguments.length - 1)
  , options = arguments[arguments.length - 1]

  return can.map(args, function(arg) {
    var ctx = options.contexts;
    return options.fn(ctx.add({iterator : typeof arg === "string" ? new String(arg) : arg }));
  }).join("");
});

Mustache.registerHelper("is_private", function(options) {
  var context = this;
  if(options.isComputed) {
    context = resolve_computed(options);
    options = arguments[1];
  }
  var private = context && context.attr('private');
  if (private) {
    return options.fn(context);
  }
  return options.inverse(context);
});

Mustache.registerHelper("option_select", function(object, attr_name, role, options) {
  var selected_option = object.attr(attr_name)
    , selected_id = selected_option ? selected_option.id : null
    , options_dfd = CMS.Models.Option.for_role(role)
    , tabindex = options.hash && options.hash.tabindex
    , tag_prefix = 'select class="span12"'
    ;

  function get_select_html(options) {
    return [
        '<select class="span12" model="Option" name="' + attr_name + '"'
      ,   tabindex ? ' tabindex=' + tabindex : ''
      , '>'
      , '<option value=""'
      ,   !selected_id ? ' selected=selected' : ''
      , '>---</option>'
      , can.map(options, function(option) {
          return [
            '<option value="', option.id, '"'
          ,   selected_id == option.id ? ' selected=selected' : ''
          , '>'
          ,   option.title
          , '</option>'
          ].join('');
        }).join('\n')
      , '</select>'
    ].join('');
  }

  return defer_render(tag_prefix, get_select_html, options_dfd);
});

Mustache.registerHelper("category_select", function(object, attr_name, category_type) {
  var selected_options = object[attr_name] || [] //object.attr(attr_name) || []
    , selected_ids = can.map(selected_options, function(selected_option) {
        return selected_option.id;
      })
    , options_dfd = CMS.Models[category_type].findAll()
    , tag_prefix = 'select class="span12" multiple="multiple"'
    ;

  function get_select_html(options) {
    return [
        '<select class="span12" multiple="multiple"'
      ,   ' model="' + category_type + '"'
      ,   ' name="' + attr_name + '"'
      , '>'
      , can.map(options, function(option) {
          return [
            '<option value="', option.id, '"'
          ,   selected_ids.indexOf(option.id) > -1 ? ' selected=selected' : ''
          , '>'
          ,   option.name
          , '</option>'
          ].join('');
        }).join('\n')
      , '</select>'
    ].join('');
  }

  return defer_render(tag_prefix, get_select_html, options_dfd);
});

Mustache.registerHelper("schemed_url", function(url) {
  if (url) {
    url = url.isComputed? url(): url;
    if (url && !url.match(/^[a-zA-Z]+:/)) {
        return (window.location.protocol === "https:" ? 'https://' : 'http://') + url;
    }
  }
  return url;
});

function when_attached_to_dom(el, cb) {
  // Trigger the "more" toggle if the height is the same as the scrollable area
  el = $(el);
  !function poll() {
    if (el.closest(document.documentElement).length) {
      cb();
    }
    else {
      setTimeout(poll, 100);
    }
  }();
}

Mustache.registerHelper("open_on_create", function(style) {
  return function(el) {
    when_attached_to_dom(el, function() {
      $(el).openclose("open");
    });
  };
});

Mustache.registerHelper("trigger_created", function() {
  return function(el) {
    when_attached_to_dom(el, function() {
      $(el).trigger("contentAttached");
    });
  };
});

Mustache.registerHelper("show_long", function() {
  return  [
      '<a href="javascript://" class="show-long"'
    , can.view.hook(function(el, parent, view_id) {
        el = $(el);

        var content = el.prevAll('.short');
        if (content.length) {
          !function hide() {
            // Trigger the "more" toggle if the height is the same as the scrollable area
            if (el[0].offsetHeight) {
              if (content[0].offsetHeight === content[0].scrollHeight) {
                el.trigger('click');
              }
            }
            else {
              // If there is an open/close toggle, wait until "that" is triggered
              var root = el.closest('.tree-item')
                , toggle;
              if (root.length && !root.hasClass('item-open') && (toggle = root.find('.openclose')) && toggle.length) {
                // Listen for the toggle instead of timeouts
                toggle.one('click', function() {
                  // Delay to ensure all event handlers have fired
                  setTimeout(hide, 0);
                });
              }
              // Otherwise just detect visibility
              else {
                setTimeout(hide, 100);
              }
            }
          }();
        }
      })
    , ">...more</a>"
  ].join('');
});

Mustache.registerHelper("using", function(options) {
  var refresh_queue = new RefreshQueue()
    , context
    , frame = new can.Observe()
    , args = can.makeArray(arguments)
    , i, arg;

  options = args.pop();
  context = options.contexts || this;

  if (options.hash) {
    for (i in options.hash) {
      if (options.hash.hasOwnProperty(i)) {
        arg = options.hash[i];
        arg = Mustache.resolve(arg);
        if (arg && arg.reify) {
          refresh_queue.enqueue(arg.reify());
          frame.attr(i, arg.reify());
        } else {
          frame.attr(i, arg);
        }
      }
    }
  }

  function finish() {
    return options.fn(options.contexts.add(frame));
  }

  return defer_render('span', finish, refresh_queue.trigger());
});

Mustache.registerHelper("with_mapping", function(binding, options) {
  var refresh_queue = new RefreshQueue()
    , context = arguments.length > 2 ? resolve_computed(options) : this
    , frame = new can.Observe()
    , loader
    , stack;

  if(!context) // can't find an object to map to.  Do nothing;
    return;

  loader = context.get_binding(binding);
  frame.attr(binding, loader.list);

  options = arguments[2] || options;

  function finish(list) {
    return options.fn(options.contexts.add(frame));
  }
  function fail(error) {
    return options.inverse(options.contexts.add({error : error}));
  }

  return defer_render('span', { done : finish, fail : fail }, loader.refresh_instances());
});


Mustache.registerHelper("person_roles", function(person, scope, options) {
  var roles_deferred = new $.Deferred()
    , refresh_queue = new RefreshQueue()
    ;

  if (!options) {
    options = scope;
    scope = null;
  }

  person = Mustache.resolve(person);
  person = person.reify();
  refresh_queue.enqueue(person);
  // Force monitoring of changes to `person.user_roles`
  person.attr("user_roles");
  refresh_queue.trigger().then(function() {
    var user_roles = person.user_roles.reify()
      , user_roles_refresh_queue = new RefreshQueue()
      ;
    user_roles_refresh_queue.enqueue(user_roles);
    user_roles_refresh_queue.trigger().then(function() {
      var roles = can.map(can.makeArray(user_roles), function(user_role) {
              return user_role.role.reify();
            })
        , roles_refresh_queue = new RefreshQueue()
        ;
      roles_refresh_queue.enqueue(roles.splice());
      roles_refresh_queue.trigger().then(function() {
        roles = can.map(can.makeArray(roles), function(role) {
          if (!scope || new RegExp(scope).test(role.scope)) {
            return role;
          }
        });
        roles_deferred.resolve(roles);
      });
    });
  });

  function finish(roles) {
    return options.fn({ roles: roles });
  }

  return defer_render('span', finish, roles_deferred);
});

Mustache.registerHelper("unmap_or_delete", function(instance, mappings) {
    instance = resolve_computed(instance);
    mappings = resolve_computed(mappings);
  if (mappings.indexOf(instance) > -1) {
    if (mappings.length == 1) {
      if (mappings[0] instanceof CMS.Models.Control)
        return "Unmap";
      else
        return "Delete";
    }
    else
      return "Unmap";// "Unmap and Delete"
  } else
    return "Unmap";
});

Mustache.registerHelper("result_direct_mappings", function(
    bindings, parent_instance, options) {
  bindings = Mustache.resolve(bindings);
  bindings = resolve_computed(bindings);
  parent_instance = Mustache.resolve(parent_instance);
  var has_direct_mappings = false
    , has_external_mappings = false
    , mappings_type = ""
    , i
    ;

  if (bindings && bindings.length > 0) {
    for (i=0; i<bindings.length; i++) {
      if (bindings[i].instance && parent_instance
          && bindings[i].instance.reify() === parent_instance.reify())
        has_direct_mappings = true;
      else {
        has_external_mappings = true;
      }
    }
  }
  mappings_type = has_direct_mappings ? 
      (has_external_mappings ? "Dir & Ext" : "Dir") : "Ext";
  options.context.mappings_type = mappings_type 
  return options.fn(options.contexts);
});

Mustache.registerHelper("if_result_has_extended_mappings", function(
    bindings, parent_instance, options) {
  //  Render the `true` / `fn` block if the `result` exists (in this list)
  //  due to mappings other than directly to the `parent_instance`.  Otherwise
  //  Render the `false` / `inverse` block.
  bindings = Mustache.resolve(bindings);
  bindings = resolve_computed(bindings);
  parent_instance = Mustache.resolve(parent_instance);
  var has_extended_mappings = false
    , i
    ;

  if (bindings && bindings.length > 0) {
    for (i=0; i<bindings.length; i++) {
      if (bindings[i].instance && parent_instance
          && bindings[i].instance.reify() !== parent_instance.reify())
        has_extended_mappings = true;
    }
  }

  if (has_extended_mappings)
    return options.fn(options.contexts);
  else
    return options.inverse(options.contexts);
});

Mustache.registerHelper("each_with_extras_as", function(name, list, options) {
  //  Iterate over `list` and render the provided block with additional
  //  variables available in the context, specifically to enable joining with
  //  commas and using "and" in the right place.
  //
  //  * `<name>`: Instead of rendering with the item as the current context,
  //      make the item available at the specified `name`
  //  * index
  //  * length
  //  * isFirst
  //  * isLast
  name = Mustache.resolve(name);
  list = Mustache.resolve(list);
  list = resolve_computed(list);
  var i
    , output = []
    , frame
    , length = list.length
    ;
  for (i=0; i<length; i++) {
    frame = {
      index : i
      , isFirst : i === 0
      , isLast : i === length - 1
      , isSecondToLast : i === length - 2
      , length : length
    };
    frame[name] = list[i];
    output.push(options.fn(new can.Observe(frame)));

    //  FIXME: Is this legit?  It seems necessary in some cases.
    //context = $.extend([], options.contexts, options.contexts.concat([frame]));
    //output.push(options.fn(context));
    // ...or...
    //contexts = options.contexts.concat([frame]);
    //contexts.___st4ck3d = true;
    //output.push(options.fn(contexts));
  }
  return output.join("");
});

Mustache.registerHelper("link_to_tree", function() {
  var args = [].slice.apply(arguments)
    , options = args.pop()
    , link = []
    ;

  args = can.map(args, Mustache.resolve);
  args = can.map(args, function(stub) { return stub.reify(); });
  link.push("#" + args[0].constructor.table_singular + "_widget");
  //  FIXME: Add this back when extended-tree-routing is enabled
  //for (i=0; i<args.length; i++)
  //  link.push(args[i].constructor.table_singular + "-" + args[i].id);
  return link.join("/");
});

Mustache.registerHelper("date", function(date) {
  var m = moment(new Date(date.isComputed ? date() : date))
    , dst = m.isDST()
    ;
  return m.zone(dst ? "-0700" : "-0800").format("MM/DD/YYYY hh:mm:ssa") + " " + (dst ? 'PDT' : 'PST');
});

/**
 * Checks permissions.
 * Usage:
 *  {{#is_allowed ACTION [ACTION2 ACTION3...] RESOURCE_TYPE_STRING context=CONTEXT_ID}} content {{/is_allowed}}
 *  {{#is_allowed ACTION RESOURCE_INSTANCE}} content {{/is_allowed}}
 */
var allowed_actions = ["create", "read", "update", "delete", "view_object_page"];
Mustache.registerHelper("is_allowed", function() {
  var args = Array.prototype.slice.call(arguments, 0)
    , actions = []
    , resource
    , resource_type
    , context_unset = {}
    , context_id = context_unset
    , context_override
    , options = args[args.length-1]
    , passed = true
    ;

  // Resolve arguments
  can.each(args, function(arg, i) {
    arg = typeof arg === 'function' && arg.isComputed ? arg() : arg;

    if (typeof arg === 'string' && can.inArray(arg, allowed_actions) > -1) {
      actions.push(arg);
    }
    else if (typeof arg === 'string') {
      resource_type = arg;
    }
    else if (typeof arg === 'object' && arg instanceof can.Model) {
      resource = arg;
    }
  });
  if (options.hash && options.hash.hasOwnProperty("context")) {
    context_id = options.hash.context;
    if (typeof context_id === 'function' && context_id.isComputed)
      context_id = context_id();
    //  Using `context=null` in Mustache templates, when `null` is not defined,
    //  causes `context_id` to be `""`.
    if (context_id === "" || context_id === undefined)
      context_id = null;
    else if (context_id === 'for' || context_id === 'any') {
      context_override = context_id;
      context_id = undefined;
    }
  }

  if (resource_type && context_id === context_unset) {
    throw new Error(
        "If `resource_type` is a string, `context` must be explicit");
  }
  if (actions.length === 0) {
    throw new Error(
        "Must specify at least one action");
  }

  if (resource) {
    resource_type = resource.constructor.shortName;
    context_id = resource.context ? resource.context.id : null;
  }

  // Check permissions
  can.each(actions, function(action) {
    if (context_id !== undefined) {
      passed = passed && Permission.is_allowed(action, resource_type, context_id);
    }
    if (passed && context_override === 'for' && resource) {
      passed = passed && Permission.is_allowed_for(action, resource);
    }
    else if (passed && context_override === 'any' && resource_type) {
      passed = passed && Permission.is_allowed_any(action, resource_type);
    }
  });

  return passed
    ? options.fn(options.contexts || this)
    : options.inverse(options.contexts || this)
    ;
});

Mustache.registerHelper("is_allowed_all", function(action, instances, options) {
  var passed = true;

  action = resolve_computed(action);
  instances = resolve_computed(instances);

  can.each(instances, function(instance) {
    var resource_type
      , context_id
      ;

    resource_type = instance.constructor.shortName;
    context_id = instance.context ? instance.context.id : null;

    passed = passed && Permission.is_allowed(action, resource_type, context_id);
  });

  if (passed)
    return options.fn(options.contexts || this);
  else
    return options.inverse(options.contexts || this);
});

Mustache.registerHelper("is_allowed_to_map", function(source, target, options) {
  //  For creating mappings, we only care if the user can create instances of
  //  the join model.
  //  - `source` must be a model instance
  //  - `target` must be the name of the target model
  //
  //  FIXME: This should actually iterate through all applicable join models
  //    and return success if any one matches.
  var target_type
    , resource_type
    , context_id
    , can_map
    ;

  source = resolve_computed(source);
  target = resolve_computed(target);

  if (target instanceof can.Model)
    target_type = target.constructor.shortName;
  else
    target_type = target;

  //if (!(source instanceof can.Model)) {
  //  //  If `source` is not a model instance, assume they want to link to the
  //  //  page object.
  //  options = target;
  //  target = source;
  //  source = GGRC.page_instance();
  //}

  if (target_type === 'Cacheable') {
    //  FIXME: This will *not* work for customizable roles -- this *only* works
    //    for the limited default roles as of 2013-10-07, and assumes that:
    //    1.  All `Cacheable` mappings (e.g. where you might map multiple types
    //        to a single object) are in the `null` context; and
    //    2.  If a user has permission for creating `Relationship` objects in
    //        the `null` context, they have permission for creating all mapping
    //        objects in `null` context.
    can_map = Permission.is_allowed('create', 'Relationship', null);
  }
  else {
    resource_type = GGRC.JoinDescriptor.join_model_name_for(
      source.constructor.shortName, target_type);

    context_id = source.context ? source.context.id : null;
    if (!(source instanceof CMS.Models.Program)
        && target instanceof CMS.Models.Program)
      context_id = target.context ? target.context.id : null;

    // We should only map objects that have join models
    can_map = (!(options.hash && options.hash.join) || resource_type)
      && Permission.is_allowed('create', resource_type, context_id);
  }
  if (can_map)
    return options.fn(options.contexts || this);
  else
    return options.inverse(options.contexts || this);
});

function resolve_computed(maybe_computed) {
  return (typeof maybe_computed === "function" && maybe_computed.isComputed) ? resolve_computed(maybe_computed()) : maybe_computed;
}

Mustache.registerHelper("attach_spinner", function(spin_opts, styles) {
  spin_opts = resolve_computed(spin_opts);
  styles = resolve_computed(styles);
  spin_opts = typeof spin_opts === "string" ? JSON.parse(spin_opts) : {};
  styles = typeof styles === "string" ? styles : "";
  return function(el) {
    var spinner = new Spinner(spin_opts).spin();
    $(el).append($(spinner.el).attr("style", $(spinner.el).attr("style") + ";" + styles)).data("spinner", spinner);
  };
});

Mustache.registerHelper("determine_context", function(page_object, target) {
  if (page_object.constructor.shortName == "Program") {
    return page_object.context ? page_object.context.id : null;
  } else if (target.constructor.shortName == "Program") {
    return target.context ? target.context.id : null;
  }
  return page_object.context ? page_object.context.id : null;
});

Mustache.registerHelper("json_escape", function(obj, options) {
  return (""+(resolve_computed(obj) || ""))
    .replace(/"/g, '\\"')
    //  FUNFACT: JSON does not allow wrapping strings with single quotes, and
    //    thus does not allow backslash-escaped single quotes within strings.
    //    E.g., make sure attributes use double quotes, or use character
    //    entities instead -- but these aren't replaced by the JSON parser, so
    //    the output is not identical to input (hence, not using them now.)
    //.replace(/'/g, "\\'")
    //.replace(/"/g, '&#34;').replace(/'/g, "&#39;")
    .replace(/\n/g, "\\n").replace(/\r/g, "\\r");
});

can.each({
  "localize_date" : "MM/DD/YYYY"
  , "localize_datetime" : "MM/DD/YYYY hh:mm:ss A"
}, function(tmpl, fn) {
  Mustache.registerHelper(fn, function(date) {
    date = resolve_computed(date);
    return date ? moment(date).format(tmpl) : "";
  });
});

Mustache.registerHelper("instance_ids", function(list, options) {
  //  `instance_ids` is used only to extract a comma-separated list of
  //  instance `id` values for use by `Export Controls` link in
  //  `assets/mustache/controls/tree_footer.mustache`
  var ids;
  list = resolve_computed(Mustache.resolve(list));
  if (list)
    ids = can.map(list, function(result) { return result.attr("instance.id"); });
  else
    ids = [];
  return ids.join(",");
});

Mustache.registerHelper("local_time_range", function(value, start, end, options) {
  var tokens = [];
  var sod;
  value = resolve_computed(value) || undefined;
  //  Calculate "start of day" in UTC and offsets in local timezone
  sod = moment(value).startOf("day").utc();
  start = moment(value).startOf("day").add(moment(start, "HH:mm").diff(moment("0", "Y")));
  end = moment(value).startOf("day").add(moment(end, "HH:mm").diff(moment("0", "Y")));

  function selected(time) {
    if(time
      && value
      && time.hours() === value.getHours()
      && time.minutes() === value.getMinutes()
    ) {
      return " selected='true'";
    } else {
      return "";
    }
  }

  while(start.isBefore(end) || start.isSame(end)) {
    tokens.push("<option value='", start.diff(sod), "'", selected(start), ">", start.format("hh:mm A"), "</option>\n");
    start.add(1, "hour");
  }
  return new Mustache.safeString(tokens.join(""));
});

Mustache.registerHelper("mapping_count", function(instance) {
  var args = can.makeArray(arguments)
    , mappings = args.slice(1, args.length - 1)
    , options = args[args.length-1]
    , root = options.contexts.attr('__mapping_count')
    , refresh_queue = new RefreshQueue()
    , mapping
    , dfd
    ;
  instance = resolve_computed(args[0]);

  // Find the most appropriate mapping
  for (var i = 0; i < mappings.length; i++) {
    if (instance.get_binding(mappings[i])) {
      mapping = mappings[i];
      break;
    }
  }

  if(!root) {
    root = new can.Observe();
    get_observe_context(options.contexts).attr("__mapping_count", root);
  }

  function update() {
    return options.fn(''+root.attr(mapping).attr('length'));
  }
  if (!root[mapping]) {
    root.attr(mapping, new can.Observe.List());
    root.attr(mapping).attr('loading', true);
    refresh_queue.enqueue(instance);
    dfd = refresh_queue.trigger()
      .then(function(instances) { return instances[0]; })
      .done(function(refreshed_instance) {
        if (refreshed_instance && refreshed_instance.get_binding(mapping)) {
          refreshed_instance.get_list_loader(mapping).done(function(list) {
            root.attr(mapping, list);
          });
        }
        else
          root.attr(mapping).attr('loading', false);
    });
  }

  var ret = defer_render('span', { done : update, progress : function() { return options.inverse(options.contexts); } }, dfd);
  return ret;
});

Mustache.registerHelper("visibility_delay", function(delay, options) {
  delay = resolve_computed(delay);

  return function(el) {
    setTimeout(function() {
      if ($(el.parentNode).is(':visible'))
        $(el).append(options.fn(options.contexts));
        can.view.hookup($(el).children());
    }, delay);
    return el;
  };
});

// Determines and serializes the roles for a user
var program_roles;
Mustache.registerHelper("infer_roles", function(instance, options) {
  instance = resolve_computed(instance);
  var state = options.contexts.attr("__infer_roles")
    , page_instance = GGRC.page_instance()
    , person = page_instance instanceof CMS.Models.Person ? page_instance : null
    , init_state = function() {
        !state.roles && state.attr({
            status: 'loading'
          , count: 0
          , roles: new can.Observe.List()
        });
      }
    ;

  if(!state) {
    state = new can.Observe();
    options.context.attr("__infer_roles", state);
  }

  if (!state.attr('status')) {  
    if (person) {
      init_state();

      // Check for contact
      if (instance.contact && instance.contact.id === person.id) {
        state.attr('roles').push('Contact');
      }

      // Check for Audit roles
      if (instance instanceof CMS.Models.Audit) {
        var requests = instance.requests || new can.Observe.List()
          , refresh_queue = new RefreshQueue()
          ;

        refresh_queue.enqueue(requests.reify());
        refresh_queue.trigger().then(function(requests) {
          can.each(requests, function(request) {
            var responses = request.responses || new can.Observe.List()
              , refresh_queue = new RefreshQueue()
              ;

            refresh_queue.enqueue(responses.reify());
            refresh_queue.trigger().then(function(responses) {
              can.each(responses, function(response) {
                if (response.contact && response.contact.id === person.id
                    && !~can.inArray('Response Contact', state.attr('roles'))) {
                  state.attr('roles').push('Response Contact');
                }
              })
            });

            if (request.assignee && request.assignee.id === person.id
                && !~can.inArray('Request Assignee', state.attr('roles'))) {
              state.attr('roles').push('Request Assignee');
            };
          });
        });
      }

      // Check for assessor roles
      if (instance.attr('principal_assessor') && instance.principal_assessor.id === person.id) {
        state.attr('roles').push('Principal Assessor');
      }
      if (instance.attr('secondary_assessor') && instance.secondary_assessor.id === person.id) {
        state.attr('roles').push('Secondary Assessor');
      }

      // Check for people
      if (instance.people && ~can.inArray(person.id, $.map(instance.people, function(person) { return person.id; }))) {
        state.attr('roles').push('Mapped');
      }

      // Check for ownership
      if (instance.owners && ~can.inArray(person.id, $.map(instance.owners, function(person) { return person.id; }))) {
        state.attr('roles').push('Owner');
      }

      // Check for authorizations
      if (instance instanceof CMS.Models.Program && instance.context && instance.context.id) {
        person.get_list_loader("authorizations").done(function(authorizations) {
          authorizations = can.map(authorizations, function(auth) {
            if (auth.instance.context && auth.instance.context.id === instance.context.id) {
              return auth.instance;
            }
          });
          !program_roles && (program_roles = CMS.Models.Role.findAll({ scope__in: "Private Program,Audit" }));
          program_roles.done(function(roles) {
            can.each(authorizations, function(auth) {
              var role = CMS.Models.Role.findInCacheById(auth.role.id);
              role && state.attr('roles').push(role.name);
            });
          });
        });
      }
    }
    // When we're not on a profile page
    else {
      // Check for ownership
      if (instance.owners && ~can.inArray(GGRC.current_user.id, $.map(instance.owners, function(person) { return person.id; }))) {
        init_state();
        state.attr('roles').push('Yours');
      }
    }
  }

  // Return the result
  if (!state.attr('roles') || state.attr('status') === 'failed') {
    return '';
  }
  else if (state.attr('roles').attr('length') === 0 && state.attr('status') === 'loading') {
    return options.inverse(options.contexts);
  }
  else {
    if (state.attr('roles').attr('length')) {
      var result = [];
      can.each(state.attr('roles'), function(role) {
        result.push(options.fn(role));
      });
      return result.join('');
    }
  }
});

function get_observe_context(scope) {
  if(!scope) return null;
  if(scope._context instanceof can.Observe) return scope._context;
  return get_observe_context(scope._parent);
}


// Uses search to find the counts for a model type
Mustache.registerHelper("global_count", function(model_type, options) {
  model_type = resolve_computed(model_type);
  var state = options.contexts.attr("__global_count")
    ;

  if(!state) {
    state = new can.Observe();
    get_observe_context(options.contexts).attr("__global_count", state);
  }

  if (!state.attr('status')) {
    state.attr('status', 'loading');

    var model = CMS.Models[model_type]
      , update_count = function(ev, instance) {
          if (!instance || instance instanceof model) {
            GGRC.Models.Search.counts_for_types(null, [model_type]).done(function(result) {
              state.attr({
                  status: 'loaded'
                , count: result.counts[model_type]
              });
            });
          }
        }
      ;

    update_count();
    if (model) {
      model.bind('created', update_count);
      model.bind('destroyed', update_count);
    }
  }

  // Return the result
  if (state.attr('status') === 'failed') {
    return '';
  }
  else if (state.attr('status') === 'loading' || state.attr('count') === undefined) {
    return options.inverse(options.contexts);
  }
  else {
    return options.fn(state.attr('count'));
  }
});

Mustache.registerHelper("is_dashboard", function(options) {
  if (/dashboard/.test(window.location))
    return options.fn(options.contexts);
  else
    return options.inverse(options.contexts);
});

Mustache.registerHelper("is_profile", function(parent_instance, options) {
  var instance;
  if (options)
    instance = resolve_computed(parent_instance);
  else
    options = parent_instance;

  if (GGRC.page_instance() instanceof CMS.Models.Person && (!instance || instance.constructor.shortName !== 'DocumentationResponse'))
    return options.fn(options.contexts);
  else
    return options.inverse(options.contexts);
});

Mustache.registerHelper("person_owned", function(owner_id, options) {
  owner_id = resolve_computed(owner_id);
  var page_instance = GGRC.page_instance();
  if (!(page_instance instanceof CMS.Models.Person) || (owner_id && page_instance.id === owner_id))
    return options.fn(options.contexts);
  else
    return options.inverse(options.contexts);
});

Mustache.registerHelper("default_audit_title", function(title, program, options) {
  var computed_title = title()
    , computed_program = resolve_computed(program)
    , default_title
    , index = 1
    ;
  
  if(typeof computed_program === 'undefined'){
    // Mark the title to be populated when computed_program is defined,
    // returning an empty string here would disable the save button.
    return 'undefined'; 
  }
  if(typeof computed_title !== 'undefined' && computed_title !== 'undefined'){
    return computed_title;
  }
  program = resolve_computed(program) || {title : "program"};
  
  default_title = new Date().getFullYear() + ": " + program.title + " - Audit";  
  
  // Count the current number of audits with default_title
  $.map(CMS.Models['Audit'].cache, function(audit){
    if(audit.title && audit.title.indexOf(default_title) === 0){
      index += 1;
    }
  });
  return new Date().getFullYear() + ": " + program.title + " - Audit " + index;
});

Mustache.registerHelper('param_current_location', function() {
  return GGRC.current_url_compute();
});

Mustache.registerHelper("sum", function() {
  var sum = 0;
  for (var i = 0; i < arguments.length - 1; i++) {
    sum += parseInt(resolve_computed(arguments[i]), 10);
  }
  return ''+sum;
});

Mustache.registerHelper("to_class", function(prop, delimiter, options) {
  prop = resolve_computed(prop);
  delimiter = (arguments.length > 2 && resolve_computed(delimiter)) || '-';
  return prop.toLowerCase().replace(/[\s\t]+/g, delimiter);
});

/*
  Evaluates multiple helpers as if they were a single condition
  
  Each new statement is begun with a newline-prefixed string. The type of logic 
  to apply as well as whether it should be a truthy or falsy evaluation may also 
  be included with the statement in addition to the helper name.

  Currently, if_helpers only supports Disjunctive Normal Form. All "and" statements are grouped, 
  groups are split by "or" statements.

  All hash arguments (some_val=37) must go in the last line and should be prefixed by the 
  zero-based index of the corresponding helper. This is necessary because all hash arguments 
  are required to be the final arguments for a helper. Here's an example:
    _0_some_val=37 would pass some_val=37 to the first helper.

  Statement syntax:
    '\
    [LOGIC] [TRUTHY_FALSY]HELPER_NAME' arg1 arg2 argN

  Defaults:
    LOGIC = and (accepts: and or)
    TRUTHY_FALSEY = # (accepts: # ^)
    HELPER_NAME = some_helper_name

  Example:
    {{#if_helpers '\
      #if_match' page_object.constructor.shortName 'Project' '\
      and ^if_match' page_object.constructor.shortName 'Audit|Program|Person' '\
    ' _1_hash_arg_for_second_statement=something}}
      matched all conditions
    {{else}}
      failed
    {{/if_helpers}}
*/
Mustache.registerHelper("if_helpers", function() {
  var args = arguments
    , options = arguments[arguments.length - 1]
    , helper_result
    , helper_options = can.extend({}, options, {
        fn: function() { helper_result = 'fn'; }
      , inverse: function() { helper_result = 'inverse'; }
      })
    ;

  // Parse statements
  var statements = []
    , statement
    , match
    , disjunctions = []
    ;
  can.each(args, function(arg, i) {
    if (i < args.length - 1) {
      if (typeof arg === 'string' && arg.match(/^\n\s*/)) {
        if(statement) {
          if(statement.logic === "or") {
            disjunctions.push(statements);
            statements = []
          }
          statements.push(statement);
        }
        if (match = arg.match(/^\n\s*((and|or) )?([#^])?(\S+?)$/)) {
          statement = {
              fn_name: match[3] === '^' ? 'inverse' : 'fn'
            , helper: Mustache.getHelper(match[4], options.context)
            , args: []
            , logic: match[2] === 'or' ? 'or' : 'and'
          };

          // Add hash arguments
          if (options.hash) {
            var hash = {}
              , prefix = '_' + statements.length + '_'
              , prop
              ;
            for (prop in options.hash) {
              if (prop.indexOf(prefix) === 0) {
                hash[prop.substr(prefix.length)] = options.hash[prop];
              }
            }
            for (prop in hash) {
              statement.hash = hash;
              break;
            } 
          }
        }
        else
          statement = null;
      }
      else if (statement) {
        statement.args.push(arg);
      }
    }
  });
  if(statement) {
    if(statement.logic === "or") {
      disjunctions.push(statements);
      statements = []
    }
    statements.push(statement);
  }
  disjunctions.push(statements);

  if (disjunctions.length) {
    // Evaluate statements
    var result = can.reduce(disjunctions, function(disjunctive_result, conjunctions) {
      if(disjunctive_result)
        return true;

      var conjunctive_result = can.reduce(conjunctions, function(current_result, stmt) {
        if(!current_result)
          return false; //short circuit

        helper_result = null;
        stmt.helper.fn.apply(stmt.helper, stmt.args.concat([
          can.extend({}, helper_options, { hash: stmt.hash || helper_options.hash })
        ]));
        helper_result = helper_result === stmt.fn_name;
        return current_result && helper_result;
      }, true);
      return disjunctive_result || conjunctive_result;
    }, false);

    // Execute based on the result
    if (result) {
      return options.fn(options.contexts);
    }
    else {
      return options.inverse(options.contexts);
    }
  }
});

Mustache.registerHelper("with_model_as", function(var_name, model_name, options) {
  var frame = {};
  model_name = resolve_computed(Mustache.resolve(model_name));
  frame[var_name] = CMS.Models[model_name];
  return options.fn(options.contexts.add(frame));
});

Mustache.registerHelper("private_program_owner", function(instance, modal_title, options) {
  var state = options.contexts.attr('__private_program_owner');
  if (resolve_computed(modal_title).indexOf('New ') === 0) {
    return GGRC.current_user.email;
  }
  else {
    var loader = resolve_computed(instance).get_binding('authorizations');
    return $.map(loader.list, function(binding) {
      if (binding.instance.role.reify().attr('name') === 'ProgramOwner') {
        return binding.instance.person.reify().attr('email');
      }
    }).join(', ');
  }
});


// Determines whether the value matches one in the $.map'd list
// {{#if_in_map roles 'role.permission_summary' 'Mapped'}}
Mustache.registerHelper("if_in_map", function(list, path, value, options) {
  list = resolve_computed(list);

  if (!list.attr || list.attr('length')) {
    path = path.split('.');
    var map = $.map(list, function(obj) {
      can.each(path, function(prop) {
        obj = (obj && obj[prop]) || null;
      })
      return obj;
    });

    if (map.indexOf(value) > -1)
      return options.fn(options.contexts);
  }
  return options.inverse(options.contexts);
});

Mustache.registerHelper("with_auditors", function(instance, options) {
  var loader = resolve_computed(instance).get_binding('authorizations')
    , auditors = $.map(loader.list, function(binding) {
        if (binding.instance.role.reify().attr('name') === 'Auditor') {
          return {
            person: binding.instance.person.reify()
            , binding: binding.instance
          }
        }
      });
  options.contexts = options.contexts.add({"auditors": auditors});
  if(auditors.length > 0){
    return options.fn(options.contexts);
  }
  else{
    return options.inverse(options.contexts);
  }
});

Mustache.registerHelper("if_instance_of", function(inst, cls, options) {
  var result;
  cls = resolve_computed(cls);
  inst = resolve_computed(inst);

  if(typeof cls === "string") {
    cls = cls.split("|").map(function(c) {
      return CMS.Models[c];
    })
  } else if(typeof cls !== "function") {
    cls = [cls.constructor];
  } else {
    cls = [cls];
  }

  result = can.reduce(cls, function(res, c) {
    return res || inst instanceof c;
  }, false);

  return options[result ? "fn" : "inverse"](options.contexts);
});

Mustache.registerHelper("prune_context", function(options) {
  return options.fn(new can.view.Scope(options.context));
});

// Turns DocumentationResponse to Response
Mustache.registerHelper("type_to_readable", function(str, options){
  return str().replace(/([A-Z])/g, ' $1').split(' ').pop();
});

Mustache.registerHelper("mixed_content_check", function(url, options) {
  url = Mustache.getHelper("schemed_url", options.contexts).fn(url);
  if(window.location.protocol === "https:" && !/^https:/.test(url)) {
    return options.inverse(options.contexts);
  } else {
    return options.fn(options.contexts);
  }
});


Mustache.registerHelper("is_page_instance", function(instance, options){
  var instance = resolve_computed(instance)
    , page_instance = GGRC.page_instance()
    ;
  
  if(instance.type === page_instance.type && instance.id === page_instance.id){
    return options.fn(options.contexts);
  }
  else{
    return options.inverse(options.contexts);
  }
});

})(this, jQuery, can);
