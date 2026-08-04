"use strict";

const MODEL_STORAGE_KEY = "meteo-oggi-models";

function loadModelPreferences(){
  const defaults = { short: "auto", weekly: "auto" };
  try{
    const saved = JSON.parse(localStorage.getItem(MODEL_STORAGE_KEY));
    ["short", "weekly"].forEach(section => {
      if(saved && WEATHER_MODELS.some(model => model.id === saved[section])) defaults[section] = saved[section];
    });
  }catch(e){ /* localStorage non disponibile */ }
  return defaults;
}

function saveModelPreferences(models){
  try{ localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(models)); }catch(e){ /* ignore */ }
}

let state = { lat: null, lon: null, name: "", sub: "", data: null, models: loadModelPreferences() };
const currentCard = $("currentCard");
const loading = $("loading");
const searchPanel = $("searchPanel");
const searchInput = $("searchInput");
const searchResults = $("searchResults");
const clearSearch = $("clearSearch");

/* ================= Ricerca località ================= */
let searchTimer = null;
const COORD_SCALE = 10000;

function encodeCoords(lat, lon){
  const safeLat = Math.max(-90, Math.min(90, Number(lat)));
  const safeLon = Math.max(-180, Math.min(180, Number(lon)));
  const latEnc = Math.round((safeLat + 90) * COORD_SCALE).toString(36);
  const lonEnc = Math.round((safeLon + 180) * COORD_SCALE).toString(36);
  return `${latEnc}.${lonEnc}`;
}

function decodeCoords(token){
  if(!token) return null;
  const parts = token.split(".");
  if(parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const latInt = parseInt(parts[0], 36);
  const lonInt = parseInt(parts[1], 36);
  if(!Number.isFinite(latInt) || !Number.isFinite(lonInt)) return null;
  const lat = latInt / COORD_SCALE - 90;
  const lon = lonInt / COORD_SCALE - 180;
  if(lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function updateShareUrl(lat, lon){
  try{
    const url = new URL(location.href);
    url.searchParams.set("p", encodeCoords(lat, lon));
    url.searchParams.delete("c");
    url.searchParams.delete("lat");
    url.searchParams.delete("lon");
    url.searchParams.delete("name");
    url.searchParams.delete("sub");
    history.replaceState(null, "", url.toString());
  }catch(e){ /* ignore */ }
}

function updateCityUrl(name){
  try{
    const url = new URL(location.href);
    url.searchParams.set("c", name);
    url.searchParams.delete("p");
    url.searchParams.delete("lat");
    url.searchParams.delete("lon");
    url.searchParams.delete("name");
    url.searchParams.delete("sub");
    history.replaceState(null, "", url.toString());
  }catch(e){ /* ignore */ }
}

async function doSearch(q){
  const box = searchResults;
  box.innerHTML = "";
  if(q.length < 2) return;
  try{
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=it&format=json`);
    const j = await r.json();
    if(!j.results || !j.results.length){ box.innerHTML = '<div class="search-hit">Nessun risultato</div>'; return; }
    j.results.forEach(res => {
      const el = document.createElement("div");
      el.className = "search-hit";
      const sub = [res.admin1, res.country].filter(Boolean).join(", ");
      el.innerHTML = `<span>${res.name}</span><small>${sub}</small>`;
      el.addEventListener("click", () => {
        searchPanel.classList.remove("open");
        loadByCity(res.name);
      });
      box.appendChild(el);
    });
  }catch(e){ toast("Errore nella ricerca"); }
}

function updateClearBtn(){
  clearSearch.classList.toggle("visible", searchInput.value.trim().length > 0);
}

/* ================= Caricamento principale ================= */
function combineWeatherData(shortData, weeklyData, airQualityData){
  return {
    ...shortData,
    currentDaily: shortData.daily,
    currentDailyUnits: shortData.daily_units,
    daily: weeklyData.daily,
    daily_units: weeklyData.daily_units,
    airQuality: airQualityData || null
  };
}

async function fetchAllWeather(lat, lon){
  const [shortData, weeklyData, airQualityData] = await Promise.all([
    fetchWeather(lat, lon, state.models.short, "short"),
    fetchWeather(lat, lon, state.models.weekly, "weekly"),
    fetchAirQuality(lat, lon).catch(() => null)
  ]);
  return combineWeatherData(shortData, weeklyData, airQualityData);
}

function applyLoadedData(lat, lon, data, place){
  state = { ...state, lat, lon, name: place.name, sub: place.sub || "", data };
  $("locName").textContent = place.name;
  $("locSub").textContent = state.sub;
  renderCurrent();
  renderHourly();
  renderDaily();
  startClock();
  loading.classList.add("hidden");
}

async function loadLocation(lat, lon, forcedName, forcedSub){
  try{
    const [data, place] = await Promise.all([
      fetchAllWeather(lat, lon),
      forcedName
        ? Promise.resolve({ name: forcedName, sub: forcedSub || "" })
        : reverseGeocode(lat, lon)
    ]);
    applyLoadedData(lat, lon, data, place);
    updateShareUrl(lat, lon);
  }catch(e){
    $("loadingText").textContent = "Impossibile caricare i dati meteo. Controlla la connessione e riprova.";
    setTimeout(() => location.reload(), 4000);
  }
}

async function loadByCity(cityName){
  const loadingText = $("loadingText");
  try{
    loadingText.textContent = "Ricerca della località…";
    const res = await searchCity(cityName);
    if(!res){
      loadingText.textContent = "Località non trovata, uso la posizione…";
      await initFallback();
      return;
    }
    const place = {
      name: res.name,
      sub: [res.admin1, res.country].filter(Boolean).join(", ")
    };
    loadingText.textContent = "Caricamento dei dati meteo…";
    const data = await fetchAllWeather(res.latitude, res.longitude);
    applyLoadedData(res.latitude, res.longitude, data, place);
    updateCityUrl(res.name);
  }catch(e){
    console.error("loadByCity error:", e);
    loadingText.textContent = "Errore nel caricamento, uso la posizione…";
    await initFallback();
  }
}

async function initFallback(){
  let pos = null;
  try{
    pos = await getPosition();
  }catch(e){
    $("loadingText").textContent = "Geolocalizzazione non disponibile, uso una posizione approssimativa…";
    pos = await ipFallback();
    if(pos) toast("Posizione stimata dalla rete (meno precisa)");
  }
  if(!pos){
    // ultimo fallback: Roma
    toast("Posizione non rilevata: mostro Roma");
    await loadLocation(41.9028, 12.4964);
    return;
  }
  await loadLocation(pos.lat, pos.lon);
  if(pos.src === "gps" && pos.acc && pos.acc < 100) toast(`Posizione GPS precisa (±${Math.round(pos.acc)} m)`);
}

async function changeWeatherModel(section, model){
  if(!state.data || state.models[section] === model) return;
  const previous = state.models[section];
  closeSheet();
  loading.classList.remove("hidden");
  $("loadingText").textContent = section === "short"
    ? "Aggiornamento delle prossime 24 ore…"
    : "Aggiornamento dei prossimi 7 giorni…";
  try{
    const fresh = await fetchWeather(state.lat, state.lon, model, section);
    if(section === "short"){
      state.data = {
        ...state.data,
        ...fresh,
        currentDaily: fresh.daily,
        currentDailyUnits: fresh.daily_units,
        daily: state.data.daily,
        daily_units: state.data.daily_units
      };
      renderCurrent();
      renderHourly();
      startClock();
    }else{
      state.data.daily = fresh.daily;
      state.data.daily_units = fresh.daily_units;
      renderDaily();
    }
    state.models[section] = model;
    saveModelPreferences(state.models);
    toast("Modello meteo aggiornato");
  }catch(e){
    state.models[section] = previous;
    toast("Impossibile aggiornare il modello");
  }finally{
    loading.classList.add("hidden");
  }
}

let isRefreshing = false;
async function refreshWeather(){
  if(isRefreshing || !state.data || state.lat == null || state.lon == null) return;
  isRefreshing = true;
  closeSheet();
  loading.classList.remove("hidden");
  $("loadingText").textContent = "Aggiornamento dei dati meteo…";
  try{
    const data = await fetchAllWeather(state.lat, state.lon);
    applyLoadedData(state.lat, state.lon, data, { name: state.name, sub: state.sub });
    toast("Dati meteo aggiornati");
  }catch(e){
    console.error("refreshWeather error:", e);
    toast("Impossibile aggiornare i dati");
  }finally{
    loading.classList.add("hidden");
    isRefreshing = false;
  }
}

async function init(){
  const qp = new URLSearchParams(location.search);
  // 1) link con nome città
  const cityParam = qp.get("c");
  if(cityParam && cityParam.trim()){
    $("loadingText").textContent = "Caricamento dei dati meteo…";
    await loadByCity(cityParam.trim());
    return;
  }
  // 2) link compatto con coordinate
  const compactPos = decodeCoords(qp.get("p"));
  if(compactPos){
    $("loadingText").textContent = "Caricamento dei dati meteo…";
    await loadLocation(compactPos.lat, compactPos.lon);
    return;
  }
  // 3) link legacy con coordinate
  if(qp.get("lat") && qp.get("lon")){
    $("loadingText").textContent = "Caricamento dei dati meteo…";
    const qLat = parseFloat(qp.get("lat"));
    const qLon = parseFloat(qp.get("lon"));
    if(Number.isFinite(qLat) && Number.isFinite(qLon)){
      const qName = qp.get("name");
      const qSub = qp.get("sub");
      if(qName){
        await loadLocation(qLat, qLon, qName, qSub || "");
      } else {
        await loadLocation(qLat, qLon);
      }
      return;
    }
  }
  // 4) GPS / rete / Roma
  await initFallback();
}

/* ================= Eventi ================= */
currentCard.addEventListener("click", openCurrentSheet);
currentCard.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openCurrentSheet(); } });
$("overlay").addEventListener("click", closeSheet);
document.addEventListener("keydown", e => { if(e.key === "Escape") closeSheet(); });
$("searchBtn").addEventListener("click", () => {
  searchPanel.classList.toggle("open");
  if(searchPanel.classList.contains("open")) searchInput.focus();
  updateClearBtn();
});
$("settingsBtn").addEventListener("click", () => {
  searchPanel.classList.remove("open");
  openSettingsSheet();
});
$("refreshBtn").addEventListener("click", refreshWeather);
searchInput.addEventListener("input", e => { updateClearBtn(); clearTimeout(searchTimer); searchTimer = setTimeout(() => doSearch(e.target.value.trim()), 350); });
clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  searchResults.innerHTML = "";
  searchInput.focus();
  updateClearBtn();
});
$("gpsBtn").addEventListener("click", async () => {
  searchPanel.classList.remove("open");
  loading.classList.remove("hidden");
  $("loadingText").textContent = "Rilevamento della posizione in corso…";
  try{
    const pos = await getPosition();
    await loadLocation(pos.lat, pos.lon);
  }catch(e){
    loading.classList.add("hidden");
    toast("Impossibile ottenere la posizione");
  }
});

init();
