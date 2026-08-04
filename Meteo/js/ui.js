"use strict";

const sheet = $("sheet");
const overlay = $("overlay");
const sheetContent = $("sheetContent");

if(sheetContent.addEventListener){
  sheetContent.addEventListener("click", e => {
    const tab = e.target.closest("[data-sheet-tab]");
    if(!tab) return;
    e.preventDefault();
    const wrap = tab.closest(".sheet-tabs-wrap");
    if(!wrap) return;
    const tabName = tab.dataset.sheetTab;
    sheet.dataset.sheetActiveTab = tabName;
    wrap.querySelectorAll("[data-sheet-tab]").forEach(t => t.classList.toggle("active", t === tab));
    wrap.querySelectorAll("[data-sheet-tab-panel]").forEach(p => p.classList.toggle("active", p.dataset.sheetTabPanel === tabName));
  });
}

/* ================= Rendering ================= */
function setWeatherTheme(code, isDay){
  const temp = state.data && state.data.current ? state.data.current.temperature_2m : null;
  applyTheme(code, isDay, temp);
}

let clockTimer = null;

function formatZonedTime(date, timeZone){
  try{
    return new Intl.DateTimeFormat("it-IT", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  }catch(e){
    return fmtTime(date);
  }
}

function startClock(){
  if(clockTimer) clearInterval(clockTimer);
  const tz = state.data && state.data.timezone;
  if(!tz) return;
  const update = () => {
    const el = $("locSub");
    const base = state.sub || "";
    const time = formatZonedTime(new Date(), tz);
    el.textContent = base ? base + " · " + time : time;
  };
  update();
  clockTimer = setInterval(update, 60000);
}

function hasValue(value){
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function rounded(value, suffix){
  return hasValue(value) ? Math.round(Number(value)) + (suffix || "") : "N/D";
}

function decimal(value, suffix){
  return hasValue(value) ? Number(value).toFixed(1) + (suffix || "") : "N/D";
}

function aqiLabel(value){
  if(!hasValue(value)) return "";
  const v = Number(value);
  if(v <= 20) return "Buona";
  if(v <= 40) return "Discreta";
  if(v <= 60) return "Moderata";
  if(v <= 80) return "Scarsa";
  if(v <= 100) return "Cattiva";
  return "Pessima";
}

function aqiIcon(value){
  if(!hasValue(value)) return "🌬️";
  const v = Number(value);
  if(v <= 20) return "🍃";
  if(v <= 40) return "🌿";
  if(v <= 60) return "😷";
  if(v <= 80) return "🤢";
  if(v <= 100) return "☠️";
  return "💀";
}

function airQualityHtml(aq){
  if(!aq || !hasValue(aq.european_aqi)) return "";
  const cells = [
    cell(`${aqiIcon(aq.european_aqi)} Indice AQI`, rounded(aq.european_aqi), aqiLabel(aq.european_aqi)),
    hasValue(aq.pm2_5) ? cell("🏭 PM2.5", rounded(aq.pm2_5) + " µg/m³") : "",
    hasValue(aq.pm10) ? cell("🌫️ PM10", rounded(aq.pm10) + " µg/m³") : "",
    hasValue(aq.nitrogen_dioxide) ? cell("🚗 NO₂", rounded(aq.nitrogen_dioxide) + " µg/m³") : "",
    hasValue(aq.ozone) ? cell("☀️ O₃", rounded(aq.ozone) + " µg/m³") : ""
  ];
  return `<div class="grid">${cells.join("")}</div>`;
}

function sheetTabsHtml(tabs, activeId){
  const active = activeId || tabs[0].id;
  const buttons = tabs.map(t => `
    <button class="sheet-tab${t.id === active ? " active" : ""}" data-sheet-tab="${t.id}">${t.label}</button>`).join("");
  const panels = tabs.map(t => `
    <div class="sheet-tab-panel${t.id === active ? " active" : ""}" data-sheet-tab-panel="${t.id}">${t.html}</div>`).join("");
  return `<div class="sheet-tabs-wrap">
    <div class="sheet-tabs">${buttons}</div>
    <div class="sheet-tab-panels">${panels}</div>
  </div>`;
}

function findAirQualityIndexForDay(dayIndex){
  const aq = state.data.airQuality && state.data.airQuality.hourly;
  if(!aq || !aq.time) return null;
  const dayStr = state.data.daily.time[dayIndex];
  const target = dayStr + "T12:00:00";
  let idx = aq.time.indexOf(target);
  if(idx !== -1) return idx;
  idx = aq.time.findIndex(t => t.startsWith(dayStr));
  return idx !== -1 ? idx : null;
}

function arrayValue(values, index){
  return values && index < values.length ? values[index] : null;
}

function renderCurrent(){
  const c = state.data.current, d = state.data.currentDaily;
  const info = wmoInfo(c.weather_code, c.is_day);
  $("curTemp").textContent = rounded(c.temperature_2m, "°");
  $("curCond").textContent = info.label;
  $("curIcon").textContent = info.icon;
  $("curFeels").textContent = "Percepiti " + rounded(c.apparent_temperature, "°");
  $("curMax").textContent = rounded(arrayValue(d.temperature_2m_max, 0), "°");
  $("curMin").textContent = rounded(arrayValue(d.temperature_2m_min, 0), "°");
  setWeatherTheme(c.weather_code, c.is_day);
}

function renderHourly(){
  const h = state.data.hourly, wrap = $("hourlyScroll");
  wrap.innerHTML = "";
  const nowIdx = findNowIndex();
  const start = Math.max(0, nowIdx);
  for(let i = start; i < Math.min(start + 24, h.time.length); i++){
    const info = wmoInfo(h.weather_code[i], h.is_day[i]);
    const el = document.createElement("div");
    el.className = "hour" + (i === nowIdx ? " now" : "");
    el.innerHTML = `<div class="h-time">${i === nowIdx ? "Ora" : fmtTime(h.time[i], state.data.timezone, state.data.utc_offset_seconds)}</div>
      <div class="h-icon">${info.icon}</div>
      <div class="h-temp">${rounded(arrayValue(h.temperature_2m, i), "°")}</div>
      <div class="h-pop">${hasValue(arrayValue(h.precipitation_probability, i)) ? (h.precipitation_probability[i] > 0 ? "💧" + h.precipitation_probability[i] + "%" : "") : "N/D"}</div>`;
    el.addEventListener("click", () => openHourSheet(i));
    wrap.appendChild(el);
  }
}

function findNowIndex(){
  const h = state.data.hourly;
  const offset = state.data.utc_offset_seconds;
  // usa l'ora locale della località fornita dall'API (current.time)
  const now = toCorrectedDate(state.data.current.time, offset);
  for(let i = 0; i < h.time.length; i++){ if(toCorrectedDate(h.time[i], offset) >= now) return Math.max(0, i); }
  return h.time.length - 1;
}

function renderDaily(){
  const d = state.data.daily, wrap = $("dailyList");
  wrap.innerHTML = "";
  for(let i = 0; i < 7; i++){
    const date = new Date(d.time[i] + "T12:00:00");
    const info = wmoInfo(d.weather_code[i], 1);
    const name = i === 0 ? "Oggi" : (i === 1 ? "Domani" : DOW[date.getDay()]);
    const el = document.createElement("div");
    el.className = "day card" + (i === 0 ? " today" : "");
    el.innerHTML = `<span class="d-name">${name}</span>
      <span class="d-pop">${hasValue(arrayValue(d.precipitation_probability_max, i)) ? (d.precipitation_probability_max[i] > 0 ? "💧" + d.precipitation_probability_max[i] + "%" : "") : "N/D"}</span>
      <span class="d-icon">${info.icon}</span>
      <span class="d-temps">${rounded(arrayValue(d.temperature_2m_max, i), "°")} / <span class="min">${rounded(arrayValue(d.temperature_2m_min, i), "°")}</span></span>`;
    el.addEventListener("click", () => openDaySheet(i));
    wrap.appendChild(el);
  }
}

/* ================= Schede dettaglio ================= */
function cell(label, value, extra){
  return `<div class="cell"><div class="c-label">${label}</div><div class="c-value">${value}</div>${extra ? `<div class="c-extra">${extra}</div>` : ""}</div>`;
}

function openSheet(html){
  sheetContent.innerHTML = html;
  lockPageScroll();
  sheet.classList.add("open");
  sheet.style.transform = "";
  overlay.classList.add("open");
  overlay.style.opacity = "";
}

function closeSheet(){
  sheet.classList.remove("open");
  sheet.style.transform = "";
  overlay.classList.remove("open");
  overlay.style.opacity = "";
  sheet.classList.remove("dragging");
  sheet.classList.remove("hour-swiping");
  sheet.classList.remove("sheet-swiping");
  unlockPageScroll();
  delete sheet.dataset.hourIndex;
  delete sheet.dataset.hourMin;
  delete sheet.dataset.hourMax;
  delete sheet.dataset.dayIndex;
  delete sheet.dataset.dayMin;
  delete sheet.dataset.dayMax;
  delete sheet.dataset.sheetActiveTab;
}

function lockPageScroll(){
  const root = document.documentElement;
  if(document.body.classList.contains("sheet-open")) return;
  root.classList.add("sheet-open");
  document.body.classList.add("sheet-open");
}

function unlockPageScroll(){
  const root = document.documentElement;
  if(!document.body.classList.contains("sheet-open")) return;
  root.classList.remove("sheet-open");
  document.body.classList.remove("sheet-open");
}

function openCurrentSheet(){
  const c = state.data.current, d = state.data.currentDaily;
  const info = wmoInfo(c.weather_code, c.is_day);
  const aq = state.data.airQuality && state.data.airQuality.current;
  const meteoHtml = `<div class="grid">
    ${cell("Percepita", rounded(c.apparent_temperature, "°C"))}
    ${cell("Umidità", rounded(c.relative_humidity_2m, "%"))}
    ${cell("Vento", hasValue(c.wind_speed_10m) && hasValue(c.wind_direction_10m) ? rounded(c.wind_speed_10m, " km/h") + " " + windDir(c.wind_direction_10m) : "N/D", hasValue(c.wind_gusts_10m) ? "Raffiche " + rounded(c.wind_gusts_10m, " km/h") : "")}
    ${cell("Pressione", rounded(c.pressure_msl, " hPa"))}
    ${cell("Nuvolosità", rounded(c.cloud_cover, "%"))}
    ${cell("Precipitazioni", hasValue(c.precipitation) ? c.precipitation + " mm" : "N/D")}
    ${cell("Alba", "🌅 " + fmtTime(d.sunrise[0], state.data.timezone, state.data.utc_offset_seconds))}
    ${cell("Tramonto", "🌇 " + fmtTime(d.sunset[0], state.data.timezone, state.data.utc_offset_seconds))}
  </div>`;
  const tabs = [{ id: "meteo", label: "Meteo", html: meteoHtml }];
  const ariaHtml = airQualityHtml(aq);
  if(ariaHtml) tabs.push({ id: "aria", label: "Aria", html: ariaHtml });
  openSheet(`
    <div class="sheet-head"><div class="s-icon">${info.icon}</div>
      <div><div class="s-title">Condizioni attuali</div><div class="s-sub">${state.name} · ${info.label}</div></div></div>
    <div class="sheet-big">${rounded(c.temperature_2m, "°C")}</div>
    ${sheetTabsHtml(tabs, "meteo")}`);
}

function hourDetailHtml(i, activeTab){
  const h = state.data.hourly;
  const date = new Date(h.time[i]);
  const info = wmoInfo(h.weather_code[i], h.is_day[i]);
  const dateStr = DOW[date.getDay()] + " " + date.getDate() + " " + MONTHS[date.getMonth()];
  const meteoHtml = `<div class="grid">
${cell("Percepita", rounded(arrayValue(h.apparent_temperature, i), "°C"))}
${cell("Prob. precipitazioni", hasValue(arrayValue(h.precipitation_probability, i)) ? h.precipitation_probability[i] + "%" : "N/D", hasValue(arrayValue(h.precipitation, i)) ? h.precipitation[i] + " mm previsti" : "")}
${cell("Umidità", rounded(arrayValue(h.relative_humidity_2m, i), "%"))}
${cell("Vento", hasValue(arrayValue(h.wind_speed_10m, i)) && hasValue(arrayValue(h.wind_direction_10m, i)) ? rounded(h.wind_speed_10m[i], " km/h") + " " + windDir(h.wind_direction_10m[i]) : "N/D")}
${cell("Indice UV", hasValue(arrayValue(h.uv_index, i)) ? decimal(h.uv_index[i]) : "N/D", hasValue(arrayValue(h.uv_index, i)) ? uvLabel(h.uv_index[i]) : "")}
${cell("Visibilità", hasValue(arrayValue(h.visibility, i)) ? decimal(h.visibility[i] / 1000, " km") : "N/D")}
</div>`;
  const tabs = [{ id: "meteo", label: "Meteo", html: meteoHtml }];
  const aqHourly = state.data.airQuality && state.data.airQuality.hourly;
  if(aqHourly && hasValue(arrayValue(aqHourly.european_aqi, i))){
    const aq = {
      european_aqi: aqHourly.european_aqi[i],
      pm2_5: arrayValue(aqHourly.pm2_5, i),
      pm10: arrayValue(aqHourly.pm10, i),
      nitrogen_dioxide: arrayValue(aqHourly.nitrogen_dioxide, i),
      ozone: arrayValue(aqHourly.ozone, i)
    };
    const ariaHtml = airQualityHtml(aq);
    if(ariaHtml) tabs.push({ id: "aria", label: "Aria", html: ariaHtml });
  }
  const active = tabs.some(t => t.id === activeTab) ? activeTab : "meteo";
  return `<div class="sheet-head"><div class="s-icon">${info.icon}</div>
<div><div class="s-title">Ore ${fmtTime(h.time[i], state.data.timezone, state.data.utc_offset_seconds)}</div><div class="s-sub">${dateStr} · ${info.label}</div></div></div>
<div class="sheet-big">${rounded(arrayValue(h.temperature_2m, i), "°C")}</div>
${sheetTabsHtml(tabs, active)}`;
}

function getHourSheetBounds(){
  const h = state.data.hourly;
  const nowIdx = findNowIndex();
  const min = Math.max(0, nowIdx);
  const max = Math.min(min + 24, h.time.length) - 1;
  return { min, max };
}

function renderHourSheetContent(i){
  const bounds = getHourSheetBounds();
  const prev = i > bounds.min ? i - 1 : null;
  const next = i < bounds.max ? i + 1 : null;
  const activeTab = sheet.dataset.sheetActiveTab || "meteo";

  sheetContent.innerHTML = `<div class="hour-sheet-viewport">
<div class="hour-sheet-strip" style="transform:translateX(-33.333%);">
<section class="hour-sheet-panel${prev == null ? " empty" : ""}" data-hour-panel="${prev != null ? prev : ""}"${prev == null ? ' aria-hidden="true"' : ""}>${prev != null ? hourDetailHtml(prev, activeTab) : ""}</section>
<section class="hour-sheet-panel current" data-hour-panel="${i}">${hourDetailHtml(i, activeTab)}</section>
<section class="hour-sheet-panel${next == null ? " empty" : ""}" data-hour-panel="${next != null ? next : ""}"${next == null ? ' aria-hidden="true"' : ""}>${next != null ? hourDetailHtml(next, activeTab) : ""}</section>
</div>
</div>`;

  sheet.dataset.hourIndex = i;
  sheet.dataset.hourMin = bounds.min;
  sheet.dataset.hourMax = bounds.max;
}

function openHourSheet(i){
  openSheet("");
  renderHourSheetContent(i);
}

function openDaySheet(i){
  openSheet("");
  renderDaySheetContent(i);
}

function dayDetailHtml(i, activeTab){
  const d = state.data.daily;
  const date = new Date(d.time[i] + "T12:00:00");
  const info = wmoInfo(d.weather_code[i], 1);
  const dateStr = DOW[date.getDay()] + " " + date.getDate() + " " + MONTHS[date.getMonth()];
  const meteoHtml = `<div class="grid">
    ${cell("Prob. precipitazioni", hasValue(arrayValue(d.precipitation_probability_max, i)) ? d.precipitation_probability_max[i] + "%" : "N/D", hasValue(arrayValue(d.precipitation_sum, i)) ? d.precipitation_sum[i] + " mm totali" : "")}
    ${cell("Vento max", hasValue(arrayValue(d.wind_speed_10m_max, i)) && hasValue(arrayValue(d.wind_direction_10m_dominant, i)) ? rounded(d.wind_speed_10m_max[i], " km/h") + " " + windDir(d.wind_direction_10m_dominant[i]) : "N/D")}
    ${cell("Indice UV max", hasValue(arrayValue(d.uv_index_max, i)) ? decimal(d.uv_index_max[i]) : "N/D", hasValue(arrayValue(d.uv_index_max, i)) ? uvLabel(d.uv_index_max[i]) : "")}
    ${cell("Alba", "🌅 " + fmtTime(d.sunrise[i], state.data.timezone, state.data.utc_offset_seconds))}
    ${cell("Tramonto", "🌇 " + fmtTime(d.sunset[i], state.data.timezone, state.data.utc_offset_seconds))}
  </div>`;
  const tabs = [{ id: "meteo", label: "Meteo", html: meteoHtml }];
  const aqIdx = findAirQualityIndexForDay(i);
  if(aqIdx !== null){
    const aqHourly = state.data.airQuality.hourly;
    const aq = {
      european_aqi: arrayValue(aqHourly.european_aqi, aqIdx),
      pm2_5: arrayValue(aqHourly.pm2_5, aqIdx),
      pm10: arrayValue(aqHourly.pm10, aqIdx),
      nitrogen_dioxide: arrayValue(aqHourly.nitrogen_dioxide, aqIdx),
      ozone: arrayValue(aqHourly.ozone, aqIdx)
    };
    const ariaHtml = airQualityHtml(aq);
    if(ariaHtml) tabs.push({ id: "aria", label: "Aria", html: ariaHtml });
  }
  const active = tabs.some(t => t.id === activeTab) ? activeTab : "meteo";
  return `<div class="sheet-head"><div class="s-icon">${info.icon}</div>
    <div><div class="s-title">${i === 0 ? "Oggi" : dateStr}</div><div class="s-sub">${info.label}</div></div></div>
  <div class="sheet-big">${rounded(arrayValue(d.temperature_2m_max, i), "°")} / ${rounded(arrayValue(d.temperature_2m_min, i), "°")}</div>
  ${sheetTabsHtml(tabs, active)}`;
}

function renderDaySheetContent(i){
  const min = 0;
  const max = Math.min(7, state.data.daily.time.length) - 1;
  const prev = i > min ? i - 1 : null;
  const next = i < max ? i + 1 : null;
  const activeTab = sheet.dataset.sheetActiveTab || "meteo";

  sheetContent.innerHTML = `<div class="day-sheet-viewport">
<div class="day-sheet-strip" style="transform:translateX(-33.333%);">
<section class="day-sheet-panel${prev == null ? " empty" : ""}" data-day-panel="${prev != null ? prev : ""}"${prev == null ? ' aria-hidden="true"' : ""}>${prev != null ? dayDetailHtml(prev, activeTab) : ""}</section>
<section class="day-sheet-panel current" data-day-panel="${i}">${dayDetailHtml(i, activeTab)}</section>
<section class="day-sheet-panel${next == null ? " empty" : ""}" data-day-panel="${next != null ? next : ""}"${next == null ? ' aria-hidden="true"' : ""}>${next != null ? dayDetailHtml(next, activeTab) : ""}</section>
</div>
</div>`;

  sheet.dataset.dayIndex = i;
  sheet.dataset.dayMin = min;
  sheet.dataset.dayMax = max;
}

function modelOptionsHtml(section){
  return WEATHER_MODELS.map(model => `
    <label class="model-option">
      <input type="radio" name="model-${section}" value="${model.id}" ${state.models[section] === model.id ? "checked" : ""}>
      <span class="model-option-text"><strong>${model.label}</strong><small>${model.description}</small></span>
    </label>`).join("");
}

function openSettingsSheet(){
  openSheet(`
    <div class="settings-title">⚙️ Modelli meteorologici</div>
    <div class="settings-intro">Scegli separatamente la fonte delle previsioni. Automatico è consigliato per la maggior parte delle località.</div>
    <fieldset class="model-group">
      <legend>Adesso e prossime 24 ore</legend>
      ${modelOptionsHtml("short")}
    </fieldset>
    <fieldset class="model-group">
      <legend>Prossimi 7 giorni</legend>
      ${modelOptionsHtml("weekly")}
    </fieldset>
    <div class="model-note">Alcuni modelli non forniscono probabilità di pioggia, indice UV o visibilità. In questi casi il valore viene indicato come N/D.</div>`);

  sheetContent.querySelectorAll('.model-option input').forEach(input => {
    input.addEventListener("change", () => {
      const section = input.name === "model-short" ? "short" : "weekly";
      changeWeatherModel(section, input.value);
    });
  });
}
