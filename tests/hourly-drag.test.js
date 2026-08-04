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
      return target === this;
    }
  };
}

const sheet = createElement();
const overlay = createElement();
const hourlyScroll = createElement();
hourlyScroll.scrollLeft = 100;

const windowListeners = {};
const context = {
  console,
  closeSheet(){},
  renderHourSheetContent(){},
  document: {
    body: { style: {}, classList: { contains(){ return false; } } },
    addEventListener(){}
  },
  window: {
    setTimeout,
    addEventListener(type, handler){
      if(!windowListeners[type]) windowListeners[type] = [];
      windowListeners[type].push(handler);
    }
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

assert.ok(hourlyScroll.listeners.mousedown, "hourlyScroll should register a mouse drag handler");

let prevented = false;
hourlyScroll.listeners.mousedown({
  button: 0,
  clientX: 200,
  target: hourlyScroll,
  preventDefault(){
    prevented = true;
  }
});
windowListeners.mousemove.forEach(handler => handler({
  clientX: 150,
  preventDefault(){
    prevented = true;
  }
}));
windowListeners.mouseup.forEach(handler => handler());

assert.equal(hourlyScroll.scrollLeft, 150, "dragging left should scroll the hourly strip to the right");
assert.equal(prevented, true, "mouse dragging should prevent text selection/default dragging");
