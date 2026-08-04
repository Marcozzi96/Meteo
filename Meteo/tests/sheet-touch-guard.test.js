"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function createElement(){
  const listeners = {};
  const classes = new Set();
  return {
    listeners,
    style: {},
    dataset: {},
    scrollTop: 0,
    scrollLeft: 0,
    offsetHeight: 400,
    classList: {
      add: cls => classes.add(cls),
      remove: cls => classes.delete(cls),
      contains: cls => classes.has(cls)
    },
    addEventListener(type, handler){
      listeners[type] = handler;
    },
    querySelector(){
      return {
        contains: target => target && target.isHandle === true
      };
    },
    contains(target){
      return target === this || target.insideSheet === true;
    }
  };
}

const sheet = createElement();
const overlay = createElement();
const hourlyScroll = createElement();
const documentListeners = {};

const context = {
  console,
  closeSheet(){},
  renderHourSheetContent(){},
  renderDaySheetContent(){},
  document: {
    body: { style: {}, classList: { contains: cls => cls === "sheet-open" } },
    addEventListener(type, handler, options){
      documentListeners[type] = { handler, options };
    }
  },
  window: {
    setTimeout,
    addEventListener(){}
  },
  $(id){
    if(id === "sheet") return sheet;
    if(id === "overlay") return overlay;
    if(id === "hourlyScroll") return hourlyScroll;
    throw new Error("Unexpected selector: " + id);
  }
};

const touchJs = fs.readFileSync(path.join(__dirname, "..", "js", "touch.js"), "utf8");
vm.runInNewContext(touchJs, context);

assert.ok(documentListeners.touchmove, "touch.js should install a document touch guard");
assert.equal(documentListeners.touchmove.options.passive, false, "document touch guard must be non-passive so it can prevent background scroll");

let preventedOutside = false;
documentListeners.touchmove.handler({
  target: { insideSheet: false },
  cancelable: true,
  preventDefault(){
    preventedOutside = true;
  }
});
assert.equal(preventedOutside, true, "touchmove outside an open sheet should be prevented");

let preventedInside = false;
documentListeners.touchmove.handler({
  target: { insideSheet: true },
  cancelable: true,
  preventDefault(){
    preventedInside = true;
  }
});
assert.equal(preventedInside, false, "touchmove inside the sheet should remain available for sheet scrolling");

let preventedNonCancelable = false;
documentListeners.touchmove.handler({
  target: { insideSheet: false },
  cancelable: false,
  preventDefault(){
    preventedNonCancelable = true;
  }
});
assert.equal(preventedNonCancelable, false, "non-cancelable touchmove events should not call preventDefault");
