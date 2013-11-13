/*!
 * jQuery++ - 1.0.1
 * http://jquerypp.com
 * Copyright (c) 2013 Bitovi
 * Mon, 11 Nov 2013 22:05:32 GMT
 * Licensed MIT
 * Download from: http://bitbuilder.herokuapp.com/jquerypp.custom.js?plugins=jquerypp%2Fdom%2Fanimate&plugins=jquerypp%2Fdom%2Fdimensions&plugins=jquerypp%2Fdom%2Fstyles&plugins=jquerypp%2Fdom%2Fwithin&plugins=jquerypp%2Fevent%2Ffastfix&plugins=jquerypp%2Fevent%2Fkey&plugins=jquerypp%2Fevent%2Fresize
 */
(function($) {

    // ## jquerypp/dom/styles/styles.js
    var __m3 = (function($) {
        var getComputedStyle = document.defaultView && document.defaultView.getComputedStyle,
            // The following variables are used to convert camelcased attribute names
            // into dashed names, e.g. borderWidth to border-width
            rupper = /([A-Z])/g,
            rdashAlpha = /-([a-z])/ig,
            fcamelCase = function(all, letter) {
                return letter.toUpperCase();
            },
            // Returns the computed style for an elementn
            getStyle = function(elem) {
                if (getComputedStyle) {
                    return getComputedStyle(elem, null);
                } else if (elem.currentStyle) {
                    return elem.currentStyle;
                }
            },
            // Checks for float px and numeric values
            rfloat = /float/i,
            rnumpx = /^-?\d+(?:px)?$/i,
            rnum = /^-?\d/;

        // Returns a list of styles for a given element
        $.styles = function(el, styles) {
            if (!el) {
                return null;
            }
            var currentS = getStyle(el),
                oldName, val, style = el.style,
                results = {},
                i = 0,
                left, rsLeft, camelCase, name;

            // Go through each style
            for (; i < styles.length; i++) {
                name = styles[i];
                oldName = name.replace(rdashAlpha, fcamelCase);

                if (rfloat.test(name)) {
                    name = $.support.cssFloat ? "float" : "styleFloat";
                    oldName = "cssFloat";
                }

                // If we have getComputedStyle available
                if (getComputedStyle) {
                    // convert camelcased property names to dashed name
                    name = name.replace(rupper, "-$1").toLowerCase();
                    // use getPropertyValue of the current style object
                    val = currentS.getPropertyValue(name);
                    // default opacity is 1
                    if (name === "opacity" && val === "") {
                        val = "1";
                    }
                    results[oldName] = val;
                } else {
                    // Without getComputedStyles
                    camelCase = name.replace(rdashAlpha, fcamelCase);
                    results[oldName] = currentS[name] || currentS[camelCase];

                    // convert to px
                    if (!rnumpx.test(results[oldName]) && rnum.test(results[oldName])) {
                        // Remember the original values
                        left = style.left;
                        rsLeft = el.runtimeStyle.left;

                        // Put in the new values to get a computed value out
                        el.runtimeStyle.left = el.currentStyle.left;
                        style.left = camelCase === "fontSize" ? "1em" : (results[oldName] || 0);
                        results[oldName] = style.pixelLeft + "px";

                        // Revert the changed values
                        style.left = left;
                        el.runtimeStyle.left = rsLeft;
                    }

                }
            }

            return results;
        };


        $.fn.styles = function() {
            // Pass the arguments as an array to $.styles
            return $.styles(this[0], $.makeArray(arguments));
        };

        return $;
    })($);

    // ## jquerypp/dom/animate/animate.js
    var __m1 = (function($) {

        // Overwrites `jQuery.fn.animate` to use CSS 3 animations if possible

        var
        // The global animation counter
        animationNum = 0,
            // The stylesheet for our animations
            styleSheet = null,
            // The animation cache
            cache = [],
            // Stores the browser properties like transition end event name and prefix
            browser = null,
            // Store the original $.fn.animate
            oldanimate = $.fn.animate,

            // Return the stylesheet, create it if it doesn't exists
            getStyleSheet = function() {
                if (!styleSheet) {
                    var style = document.createElement('style');
                    style.setAttribute("type", "text/css");
                    style.setAttribute("media", "screen");

                    document.getElementsByTagName('head')[0].appendChild(style);
                    if (!window.createPopup) {
                        style.appendChild(document.createTextNode(''));
                    }

                    styleSheet = style.sheet;
                }

                return styleSheet;
            },

            //removes an animation rule from a sheet
            removeAnimation = function(sheet, name) {
                for (var j = sheet.cssRules.length - 1; j >= 0; j--) {
                    var rule = sheet.cssRules[j];
                    // 7 means the keyframe rule
                    if (rule.type === 7 && rule.name == name) {
                        sheet.deleteRule(j)
                        return;
                    }
                }
            },

            // Returns whether the animation should be passed to the original $.fn.animate.
            passThrough = function(props, ops, easing, callback) {
                var nonElement = !(this[0] && this[0].nodeType),
                    isInline = !nonElement && $(this).css("display") === "inline" && $(this).css("float") === "none",
                    browser = getBrowser();

                for (var name in props) {
                    // jQuery does something with these values
                    if (props[name] == 'show' || props[name] == 'hide' || props[name] == 'toggle'
                        // Arrays for individual easing
                        || $.isArray(props[name])
                        // Negative values not handled the same
                        || props[name] < 0
                        // unit-less value
                        || name == 'zIndex' || name == 'z-index' || name == 'scrollTop' || name == 'scrollLeft') {
                        return true;
                    }
                }

                return props.jquery === true || browser === null || browser.prefix === '-o-' ||
                // Animating empty properties
                $.isEmptyObject(props) ||
                // We can't do custom easing
                (easing || easing && typeof easing == 'string') ||
                // Second parameter is an object - we can only handle primitives
                $.isPlainObject(ops) ||
                // Inline and non elements
                isInline || nonElement;
            },

            // Gets a CSS number (with px added as the default unit if the value is a number)
            cssValue = function(origName, value) {
                if (typeof value === "number" && !$.cssNumber[origName]) {
                    return value += "px";
                }
                return value;
            },

            // Feature detection borrowed by http://modernizr.com/
            getBrowser = function() {
                if (!browser) {
                    var t,
                        el = document.createElement('fakeelement'),
                        transitions = {
                            'transition': {
                                transitionEnd: 'transitionEnd',
                                prefix: ''
                            },
                            //						'MSTransition': {
                            //							transitionEnd : 'msTransitionEnd',
                            //							prefix : '-ms-'
                            //						},
                            'MozTransition': {
                                transitionEnd: 'animationend',
                                prefix: '-moz-'
                            },
                            'WebkitTransition': {
                                transitionEnd: 'webkitAnimationEnd',
                                prefix: '-webkit-'
                            },
                            'OTransition': {
                                transitionEnd: 'oTransitionEnd',
                                prefix: '-o-'
                            }
                        }

                    for (t in transitions) {
                        if (t in el.style) {
                            browser = transitions[t];
                        }
                    }
                }

                return browser;
            },

            // Properties that Firefox can't animate if set to 'auto':
            // https://bugzilla.mozilla.org/show_bug.cgi?id=571344
            // Provides a converter that returns the actual value
            ffProps = {
                top: function(el) {
                    return el.position().top;
                },
                left: function(el) {
                    return el.position().left;
                },
                width: function(el) {
                    return el.width();
                },
                height: function(el) {
                    return el.height();
                },
                fontSize: function(el) {
                    return '1em';
                }
            },

            // Add browser specific prefix
            addPrefix = function(properties) {
                var result = {};
                $.each(properties, function(name, value) {
                    result[getBrowser().prefix + name] = value;
                });
                return result;
            },

            // Returns the animation name for a given style. It either uses a cached
            // version or adds it to the stylesheet, removing the oldest style if the
            // cache has reached a certain size.
            getAnimation = function(style) {
                var sheet, name, last;

                // Look up the cached style, set it to that name and reset age if found
                // increment the age for any other animation
                $.each(cache, function(i, animation) {
                    if (style === animation.style) {
                        name = animation.name;
                        animation.age = 0;
                    } else {
                        animation.age += 1;
                    }
                });

                if (!name) { // Add a new style
                    sheet = getStyleSheet();
                    name = "jquerypp_animation_" + (animationNum++);
                    // get the last sheet and insert this rule into it
                    sheet.insertRule("@" + getBrowser().prefix + "keyframes " + name + ' ' + style, (sheet.cssRules && sheet.cssRules.length) || 0);
                    cache.push({
                            name: name,
                            style: style,
                            age: 0
                        });

                    // Sort the cache by age
                    cache.sort(function(first, second) {
                        return first.age - second.age;
                    });

                    // Remove the last (oldest) item from the cache if it has more than 20 items
                    if (cache.length > 20) {
                        last = cache.pop();
                        removeAnimation(sheet, last.name);
                    }
                }

                return name;
            };


        $.fn.animate = function(props, speed, easing, callback) {
            //default to normal animations if browser doesn't support them
            if (passThrough.apply(this, arguments)) {
                return oldanimate.apply(this, arguments);
            }

            var optall = $.speed(speed, easing, callback),
                overflow = [];

            // if we are animating height and width properties, set overflow to hidden, and save
            // the previous overflow information to replace with when done.
            if ("height" in props || "width" in props) {
                overflow = [this[0].style.overflow, this[0].style.overflowX, this[0].style.overflowY];
                this.css('overflow', 'hidden');
            }

            // Add everything to the animation queue
            this.queue(optall.queue, function(done) {
                var
                //current CSS values
                current,
                    // The list of properties passed
                    properties = [],
                    to = "",
                    prop,
                    self = $(this),
                    duration = optall.duration,
                    //the animation keyframe name
                    animationName,
                    // The key used to store the animation hook
                    dataKey,
                    //the text for the keyframe
                    style = "{ from {",
                    // The animation end event handler.
                    // Will be called both on animation end and after calling .stop()
                    animationEnd = function(currentCSS, exec) {
                        // As long as we don't stop mid animation, then we will replace
                        // the overflow values of the element being animated.
                        if (!exec) {
                            self[0].style.overflow = overflow[0];
                            self[0].style.overflowX = overflow[1];
                            self[0].style.overflowY = overflow[2];
                        } else {
                            self.css('overflow', '');
                        }

                        self.css(currentCSS);

                        self.css(addPrefix({
                                    "animation-duration": "",
                                    "animation-name": "",
                                    "animation-fill-mode": "",
                                    "animation-play-state": ""
                                }));

                        // Call the original callback
                        if ($.isFunction(optall.old) && exec) {
                            // Call success, pass the DOM element as the this reference
                            optall.old.call(self[0], true)
                        }

                        $.removeData(self, dataKey, true);
                    },
                    finishAnimation = function() {
                        // Call animationEnd using the passed properties
                        animationEnd(props, true);
                        done();
                    };

                for (prop in props) {
                    properties.push(prop);
                }

                if (getBrowser().prefix === '-moz-') {
                    // Normalize 'auto' properties in FF
                    $.each(properties, function(i, prop) {
                        var converter = ffProps[$.camelCase(prop)];
                        if (converter && self.css(prop) == 'auto') {
                            self.css(prop, converter(self));
                        }
                    });
                }

                // Use $.styles
                current = self.styles.apply(self, properties);
                $.each(properties, function(i, cur) {
                    // Convert a camelcased property name
                    var name = cur.replace(/([A-Z]|^ms)/g, "-$1").toLowerCase();
                    style += name + " : " + cssValue(cur, current[cur]) + "; ";
                    to += name + " : " + cssValue(cur, props[cur]) + "; ";
                });

                style += "} to {" + to + " }}";

                animationName = getAnimation(style);
                dataKey = animationName + '.run';

                // Add a hook which will be called when the animation stops
                $._data(this, dataKey, {
                        stop: function(gotoEnd) {
                            // Pause the animation
                            self.css(addPrefix({
                                        'animation-play-state': 'paused'
                                    }));
                            // Unbind the animation end handler
                            self.off(getBrowser().transitionEnd, finishAnimation);
                            if (!gotoEnd) {
                                // We were told not to finish the animation
                                // Call animationEnd but set the CSS to the current computed style
                                animationEnd(self.styles.apply(self, properties), false);
                            } else {
                                // Finish animaion
                                animationEnd(props, true);
                            }
                        }
                    });

                // set this element to point to that animation
                self.css(addPrefix({
                            "animation-duration": duration + "ms",
                            "animation-name": animationName,
                            "animation-fill-mode": "forwards"
                        }));

                // Attach the transition end event handler to run only once
                self.one(getBrowser().transitionEnd, finishAnimation);

            });

            return this;
        };

        return $;
    })($, __m3);

    // ## jquerypp/dom/dimensions/dimensions.js
    var __m4 = (function($) {

        var
        //margin is inside border
        weird = /button|select/i,
            getBoxes = {},
            checks = {
                width: ["Left", "Right"],
                height: ['Top', 'Bottom'],
                oldOuterHeight: $.fn.outerHeight,
                oldOuterWidth: $.fn.outerWidth,
                oldInnerWidth: $.fn.innerWidth,
                oldInnerHeight: $.fn.innerHeight
            },
            supportsSetter = $.fn.jquery >= '1.8.0';

        $.each({

                width:

                "Width",

                height:

                // for each 'height' and 'width'
                "Height"
            }, function(lower, Upper) {

                //used to get the padding and border for an element in a given direction
                getBoxes[lower] = function(el, boxes) {
                    var val = 0;
                    if (!weird.test(el.nodeName)) {
                        //make what to check for ....
                        var myChecks = [];
                        $.each(checks[lower], function() {
                            var direction = this;
                            $.each(boxes, function(name, val) {
                                if (val)
                                    myChecks.push(name + direction + (name == 'border' ? "Width" : ""));
                            })
                        })
                        $.each($.styles(el, myChecks), function(name, value) {
                            val += (parseFloat(value) || 0);
                        })
                    }
                    return val;
                }

                //getter / setter
                if (!supportsSetter) {
                    $.fn["outer" + Upper] = function(v, margin) {
                        var first = this[0];
                        if (typeof v == 'number') {
                            // Setting the value
                            first && this[lower](v - getBoxes[lower](first, {
                                        padding: true,
                                        border: true,
                                        margin: margin
                                    }))
                            return this;
                        } else {
                            // Return the old value
                            return first ? checks["oldOuter" + Upper].apply(this, arguments) : null;
                        }
                    }
                    $.fn["inner" + Upper] = function(v) {
                        var first = this[0];
                        if (typeof v == 'number') {
                            // Setting the value
                            first && this[lower](v - getBoxes[lower](first, {
                                        padding: true
                                    }))
                            return this;
                        } else {
                            // Return the old value
                            return first ? checks["oldInner" + Upper].apply(this, arguments) : null;
                        }
                    }
                }

                //provides animations
                var animate = function(boxes) {
                    // Return the animation function
                    return function(fx) {
                        if (fx[supportsSetter ? 'pos' : 'state'] == 0) {
                            fx.start = $(fx.elem)[lower]();
                            fx.end = fx.end - getBoxes[lower](fx.elem, boxes);
                        }
                        fx.elem.style[lower] = (fx.pos * (fx.end - fx.start) + fx.start) + "px"
                    }
                }
                $.fx.step["outer" + Upper] = animate({
                        padding: true,
                        border: true
                    })
                $.fx.step["outer" + Upper + "Margin"] = animate({
                        padding: true,
                        border: true,
                        margin: true
                    })
                $.fx.step["inner" + Upper] = animate({
                        padding: true
                    })

            })

        return $;
    })($, __m3);

    // ## jquerypp/dom/within/within.js
    var __m5 = (function($) {
        // Checks if x and y coordinates are within a box with left, top, width and height
        var withinBox = function(x, y, left, top, width, height) {
            return (y >= top &&
                y < top + height &&
                x >= left &&
                x < left + width);
        }

        $.fn.within = function(left, top, useOffsetCache) {
            var ret = []
            this.each(function() {
                var q = jQuery(this);

                if (this == document.documentElement) {
                    return ret.push(this);
                }

                // uses either the cached offset or .offset()
                var offset = useOffsetCache ?
                    $.data(this, "offsetCache") || $.data(this, "offsetCache", q.offset()) :
                    q.offset();

                // Check if the given coordinates are within the area of the current element
                var res = withinBox(left, top, offset.left, offset.top,
                    this.offsetWidth, this.offsetHeight);

                if (res) {
                    // Add it to the results
                    ret.push(this);
                }
            });

            return this.pushStack($.unique(ret), "within", left + "," + top);
        }

        $.fn.withinBox = function(left, top, width, height, useOffsetCache) {
            var ret = []
            this.each(function() {
                var q = jQuery(this);

                if (this == document.documentElement) return ret.push(this);

                // use cached offset or .offset()
                var offset = useOffsetCache ?
                    $.data(this, "offset") ||
                    $.data(this, "offset", q.offset()) :
                    q.offset();

                var ew = q.width(),
                    eh = q.height(),
                    // Checks if the element offset is within the given box
                    res = !((offset.top > top + height) || (offset.top + eh < top) || (offset.left > left + width) || (offset.left + ew < left));

                if (res)
                    ret.push(this);
            });
            return this.pushStack($.unique(ret), "withinBox", $.makeArray(arguments).join(","));
        }

        return $;
    })($);

    // ## jquerypp/event/fastfix/fastfix.js
    var __m6 = (function($) {
        // http://bitovi.com/blog/2012/04/faster-jquery-event-fix.html
        // https://gist.github.com/2377196

        // IE 8 has Object.defineProperty but it only defines DOM Nodes. According to
        // http://kangax.github.com/es5-compat-table/#define-property-ie-note
        // All browser that have Object.defineProperties also support Object.defineProperty properly
        if (Object.defineProperties) {
            var
            // Use defineProperty on an object to set the value and return it
            set = function(obj, prop, val) {
                if (val !== undefined) {
                    Object.defineProperty(obj, prop, {
                            value: val
                        });
                }
                return val;
            },
                // special converters
                special = {
                    pageX: function(original) {
                        if (!original) {
                            return;
                        }

                        var eventDoc = this.target.ownerDocument || document;
                        doc = eventDoc.documentElement;
                        body = eventDoc.body;
                        return original.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
                    },
                    pageY: function(original) {
                        if (!original) {
                            return;
                        }

                        var eventDoc = this.target.ownerDocument || document;
                        doc = eventDoc.documentElement;
                        body = eventDoc.body;
                        return original.clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);
                    },
                    relatedTarget: function(original) {
                        if (!original) {
                            return;
                        }

                        return original.fromElement === this.target ? original.toElement : original.fromElement;
                    },
                    metaKey: function(originalEvent) {
                        if (!originalEvent) {
                            return;
                        }
                        return originalEvent.ctrlKey;
                    },
                    which: function(original) {
                        if (!original) {
                            return;
                        }

                        return original.charCode != null ? original.charCode : original.keyCode;
                    }
                };

            // Get all properties that should be mapped
            $.each($.event.keyHooks.props.concat($.event.mouseHooks.props).concat($.event.props), function(i, prop) {
                if (prop !== "target") {
                    (function() {
                        Object.defineProperty($.Event.prototype, prop, {
                                get: function() {
                                    // get the original value, undefined when there is no original event
                                    var originalValue = this.originalEvent && this.originalEvent[prop];
                                    // overwrite getter lookup
                                    return this['_' + prop] !== undefined ? this['_' + prop] : set(this, prop,
                                        // if we have a special function and no value
                                        special[prop] && originalValue === undefined ?
                                        // call the special function
                                        special[prop].call(this, this.originalEvent) :
                                        // use the original value
                                        originalValue)
                                },
                                set: function(newValue) {
                                    // Set the property with underscore prefix
                                    this['_' + prop] = newValue;
                                }
                            });
                    })();
                }
            });

            $.event.fix = function(event) {
                if (event[$.expando]) {
                    return event;
                }
                // Create a jQuery event with at minimum a target and type set
                var originalEvent = event,
                    event = $.Event(originalEvent);
                event.target = originalEvent.target;
                // Fix target property, if necessary (#1925, IE 6/7/8 & Safari2)
                if (!event.target) {
                    event.target = originalEvent.srcElement || document;
                }

                // Target should not be a text node (#504, Safari)
                if (event.target.nodeType === 3) {
                    event.target = event.target.parentNode;
                }

                return event;
            }
        }

        return $;
    })($);

    // ## jquerypp/event/key/key.js
    var __m7 = (function($) {

        // copied from jQuery 1.8.3
        var uaMatch = function(ua) {
            ua = ua.toLowerCase();

            var match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
                /(webkit)[ \/]([\w.]+)/.exec(ua) ||
                /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
                /(msie) ([\w.]+)/.exec(ua) ||
                ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) || [];

            return {
                browser: match[1] || "",
                version: match[2] || "0"
            };
        }

        var keymap = {},
            reverseKeyMap = {},
            currentBrowser = uaMatch(navigator.userAgent).browser;


        $.event.key = function(browser, map) {
            if (browser === undefined) {
                return keymap;
            }

            if (map === undefined) {
                map = browser;
                browser = currentBrowser;
            }

            // extend the keymap
            if (!keymap[browser]) {
                keymap[browser] = {};
            }
            $.extend(keymap[browser], map);
            // and also update the reverse keymap
            if (!reverseKeyMap[browser]) {
                reverseKeyMap[browser] = {};
            }
            for (var name in map) {
                reverseKeyMap[browser][map[name]] = name;
            }
        };

        $.event.key({
                // backspace
                '\b': '8',

                // tab
                '\t': '9',

                // enter
                '\r': '13',

                // special
                'shift': '16',
                'ctrl': '17',
                'alt': '18',

                // others
                'pause-break': '19',
                'caps': '20',
                'escape': '27',
                'num-lock': '144',
                'scroll-lock': '145',
                'print': '44',

                // navigation
                'page-up': '33',
                'page-down': '34',
                'end': '35',
                'home': '36',
                'left': '37',
                'up': '38',
                'right': '39',
                'down': '40',
                'insert': '45',
                'delete': '46',

                // normal characters
                ' ': '32',
                '0': '48',
                '1': '49',
                '2': '50',
                '3': '51',
                '4': '52',
                '5': '53',
                '6': '54',
                '7': '55',
                '8': '56',
                '9': '57',
                'a': '65',
                'b': '66',
                'c': '67',
                'd': '68',
                'e': '69',
                'f': '70',
                'g': '71',
                'h': '72',
                'i': '73',
                'j': '74',
                'k': '75',
                'l': '76',
                'm': '77',
                'n': '78',
                'o': '79',
                'p': '80',
                'q': '81',
                'r': '82',
                's': '83',
                't': '84',
                'u': '85',
                'v': '86',
                'w': '87',
                'x': '88',
                'y': '89',
                'z': '90',
                // normal-characters, numpad
                'num0': '96',
                'num1': '97',
                'num2': '98',
                'num3': '99',
                'num4': '100',
                'num5': '101',
                'num6': '102',
                'num7': '103',
                'num8': '104',
                'num9': '105',
                '*': '106',
                '+': '107',
                '-': '109',
                '.': '110',
                // normal-characters, others
                '/': '111',
                ';': '186',
                '=': '187',
                ',': '188',
                '-': '189',
                '.': '190',
                '/': '191',
                '`': '192',
                '[': '219',
                '\\': '220',
                ']': '221',
                "'": '222',

                // ignore these, you shouldn't use them
                'left window key': '91',
                'right window key': '92',
                'select key': '93',


                'f1': '112',
                'f2': '113',
                'f3': '114',
                'f4': '115',
                'f5': '116',
                'f6': '117',
                'f7': '118',
                'f8': '119',
                'f9': '120',
                'f10': '121',
                'f11': '122',
                'f12': '123'
            });


        $.Event.prototype.keyName = function() {
            var event = this,
                test = /\w/,
                // It can be either keyCode or charCode.
                // Look both cases up in the reverse key map and converted to a string
                key_Key = reverseKeyMap[currentBrowser][(event.keyCode || event.which) + ""],
                char_Key = String.fromCharCode(event.keyCode || event.which),
                key_Char = event.charCode && reverseKeyMap[currentBrowser][event.charCode + ""],
                char_Char = event.charCode && String.fromCharCode(event.charCode);

            if (char_Char && test.test(char_Char)) {
                // string representation of event.charCode
                return char_Char.toLowerCase()
            }
            if (key_Char && test.test(key_Char)) {
                // reverseKeyMap representation of event.charCode
                return char_Char.toLowerCase()
            }
            if (char_Key && test.test(char_Key)) {
                // string representation of event.keyCode
                return char_Key.toLowerCase()
            }
            if (key_Key && test.test(key_Key)) {
                // reverseKeyMap representation of event.keyCode
                return key_Key.toLowerCase()
            }

            if (event.type == 'keypress') {
                // keypress doesn't capture everything
                return event.keyCode ? String.fromCharCode(event.keyCode) : String.fromCharCode(event.which)
            }

            if (!event.keyCode && event.which) {
                // event.which
                return String.fromCharCode(event.which)
            }

            // default
            return reverseKeyMap[currentBrowser][event.keyCode + ""]
        }

        return $;
    })($);

    // ## jquerypp/event/reverse/reverse.js
    var __m9 = (function($) {
        $.event.reverse = function(name, attributes) {
            var bound = $(),
                count = 0,
                dispatch = $.event.handle || $.event.dispatch;

            $.event.special[name] = {
                setup: function() {
                    // add and sort the resizers array
                    // don't add window because it can't be compared easily
                    if (this !== window) {
                        bound.push(this);
                        $.unique(bound);
                    }
                    // returns false if the window
                    return this !== window;
                },
                teardown: function() {
                    // we shouldn't have to sort
                    bound = bound.not(this);
                    // returns false if the window
                    return this !== window;
                },
                add: function(handleObj) {
                    var origHandler = handleObj.handler;
                    handleObj.origHandler = origHandler;

                    handleObj.handler = function(ev, data) {
                        var isWindow = this === window;
                        if (attributes && attributes.handler) {
                            var result = attributes.handler.apply(this, arguments);
                            if (result === true) {
                                return;
                            }
                        }

                        // if this is the first handler for this event ...
                        if (count === 0) {
                            // prevent others from doing what we are about to do
                            count++;
                            var where = data === false ? ev.target : this

                            // trigger all this element's handlers
                            dispatch.call(where, ev, data);
                            if (ev.isPropagationStopped()) {
                                count--;
                                return;
                            }

                            // get all other elements within this element that listen to move
                            // and trigger their resize events
                            var index = bound.index(this),
                                length = bound.length,
                                child, sub;

                            // if index == -1 it's the window
                            while (++index < length && (child = bound[index]) && (isWindow || $.contains(where, child))) {

                                // call the event
                                dispatch.call(child, ev, data);

                                if (ev.isPropagationStopped()) {
                                    // move index until the item is not in the current child
                                    while (++index < length && (sub = bound[index])) {
                                        if (!$.contains(child, sub)) {
                                            // set index back one
                                            index--;
                                            break
                                        }
                                    }
                                }
                            }

                            // prevent others from responding
                            ev.stopImmediatePropagation();
                            count--;
                        } else {
                            handleObj.origHandler.call(this, ev, data);
                        }
                    }
                }
            };

            // automatically bind on these
            $([document, window]).bind(name, function() {});

            return $.event.special[name];
        }

        return $;
    })($);

    // ## jquerypp/event/resize/resize.js
    var __m8 = (function($) {
        var
        // bind on the window window resizes to happen
        win = $(window),
            windowWidth = 0,
            windowHeight = 0,
            timer;

        $(function() {
            windowWidth = win.width();
            windowHeight = win.height();
        });

        $.event.reverse('resize', {
                handler: function(ev, data) {
                    var isWindow = this === window;

                    // if we are the window and a real resize has happened
                    // then we check if the dimensions actually changed
                    // if they did, we will wait a brief timeout and
                    // trigger resize on the window
                    // this is for IE, to prevent window resize 'infinate' loop issues
                    if (isWindow && ev.originalEvent) {
                        var width = win.width(),
                            height = win.height();

                        if ((width != windowWidth || height != windowHeight)) {
                            //update the new dimensions
                            windowWidth = width;
                            windowHeight = height;
                            clearTimeout(timer)
                            timer = setTimeout(function() {
                                win.trigger("resize");
                            }, 1);

                        }
                        return true;
                    }
                }
            });

        return $;
    })(__m9);
})(jQuery);
