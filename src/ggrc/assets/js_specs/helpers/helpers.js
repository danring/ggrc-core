!function() {

var jasmine_waitsFor = waitsFor;

// Add support for deferred to waits for
window.waitsFor = function(latch_function, optional_timeoutMessage, optional_timeout) {
  if (can.isDeferred(latch_function)) {
    var def = latch_function;
    latch_function = function() {
      return def.state() === 'resolved' || def.state() === 'rejected'
    }; 
  }
  return jasmine_waitsFor(latch_function, optional_timeoutMessage, optional_timeout);
};

var iframes = []
  , debug = false
  ;

can.Construct("jasmine.GGRC.Helpers", {
    // Loads an iframe to the given path
    //  load.done(function($, window) {
    //    this.destroy();
    //  });
    load : function(path) {
      var target = document.createElement('iframe')
        , $T
        ;

      $(target).css(debug ? { width: 1280, height: 720 } : { width: 0, height: 0 })
      document.body.appendChild(target);
      target.onload = function() {
        setTimeout(function() {
          if (target.contentWindow.$) {
            $T = target.contentWindow.$;
            target._loaded = true;
          }
          else {
            setTimeout(arguments.callee, 100);
          }
        }, 0);
      };
      target.src = path;

      // Set up deferred with destroy helper
      var def = new $.Deferred;
      setTimeout(function() {
        if (target._loaded && $T)
          def.resolve($T, target.contentWindow);
        else
          setTimeout(arguments.callee, 25);
      }, 25);
      def.destroy = function() {
        target._loaded = target._loaded || true;
        $T = $T || true;
        def.done(function() {
          !debug && $(target).remove();
        });
      };
      iframes.push(def);
      return def;
    }

    // Unloads all active iframes
  , unload : function() {
      can.each(iframes.slice(0), function(def) {
        def.destroy();
      });
      iframes = [];
    }

    // Returns a deferred that waits for a request to complete
    // waitsFor(success_or_error(function(s,e) { instance.save(s,e); }));
  , success_or_error : function(execute) {
      var def = new $.Deferred()
        , success = jasmine.createSpy()
        , error = jasmine.createSpy()
        ;

      def.success = success;
      def.error = error;
      execute(success, error);
      setTimeout(function() {
        if (success.callCount || error.callCount)
          def.resolve(success.callCount, error.callCount);
        else
          setTimeout(arguments.callee, 25);
      }, 0);

      return def;
    }
}, {});

}();
