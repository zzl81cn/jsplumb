(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
        typeof define === 'function' && define.amd ? define(['exports'], factory) :
            (factory((global.jsPlumbUtil = {})));
}(this, (function (exports) { 'use strict';

    function isArray(a) {
        return Object.prototype.toString.call(a) === "[object Array]";
    }
    function isNumber(n) {
        return Object.prototype.toString.call(n) === "[object Number]";
    }
    function isString(s) {
        return typeof s === "string";
    }
    function isBoolean(s) {
        return typeof s === "boolean";
    }
    function isNull(s) {
        return s == null;
    }
    function isObject(o) {
        return o == null ? false : Object.prototype.toString.call(o) === "[object Object]";
    }
    function isDate(o) {
        return Object.prototype.toString.call(o) === "[object Date]";
    }
    function isFunction(o) {
        return Object.prototype.toString.call(o) === "[object Function]";
    }
    function isNamedFunction(o) {
        return isFunction(o) && o.name != null && o.name.length > 0;
    }
    function isEmpty(o) {
        for (var i in o) {
            if (o.hasOwnProperty(i)) {
                return false;
            }
        }
        return true;
    }
    function clone(a) {
        if (isString(a)) {
            return "" + a;
        }
        else if (isBoolean(a)) {
            return !!a;
        }
        else if (isDate(a)) {
            return new Date(a.getTime());
        }
        else if (isFunction(a)) {
            return a;
        }
        else if (isArray(a)) {
            var b = [];
            for (var i = 0; i < a.length; i++) {
                b.push(clone(a[i]));
            }
            return b;
        }
        else if (isObject(a)) {
            var c = {};
            for (var j in a) {
                c[j] = clone(a[j]);
            }
            return c;
        }
        else {
            return a;
        }
    }
    function merge(a, b, collations) {
        // first change the collations array - if present - into a lookup table, because its faster.
        var cMap = {}, ar, i;
        collations = collations || [];
        for (i = 0; i < collations.length; i++) {
            cMap[collations[i]] = true;
        }
        var c = clone(a);
        for (i in b) {
            if (c[i] == null) {
                c[i] = b[i];
            }
            else if (isString(b[i]) || isBoolean(b[i])) {
                if (!cMap[i]) {
                    c[i] = b[i]; // if we dont want to collate, just copy it in.
                }
                else {
                    ar = [];
                    // if c's object is also an array we can keep its values.
                    ar.push.apply(ar, isArray(c[i]) ? c[i] : [c[i]]);
                    ar.push.apply(ar, isBoolean(b[i]) ? b[i] : [b[i]]);
                    c[i] = ar;
                }
            }
            else {
                if (isArray(b[i])) {
                    ar = [];
                    // if c's object is also an array we can keep its values.
                    if (isArray(c[i])) {
                        ar.push.apply(ar, c[i]);
                    }
                    ar.push.apply(ar, b[i]);
                    c[i] = ar;
                }
                else if (isObject(b[i])) {
                    // overwrite c's value with an object if it is not already one.
                    if (!isObject(c[i])) {
                        c[i] = {};
                    }
                    for (var j in b[i]) {
                        c[i][j] = b[i][j];
                    }
                }
            }
        }
        return c;
    }
    function replace(inObj, path, value) {
        if (inObj == null) {
            return;
        }
        var q = inObj, t = q;
        path.replace(/([^\.])+/g, function (term, lc, pos, str) {
            var array = term.match(/([^\[0-9]+){1}(\[)([0-9+])/), last = pos + term.length >= str.length, _getArray = function () {
                return t[array[1]] || (function () {
                        t[array[1]] = [];
                        return t[array[1]];
                    })();
            };
            if (last) {
                // set term = value on current t, creating term as array if necessary.
                if (array) {
                    _getArray()[array[3]] = value;
                }
                else {
                    t[term] = value;
                }
            }
            else {
                // set to current t[term], creating t[term] if necessary.
                if (array) {
                    var a_1 = _getArray();
                    t = a_1[array[3]] || (function () {
                            a_1[array[3]] = {};
                            return a_1[array[3]];
                        })();
                }
                else {
                    t = t[term] || (function () {
                            t[term] = {};
                            return t[term];
                        })();
                }
            }
            return "";
        });
        return inObj;
    }
    //
    // chain a list of functions, supplied by [ object, method name, args ], and return on the first
    // one that returns the failValue. if none return the failValue, return the successValue.
    //
    function functionChain(successValue, failValue, fns) {
        for (var i = 0; i < fns.length; i++) {
            var o = fns[i][0][fns[i][1]].apply(fns[i][0], fns[i][2]);
            if (o === failValue) {
                return o;
            }
        }
        return successValue;
    }
    /**
     *
     * Take the given model and expand out any parameters. 'functionPrefix' is optional, and if present, helps jsplumb figure out what to do if a value is a Function.
     * if you do not provide it (and doNotExpandFunctions is null, or false), jsplumb will run the given values through any functions it finds, and use the function's
     * output as the value in the result. if you do provide the prefix, only functions that are named and have this prefix
     * will be executed; other functions will be passed as values to the output.
     *
     * @param model
     * @param values
     * @param functionPrefix
     * @param doNotExpandFunctions
     * @returns {any}
     */
    function populate(model, values, functionPrefix, doNotExpandFunctions) {
        // for a string, see if it has parameter matches, and if so, try to make the substitutions.
        var getValue = function (fromString) {
            var matches = fromString.match(/(\${.*?})/g);
            if (matches != null) {
                for (var i = 0; i < matches.length; i++) {
                    var val = values[matches[i].substring(2, matches[i].length - 1)] || "";
                    if (val != null) {
                        fromString = fromString.replace(matches[i], val);
                    }
                }
            }
            return fromString;
        };
        // process one entry.
        var _one = function (d) {
            if (d != null) {
                if (isString(d)) {
                    return getValue(d);
                }
                else if (isFunction(d) && !doNotExpandFunctions && (functionPrefix == null || (d.name || "").indexOf(functionPrefix) === 0)) {
                    return d(values);
                }
                else if (isArray(d)) {
                    var r = [];
                    for (var i = 0; i < d.length; i++) {
                        r.push(_one(d[i]));
                    }
                    return r;
                }
                else if (isObject(d)) {
                    var s = {};
                    for (var j in d) {
                        s[j] = _one(d[j]);
                    }
                    return s;
                }
                else {
                    return d;
                }
            }
        };
        return _one(model);
    }
    function findWithFunction(a, f) {
        if (a) {
            for (var i = 0; i < a.length; i++) {
                if (f(a[i])) {
                    return i;
                }
            }
        }
        return -1;
    }
    function removeWithFunction(a, f) {
        var idx = findWithFunction(a, f);
        if (idx > -1) {
            a.splice(idx, 1);
        }
        return idx !== -1;
    }
    function remove(l, v) {
        var idx = l.indexOf(v);
        if (idx > -1) {
            l.splice(idx, 1);
        }
        return idx !== -1;
    }
    function addWithFunction(list, item, hashFunction) {
        if (findWithFunction(list, hashFunction) === -1) {
            list.push(item);
        }
    }
    function addToList(map, key, value, insertAtStart) {
        var l = map[key];
        if (l == null) {
            l = [];
            map[key] = l;
        }
        l[insertAtStart ? "unshift" : "push"](value);
        return l;
    }
    function suggest(list, item, insertAtHead) {
        if (list.indexOf(item) === -1) {
            if (insertAtHead) {
                list.unshift(item);
            }
            else {
                list.push(item);
            }
            return true;
        }
        return false;
    }
    //
    // extends the given obj (which can be an array) with the given constructor function, prototype functions, and
    // class members, any of which may be null.
    //
    function extend(child, parent, _protoFn) {
        var i;
        parent = isArray(parent) ? parent : [parent];
        var _copyProtoChain = function (focus) {
            var proto = focus.__proto__;
            while (proto != null) {
                if (proto.prototype != null) {
                    for (var j in proto.prototype) {
                        if (proto.prototype.hasOwnProperty(j) && !child.prototype.hasOwnProperty(j)) {
                            child.prototype[j] = proto.prototype[j];
                        }
                    }
                    proto = proto.prototype.__proto__;
                }
                else {
                    proto = null;
                }
            }
        };
        for (i = 0; i < parent.length; i++) {
            for (var j in parent[i].prototype) {
                if (parent[i].prototype.hasOwnProperty(j) && !child.prototype.hasOwnProperty(j)) {
                    child.prototype[j] = parent[i].prototype[j];
                }
            }
            _copyProtoChain(parent[i]);
        }
        var _makeFn = function (name, protoFn) {
            return function () {
                for (i = 0; i < parent.length; i++) {
                    if (parent[i].prototype[name]) {
                        parent[i].prototype[name].apply(this, arguments);
                    }
                }
                return protoFn.apply(this, arguments);
            };
        };
        var _oneSet = function (fns) {
            for (var k in fns) {
                child.prototype[k] = _makeFn(k, fns[k]);
            }
        };
        if (arguments.length > 2) {
            for (i = 2; i < arguments.length; i++) {
                _oneSet(arguments[i]);
            }
        }
        return child;
    }
    function uuid() {
        return ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        }));
    }
    function fastTrim(s) {
        if (s == null) {
            return null;
        }
        var str = s.replace(/^\s\s*/, ''), ws = /\s/, i = str.length;
        while (ws.test(str.charAt(--i))) { }
        return str.slice(0, i + 1);
    }
    function each(obj, fn) {
        obj = obj.length == null || typeof obj === "string" ? [obj] : obj;
        for (var i = 0; i < obj.length; i++) {
            fn(obj[i]);
        }
    }
    function map(obj, fn) {
        var o = [];
        for (var i = 0; i < obj.length; i++) {
            o.push(fn(obj[i]));
        }
        return o;
    }
    function mergeWithParents(type, map, parentAttribute) {
        parentAttribute = parentAttribute || "parent";
        var _def = function (id) {
            return id ? map[id] : null;
        };
        var _parent = function (def) {
            return def ? _def(def[parentAttribute]) : null;
        };
        var _one = function (parent, def) {
            if (parent == null) {
                return def;
            }
            else {
                var d_1 = merge(parent, def);
                return _one(_parent(parent), d_1);
            }
        };
        var _getDef = function (t) {
            if (t == null) {
                return {};
            }
            if (typeof t === "string") {
                return _def(t);
            }
            else if (t.length) {
                var done = false, i = 0, _dd = void 0;
                while (!done && i < t.length) {
                    _dd = _getDef(t[i]);
                    if (_dd) {
                        done = true;
                    }
                    else {
                        i++;
                    }
                }
                return _dd;
            }
        };
        var d = _getDef(type);
        if (d) {
            return _one(_parent(d), d);
        }
        else {
            return {};
        }
    }
    var logEnabled = true;
    function log() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (logEnabled && typeof console !== "undefined") {
            try {
                var msg = arguments[arguments.length - 1];
                console.log(msg);
            }
            catch (e) {
            }
        }
    }
    /**
     * Wraps one function with another, creating a placeholder for the
     * wrapped function if it was null. this is used to wrap the various
     * drag/drop event functions - to allow jsPlumb to be notified of
     * important lifecycle events without imposing itself on the user's
     * drag/drop functionality.
     * @method jsPlumbUtil.wrap
     * @param {Function} wrappedFunction original function to wrap; may be null.
     * @param {Function} newFunction function to wrap the original with.
     * @param {Object} [returnOnThisValue] Optional. Indicates that the wrappedFunction should
     * not be executed if the newFunction returns a value matching 'returnOnThisValue'.
     * note that this is a simple comparison and only works for primitives right now.
     */
    function wrap(wrappedFunction, newFunction, returnOnThisValue) {
        return function () {
            var r = null;
            try {
                if (newFunction != null) {
                    r = newFunction.apply(this, arguments);
                }
            }
            catch (e) {
                log("jsPlumb function failed : " + e);
            }
            if ((wrappedFunction != null) && (returnOnThisValue == null || (r !== returnOnThisValue))) {
                try {
                    r = wrappedFunction.apply(this, arguments);
                }
                catch (e) {
                    log("wrapped function failed : " + e);
                }
            }
            return r;
        };
    }
    var EventGenerator = /** @class */ (function () {
        function EventGenerator() {
            var _this = this;
            this._listeners = {};
            this.eventsSuspended = false;
            this.tick = false;
            // this is a list of events that should re-throw any errors that occur during their dispatch.
            this.eventsToDieOn = { "ready": true };
            this.queue = [];
            this.bind = function (event, listener, insertAtStart) {
                var _one = function (evt) {
                    addToList(_this._listeners, evt, listener, insertAtStart);
                    listener.__jsPlumb = listener.__jsPlumb || {};
                    listener.__jsPlumb[uuid()] = evt;
                };
                if (typeof event === "string") {
                    _one(event);
                }
                else if (event.length != null) {
                    for (var i = 0; i < event.length; i++) {
                        _one(event[i]);
                    }
                }
                return _this;
            };
            this.fire = function (event, value, originalEvent) {
                if (!this.tick) {
                    this.tick = true;
                    if (!this.eventsSuspended && this._listeners[event]) {
                        var l = this._listeners[event].length, i = 0, _gone = false, ret = null;
                        if (!this.shouldFireEvent || this.shouldFireEvent(event, value, originalEvent)) {
                            while (!_gone && i < l && ret !== false) {
                                // doing it this way rather than catching and then possibly re-throwing means that an error propagated by this
                                // method will have the whole call stack available in the debugger.
                                if (this.eventsToDieOn[event]) {
                                    this._listeners[event][i].apply(this, [value, originalEvent]);
                                }
                                else {
                                    try {
                                        ret = this._listeners[event][i].apply(this, [value, originalEvent]);
                                    }
                                    catch (e) {
                                        log("jsPlumb: fire failed for event " + event + " : " + e);
                                    }
                                }
                                i++;
                                if (this._listeners == null || this._listeners[event] == null) {
                                    _gone = true;
                                }
                            }
                        }
                    }
                    this.tick = false;
                    this._drain();
                }
                else {
                    this.queue.unshift(arguments);
                }
                return this;
            };
            this._drain = function () {
                var n = _this.queue.pop();
                if (n) {
                    _this.fire.apply(_this, n);
                }
            };
            this.unbind = function (eventOrListener, listener) {
                if (arguments.length === 0) {
                    this._listeners = {};
                }
                else if (arguments.length === 1) {
                    if (typeof eventOrListener === "string") {
                        delete this._listeners[eventOrListener];
                    }
                    else if (eventOrListener.__jsPlumb) {
                        var evt = void 0;
                        for (var i in eventOrListener.__jsPlumb) {
                            evt = eventOrListener.__jsPlumb[i];
                            remove(this._listeners[evt] || [], eventOrListener);
                        }
                    }
                }
                else if (arguments.length === 2) {
                    remove(this._listeners[eventOrListener] || [], listener);
                }
                return this;
            };
            this.getListener = function (forEvent) {
                return _this._listeners[forEvent];
            };
            this.setSuspendEvents = function (val) {
                _this.eventsSuspended = val;
            };
            this.isSuspendEvents = function () {
                return _this.eventsSuspended;
            };
            this.silently = function (fn) {
                _this.setSuspendEvents(true);
                try {
                    fn();
                }
                catch (e) {
                    log("Cannot execute silent function " + e);
                }
                _this.setSuspendEvents(false);
            };
            this.cleanupListeners = function () {
                for (var i in _this._listeners) {
                    _this._listeners[i] = null;
                }
            };
        }
        return EventGenerator;
    }());

    exports.isArray = isArray;
    exports.isNumber = isNumber;
    exports.isString = isString;
    exports.isBoolean = isBoolean;
    exports.isNull = isNull;
    exports.isObject = isObject;
    exports.isDate = isDate;
    exports.isFunction = isFunction;
    exports.isNamedFunction = isNamedFunction;
    exports.isEmpty = isEmpty;
    exports.clone = clone;
    exports.merge = merge;
    exports.replace = replace;
    exports.functionChain = functionChain;
    exports.populate = populate;
    exports.findWithFunction = findWithFunction;
    exports.removeWithFunction = removeWithFunction;
    exports.remove = remove;
    exports.addWithFunction = addWithFunction;
    exports.addToList = addToList;
    exports.suggest = suggest;
    exports.extend = extend;
    exports.uuid = uuid;
    exports.fastTrim = fastTrim;
    exports.each = each;
    exports.map = map;
    exports.mergeWithParents = mergeWithParents;
    exports.logEnabled = logEnabled;
    exports.log = log;
    exports.wrap = wrap;
    exports.EventGenerator = EventGenerator;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
