"use strict";

/* ================= Geolocalizzazione ================= */
function getPosition(){
  return new Promise((resolve, reject) => {
    if(!navigator.geolocation) return reject(new Error("no-geo"));
    let done = false;
    // watchdog: alcuni browser non invocano mai i callback
    setTimeout(() => { if(!done){ done = true; reject(new Error("watchdog")); } }, 11000);
    // primo tentativo: alta precisione
    navigator.geolocation.getCurrentPosition(
      p => { if(!done){ done = true; resolve({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, src: "gps" }); } },
      () => { // fallback: bassa precisione / rete
        navigator.geolocation.getCurrentPosition(
          p => { if(!done){ done = true; resolve({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, src: "network" }); } },
          e => { if(!done){ done = true; reject(e); } },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

async function ipFallback(){
  for(const u of ["https://ipapi.co/json/", "https://ipwho.is/"]){
    try{
      const ctl = new AbortController();
      setTimeout(() => ctl.abort(), 5000);
      const r = await fetch(u, { signal: ctl.signal });
      const j = await r.json();
      const la = j.latitude ?? j.lat, lo = j.longitude ?? j.lon;
      if(la != null && lo != null) return { lat: la, lon: lo, acc: null, src: "ip", city: j.city };
    }catch(e){}
  }
  return null;
}

function composePlace(name, quartiere, postcode, area, country){
  const parts = [];
  if(quartiere && quartiere !== name) parts.push(quartiere);
  if(postcode) parts.push(postcode);
  if(area && area !== name) parts.push(area);
  if(country) parts.push(country);
  return { name: name || "Posizione attuale", sub: parts.join(", ") };
}

async function searchCity(name){
  if(!name) return null;
  try{
    const ctl = new AbortController();
    setTimeout(() => ctl.abort(), 15000);
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=it&format=json`, { signal: ctl.signal });
    if(!r.ok) return null;
    const j = await r.json();
    return j.results && j.results[0] ? j.results[0] : null;
  }catch(e){ return null; }
}

async function reverseGeocode(lat, lon){
  // 1) Nominatim (OpenStreetMap) — zoom 18: dettaglio a livello di quartiere
  try{
    const ctl = new AbortController();
    setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=it&zoom=18`, { signal: ctl.signal });
    if(r.ok){
      const j = await r.json();
      const a = j.address || {};
      const name = a.city || a.town || a.village || a.municipality || a.suburb || a.neighbourhood || a.county;
      const quartiere = a.neighbourhood || a.quarter || a.suburb || a.city_district;
      // In Italia Nominatim restituisce county=provincia e state=regione; mostriamo sempre la regione.
      const isItaly = (a.country_code || "").toLowerCase() === "it";
      const area = isItaly ? a.state : (a.county || a.state);
      return composePlace(name, quartiere, a.postcode, area, a.country);
    }
  }catch(e){}
  // 2) BigDataCloud (client-side)
  try{
    const ctl2 = new AbortController();
    setTimeout(() => ctl2.abort(), 6000);
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=it`, { signal: ctl2.signal });
    const j = await r.json();
    const name = j.city || j.locality;
    const quartiere = (j.locality && j.city && j.locality !== j.city) ? j.locality : null;
    return composePlace(name || j.principalSubdivision, quartiere, j.postcode, j.principalSubdivision, j.countryName);
  }catch(e){}
  return { name: "Posizione attuale", sub: `${lat.toFixed(3)}, ${lon.toFixed(3)}` };
}

/* ================= API Meteo ================= */
async function fetchWeather(lat, lon, model, section){
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    timezone: "auto",
    forecast_days: section === "short" ? "2" : "7"
  });
  if(model && model !== "auto") params.set("models", model);

  if(section === "short"){
    params.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m");
    params.set("hourly", "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,uv_index,visibility,is_day");
    params.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,precipitation_sum,uv_index_max,wind_speed_10m_max,wind_direction_10m_dominant");
  }else{
    params.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,precipitation_sum,uv_index_max,wind_speed_10m_max,wind_direction_10m_dominant");
  }

  const url = "https://api.open-meteo.com/v1/forecast?" + params.toString();
  const r = await fetch(url);
  if(!r.ok) throw new Error("api");
  return r.json();
}

async function fetchAirQuality(lat, lon){
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    timezone: "auto",
    current: "european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone",
    hourly: "european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone"
  });
  const url = "https://air-quality-api.open-meteo.com/v1/air-quality?" + params.toString();
  const r = await fetch(url);
  if(!r.ok) throw new Error("air-quality-api");
  return r.json();
}
