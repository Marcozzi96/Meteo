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

function makeContext(airQuality){
  return {
    console,
    state: {
      name: "Roma",
      data: {
        timezone: "Europe/Rome",
        utc_offset_seconds: 7200,
        current: {
          time: "2026-08-01T12:00",
          temperature_2m: 31,
          apparent_temperature: 33,
          relative_humidity_2m: 55,
          weather_code: 0,
          is_day: 1,
          wind_speed_10m: 12,
          wind_direction_10m: 180,
          wind_gusts_10m: 20,
          pressure_msl: 1015,
          cloud_cover: 10,
          precipitation: 0
        },
        currentDaily: {
          sunrise: ["2026-08-01T06:00"],
          sunset: ["2026-08-01T20:30"]
        },
        airQuality: airQuality
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
}

const uiJs = fs.readFileSync(path.join(__dirname, "..", "js", "ui.js"), "utf8");

// 1) Air quality presente: deve comparire la cella
{
  const context = makeContext({
    current: {
      european_aqi: 42,
      pm2_5: 12,
      pm10: 24,
      nitrogen_dioxide: 18,
      ozone: 55
    }
  });
  vm.runInNewContext(uiJs, context);
  context.openCurrentSheet();
  const html = elements.sheetContent.innerHTML;
  assert.ok(html.includes("data-sheet-tab=\"meteo\""), "current sheet should have the Meteo tab");
  assert.ok(html.includes("data-sheet-tab=\"aria\""), "current sheet should have the Aria tab");
  assert.ok(html.includes("data-sheet-tab-panel=\"aria\""), "current sheet should have the Aria panel");
  assert.ok(html.includes("Indice AQI"), "current sheet should include the AQI cell");
  assert.ok(html.includes("42"), "current sheet should show the AQI value");
  assert.ok(html.includes("Moderata"), "current sheet should show the AQI label");
  assert.ok(/[🍃🌿😷🤢☠️💀]/.test(html), "current sheet should show an AQI icon");
  assert.ok(html.includes("🏭 PM2.5"), "current sheet should show the PM2.5 cell with icon");
  assert.ok(html.includes("🌫️ PM10"), "current sheet should show the PM10 cell with icon");
  assert.ok(html.includes("🚗 NO₂"), "current sheet should show the NO₂ cell with icon");
  assert.ok(html.includes("☀️ O₃"), "current sheet should show the O₃ cell with icon");
}

// 2) Air quality assente: non deve comparire la cella
{
  const context = makeContext(null);
  vm.runInNewContext(uiJs, context);
  elements.sheetContent.innerHTML = "";
  context.openCurrentSheet();
  const html = elements.sheetContent.innerHTML;
  assert.ok(html.includes("data-sheet-tab=\"meteo\""), "current sheet should still have the Meteo tab");
  assert.ok(!html.includes("data-sheet-tab=\"aria\""), "current sheet should omit the Aria tab when data is missing");
  assert.ok(!html.includes("Indice AQI"), "current sheet should omit the AQI cell when data is missing");
}
