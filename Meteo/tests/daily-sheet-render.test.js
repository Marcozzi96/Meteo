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

const context = {
  console,
  state: {
    name: "Roma",
    data: {
      timezone: "Europe/Rome",
      utc_offset_seconds: 7200,
      daily: {
        time: ["2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"],
        weather_code: [0, 1, 2, 3, 45, 61, 80],
        temperature_2m_min: [20, 21, 19, 18, 20, 22, 21],
        temperature_2m_max: [30, 31, 29, 28, 30, 32, 31],
        precipitation_probability_max: [0, 10, 20, 30, 40, 50, 60],
        precipitation_sum: [0, 1, 2, 3, 4, 5, 6],
        wind_speed_10m_max: [8, 9, 10, 11, 12, 13, 14],
        wind_direction_10m_dominant: [0, 45, 90, 135, 180, 225, 270],
        uv_index_max: [6, 6.5, 7, 7.5, 8, 8.5, 9],
        sunrise: ["2026-07-30T06:00", "2026-07-31T06:01", "2026-08-01T06:02", "2026-08-02T06:03", "2026-08-03T06:04", "2026-08-04T06:05", "2026-08-05T06:06"],
        sunset: ["2026-07-30T20:30", "2026-07-31T20:29", "2026-08-01T20:28", "2026-08-02T20:27", "2026-08-03T20:26", "2026-08-04T20:25", "2026-08-05T20:24"]
      }
    }
  },
  DOW: ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"],
  MONTHS: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"],
  wmoInfo(){
    return { icon: "☀️", label: "Sereno" };
  },
  windDir(){
    return "N";
  },
  uvLabel(){
    return "Alto";
  },
  fmtTime(value){
    return value.slice(11, 16);
  },
  $(id){
    if(elements[id]) return elements[id];
    return createElement();
  },
  document: { documentElement: createElement(), body: createElement() },
  Array,
  Math,
  Date,
  Intl,
  setInterval,
  clearInterval
};

const uiJs = fs.readFileSync(path.join(__dirname, "..", "js", "ui.js"), "utf8");
vm.runInNewContext(uiJs, context);

context.openDaySheet(2);

assert.equal(elements.sheet.dataset.dayIndex, "2", "daily sheet should store the current day index");
assert.equal(elements.sheet.dataset.dayMin, "0", "daily sheet should store the first navigable day");
assert.equal(elements.sheet.dataset.dayMax, "6", "daily sheet should store the last navigable day");
assert.ok(elements.sheetContent.innerHTML.includes("day-sheet-viewport"), "daily sheet should render a swipe viewport");
assert.ok(elements.sheetContent.innerHTML.includes('data-day-panel="1"'), "daily sheet should include the previous day panel");
assert.ok(elements.sheetContent.innerHTML.includes('data-day-panel="2"'), "daily sheet should include the current day panel");
assert.ok(elements.sheetContent.innerHTML.includes('data-day-panel="3"'), "daily sheet should include the next day panel");
assert.ok(elements.sheetContent.innerHTML.includes("29° / 19°"), "daily sheet should show max temperature before min temperature");
