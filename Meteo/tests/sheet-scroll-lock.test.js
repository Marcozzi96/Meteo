"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function createElement(){
  const classes = new Set();
  return {
    style: {},
    dataset: {},
    innerHTML: "",
    textContent: "",
    classList: {
      add: cls => classes.add(cls),
      remove: cls => classes.delete(cls),
      contains: cls => classes.has(cls),
      toggle(cls, force){
        if(force) classes.add(cls);
        else classes.delete(cls);
      }
    }
  };
}

const elements = {
  sheet: createElement(),
  overlay: createElement(),
  sheetContent: createElement()
};
const documentElement = createElement();
const body = createElement();
let restoredScroll = null;

const context = {
  console,
  state: { data: { current: {}, daily: {} } },
  document: { documentElement, body },
  window: {
    scrollY: 123,
    pageYOffset: 123,
    scrollTo(optionsOrX, y){
      if(typeof optionsOrX === "object"){
        restoredScroll = [optionsOrX.left, optionsOrX.top, optionsOrX.behavior];
        return;
      }
      restoredScroll = [optionsOrX, y];
    }
  },
  Array,
  Math,
  Date,
  Intl,
  setInterval,
  clearInterval,
  $(id){
    if(elements[id]) return elements[id];
    return createElement();
  }
};

const uiJs = fs.readFileSync(path.join(__dirname, "..", "js", "ui.js"), "utf8");
vm.runInNewContext(uiJs, context);

context.openSheet("<p>Dettaglio</p>");

assert.equal(body.classList.contains("sheet-open"), true, "opening a sheet should mark the body as locked");
assert.equal(documentElement.classList.contains("sheet-open"), true, "opening a sheet should mark html as locked");
assert.equal(body.style.top || "", "", "opening a sheet should not offset the fixed body");
assert.notEqual(body.style.position, "fixed", "opening a sheet should not fix the body because that jumps on mobile unlock");

context.closeSheet();

assert.equal(body.classList.contains("sheet-open"), false, "closing a sheet should unlock the body");
assert.equal(documentElement.classList.contains("sheet-open"), false, "closing a sheet should unlock html");
assert.equal(body.style.top || "", "", "closing a sheet should leave body offset untouched");
assert.equal(restoredScroll, null, "closing a sheet should not call scrollTo because the page was never repositioned");
