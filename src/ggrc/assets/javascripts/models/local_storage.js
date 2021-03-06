/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

//= require can.jquery-all

// LocalStorage model, stubs AJAX requests to storage instead of going to the server.  Useful when a REST resource hasn't yet been implemented
// Adapted from an example in the CanJS documentation.  http://canjs.us/recipes.html

(function(can){

  // Base model to handle reading / writing to local storage
  can.Model("can.Model.LocalStorage", {
    makeFindOne : function( findOne ) {

      if(typeof findOne === "function" && this !== can.Model.LocalStorage) {
        return findOne;
      } else {
        return function( params, success, error ) {
          params = params || {};

            var def = new can.Deferred(),
                // Key to be used for local storage
                key = [this._shortName, params.id].join(":"),
                // Grab the current data, if any
                data = window.localStorage.getItem( key );

            // Bind success and error callbacks to the deferred
            def.then(success, error);

            // If we had existing local storage data...
            if ( data ) {

                // Create our model instance
                var instance = this.store[params.id] || this.model( JSON.parse( data ));

                // Resolve the deferred with our instance
                def.resolve( instance );

            // Otherwise hand off the deferred to the ajax request
            } else {
                def.reject({status : 404, responseText : "Object with id " + params.id + " was not found"});
            }
            return def;
        };
      }
    }
    , makeFindAll : function(findAll) {
      if(typeof findAll === "function" && this !== can.Model.LocalStorage) {
        return findAll;
      } else {
        return function(params, success, error) {
          var def = new can.Deferred()
          , key = [this._shortName, "ids"].join(":")
          , data = window.localStorage.getItem( key )
          , returns = new can.Model.List()
          , that = this;
          params = params || {};

          if(data) {
            can.each(JSON.parse(data), function(id) {
              if(params.id == null || params.id === id) {
                var k = [that._shortName, id].join(":")
                , d = window.localStorage.getItem( k );

                if(d) {
                  d = that.store[id] || JSON.parse(d);
                  var pkeys = Object.keys(params);
                  if(pkeys.length < 1 || can.filter(pkeys, function(k) {
                    return params[k] !== d[k];
                  }).length < 1) {
                    returns.push(that.model(d));
                  }
                }
              }
            });
          }

          def.resolve(returns);
          return def;
        };
      }
    }
    , makeCreate : function(create) {
      if(typeof create === "function" && this !== can.Model.LocalStorage) {
        return create;
      } else {
        return function(params) {
          var key = [this._shortName, "ids"].join(":")
            , data = window.localStorage.getItem( key )
            , newkey = 1
            , def = new can.Deferred()
            ;

            //add to list
          if(data) {
            data = JSON.parse(data);
            newkey = Math.max.apply(Math, data.concat([0])) + 1;
            data.push(newkey);
          } else {
            data = [newkey];
          }
          window.localStorage.setItem(key, JSON.stringify(data));

          //create new
          key = [this._shortName, newkey].join(":");
          var item = this.model(can.extend({id : newkey}, params));
          window.localStorage.setItem(key, JSON.stringify(item.serialize()));

          def.resolve(item);
          this.created && this.created(item);
          return def;
        };
      }
    }
    , makeUpdate : function(update) {
      if(typeof update === "function" && this !== can.Model.LocalStorage) {
        return update;
      } else {
        return function(id, params) {
          var key = [this._shortName, id].join(":")
            , data = window.localStorage.getItem( key )
            , def = new can.Deferred()
            ;

          if(data) {
            data = JSON.parse(data);
            params._removedKeys && can.each(params._removedKeys, function(key) {
              if(!params[key]) {
                delete data[key];
              }
            });
            delete params._removedKeys;
            can.extend(data, params);
            var item = this.model({}).attr(data);

            window.localStorage.setItem(key, JSON.stringify(item.serialize()));
            def.resolve(item);
            this.updated && this.updated(item);
          } else {
            def.reject({ status : 404, responseText : "The object with id " + id + " was not found."});
          }
          return def;
        };
      }
    }
    , makeDestroy : function(destroy) {
      if(typeof findAll === "function" && this !== can.Model.LocalStorage) {
        return findAll;
      } else {
        return function(id) {
          var def = new can.Deferred()
          , key = [this._shortName, id].join(":")
          , item = this.model(window.localStorage.getItem( key ));

          if(item) {
            window.localStorage.removeItem(key);

            // remove from list
            key = [this._shortName, "ids"].join(":");
            data = window.localStorage.getItem( key );

            data = JSON.parse(data);
            data.splice(can.inArray(id, data), 1);
            window.localStorage.setItem(key, JSON.stringify(data));

            def.resolve(item);
            this.destroyed && this.destroyed(item);
          } else {
            def.reject({ status : 404, responseText : "Object with id " + id + " was not found"});
          }
          return def;
        };
      }
    }
  }, {
    removeAttr : function(attr) {
      this._super(attr);
      this._removedKeys || (this._data._removedKeys = this._removedKeys = []);
      this._removedKeys.push(attr);
      return this;
    }

  });

})(this.can);
