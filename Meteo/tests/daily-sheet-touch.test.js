"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function createElement(){
  const listeners = {};
  const classes = new Set();
  const strip = { style: {} };
  return {
    listeners,
    strip,
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
    querySelector(selector){
      if(selector === ".day-sheet-strip") return strip;
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
sheet.dataset.dayIndex = "2";
sheet.dataset.dayMin = "0";
sheet.dataset.dayMax = "6";
const overlay = createElement();
const hourlyScroll = createElement();

const windowListeners = {};
let renderedDayIndex = null;
const context = {
  console,
  closeSheet(){},
  renderHourSheetContent(){},
  renderDaySheetContent(i){
    renderedDayIndex = i;
  },
  document: {
    body: { style: {}, classList: { contains(){ return false; } } },
    addEventListener(){}
  },
  window: {
    setTimeout(fn){
      fn();
    },
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

sheet.listeners.mousedown({
  button: 0,
  clientX: 200,
  clientY: 100,
  target: sheet
});
windowListeners.mousemove.forEach(handler => handler({
  clientX: 120,
  clientY: 105,
  preventDefault(){}
}));
windowListeners.mouseup.forEach(handler => handler());

assert.equal(renderedDayIndex, 3, "swiping left on a daily detail sheet should render the next day");
assert.equal(sheet.strip.style.transform, "translateX(-66.666%)", "daily sheet should animate toward the next panel");
