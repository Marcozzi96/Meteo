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
elements.sheetContent.addEventListener = () => {};

const context = {
  console,
  state: {
    data: {
      timezone: "Europe/Rome",
      utc_offset_seconds: 7200,
      current: { time: "2026-08-01T12:00" },
      hourly: {
        time: [
          "2026-08-01T12:00:00", "2026-08-01T13:00:00", "2026-08-01T14:00:00",
          "2026-08-01T15:00:00", "2026-08-01T16:00:00"
        ],
        temperature_2m: [31, 32, 33, 32, 30],
        apparent_temperature: [33, 34, 35, 34, 32],
        precipitation_probability: [10, 20, 30, 20, 10],
        precipitation: [0, 0, 1, 0, 0],
        relative_humidity_2m: [55, 50, 45, 50, 55],
        weather_code: [0, 1, 2, 1, 0],
        is_day: [1, 1, 1, 1, 1],
        wind_speed_10m: [12, 13, 14, 13, 11],
        wind_direction_10m: [180, 190, 200, 190, 170],
        uv_index: [6, 7, 8, 7, 5],
        visibility: [10000, 10000, 9000, 10000, 10000]
      },
      airQuality: {
        hourly: {
          time: [
            "2026-08-01T12:00:00", "2026-08-01T13:00:00", "2026-08-01T14:00:00",
            "2026-08-01T15:00:00", "2026-08-01T16:00:00"
          ],
          european_aqi: [42, 45, 48, 44, 40],
          pm2_5: [12, 13, 14, 13, 11],
          pm10: [24, 26, 28, 25, 22],
          nitrogen_dioxide: [18, 19, 20, 18, 16],
          ozone: [55, 56, 57, 55, 54]
        }
      }
    }
  },
  DOW: ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"],
  MONTHS: ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"],
  wmoInfo(){
    return { icon: "☀️", label: "Sereno" };
  },
  windDir(){
    return "S";
  },
  uvLabel(){
    return "Alto";
  },
  fmtTime(value){
    return value.slice(11, 16);
  },
  toCorrectedDate(iso, utcOffsetSeconds){
    if(iso instanceof Date) return iso;
    if(utcOffsetSeconds == null) return new Date(iso);
    const sign = utcOffsetSeconds >= 0 ? "+" : "-";
    const abs = Math.abs(utcOffsetSeconds);
    const h = Math.floor(abs / 3600).toString().padStart(2, "0");
    const m = Math.floor((abs % 3600) / 60).toString().padStart(2, "0");
    return new Date(iso + sign + h + ":" + m);
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

// Default: il tab attivo deve essere "meteo"
context.renderHourSheetContent(1);
const htmlDefault = elements.sheetContent.innerHTML;
assert.ok(htmlDefault.includes('data-sheet-tab="meteo"'), "hour sheet should have Meteo tab");
assert.ok(htmlDefault.includes('data-sheet-tab="aria"'), "hour sheet should have Aria tab");
assert.ok(htmlDefault.includes('data-sheet-tab-panel="aria"'), "hour sheet should have Aria panel");

// Verifica che il panel corrente abbia il tab meteo attivo di default
const currentPanelDefault = htmlDefault.match(/<section class="hour-sheet-panel current"[^>]*>(.*?)<\/section>/s)[1];
assert.ok(currentPanelDefault.includes('data-sheet-tab="meteo"'), "current hour panel should default to Meteo tab");
assert.ok(!currentPanelDefault.includes('data-sheet-tab="aria" class="sheet-tab active"'), "current hour panel should not have Aria active by default");

// Seleziono il tab aria e ri-renderizzo: tutti i panel devono avere aria attivo
elements.sheet.dataset.sheetActiveTab = "aria";
context.renderHourSheetContent(2);
const htmlActive = elements.sheetContent.innerHTML;
const panels = htmlActive.match(/<section class="hour-sheet-panel[^"]*"[^>]*>(.*?)<\/section>/gs);
assert.ok(panels && panels.length === 3, "hour sheet should have three panels");
panels.forEach((panel, idx) => {
  if(panel.includes('class="hour-sheet-panel empty"')) return;
  assert.ok(panel.includes('data-sheet-tab="aria"'), `panel ${idx} should have Aria tab`);
  assert.ok(panel.includes('data-sheet-tab-panel="aria"'), `panel ${idx} should have Aria panel`);
});
