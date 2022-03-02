"use strict";

const _ = require("lodash");

const privates = new WeakMap();

function isBindable(func) {
  return func.hasOwnProperty("prototype");
}

function addAttributes(cl, attr, opt) {
  for (const [name, vf] of Object.entries(attr)) {
    if (!_.isFunction(vf)) throw new Error("lazy function isn't a function");
    if (!isBindable(vf)) throw new Error("lazy function is not bindable");

    const hasName = "_hasLazy" + _.upperFirst(name);

    Object.defineProperty(cl.prototype, hasName, {
      get: function () {
        const me = privates.get(this);
        return !!(me && me.has(name));
      }
    });

    const prop = {
      get: function () {
        let me = privates.get(this);
        if (!me) privates.set(this, (me = new Map()));
        if (me.has(name)) return me.get(name);
        const val = vf.call(this, name);
        me.set(name, val);
        return val;
      }
    };

    if (opt.rw)
      prop.set = function (val) {
        let me = privates.get(this);
        if (!me) privates.set(this, (me = new Map()));
        if (me.has(name)) throw new Error(name + " has already been set");
        me.set(name, val);
      };

    Object.defineProperty(cl.prototype, name, prop);
  }

  return cl;
}

function lazyAttr(cl, name, vf) {
  if (_.isString(name) && _.isFunction(vf))
    return lazyAttr(cl, _.fromPairs([[name, vf]]));
  return addAttributes(cl, name, {});
}

function lazyInit(cl, name, vf) {
  if (_.isString(name) && _.isFunction(vf))
    return lazyInit(cl, _.fromPairs([[name, vf]]));
  return addAttributes(cl, name, { rw: true });
}

module.exports = { lazyAttr, lazyInit };
