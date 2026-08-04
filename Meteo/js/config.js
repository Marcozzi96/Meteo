"use strict";

/* ================= Mappatura codici WMO ================= */
const WMO = {
  0:["Sereno","☀️","🌙"], 1:["Prevalentemente sereno","🌤️","🌙"],
  2:["Parzialmente nuvoloso","⛅","☁️"], 3:["Coperto","☁️","☁️"],
  45:["Nebbia","🌫️","🌫️"], 48:["Nebbia con brina","🌫️","🌫️"],
  51:["Pioviggine leggera","🌦️","🌧️"], 53:["Pioviggine","🌦️","🌧️"], 55:["Pioviggine intensa","🌧️","🌧️"],
  56:["Pioviggine gelata","🌧️","🌧️"], 57:["Pioviggine gelata intensa","🌧️","🌧️"],
  61:["Pioggia leggera","🌦️","🌧️"], 63:["Pioggia","🌧️","🌧️"], 65:["Pioggia intensa","🌧️","🌧️"],
  66:["Pioggia gelata","🌧️","🌧️"], 67:["Pioggia gelata intensa","🌧️","🌧️"],
  71:["Neve leggera","🌨️","🌨️"], 73:["Neve","🌨️","🌨️"], 75:["Neve intensa","❄️","❄️"], 77:["Granelli di neve","🌨️","🌨️"],
  80:["Rovesci leggeri","🌦️","🌧️"], 81:["Rovesci","🌧️","🌧️"], 82:["Rovesci violenti","⛈️","⛈️"],
  85:["Rovesci di neve","🌨️","🌨️"], 86:["Rovesci di neve intensi","❄️","❄️"],
  95:["Temporale","⛈️","⛈️"], 96:["Temporale con grandine","⛈️","⛈️"], 99:["Temporale con forte grandine","⛈️","⛈️"]
};

const wmoInfo = (code, isDay)=>{
  const w = WMO[code] || ["N/D","🌡️","🌡️"];
  return { label: w[0], icon: isDay ? w[1] : w[2] };
};

const wmoCategory = (code)=>{
  if(code === 0) return "clear";
  if(code >= 1 && code <= 3) return "cloudy";
  if(code === 45 || code === 48) return "fog";
  if((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if(code >= 95 && code <= 99) return "thunder";
  return "clear";
};

const $ = id => document.getElementById(id);

const WEATHER_MODELS = [
  { id: "auto", label: "Automatico", description: "Open-Meteo sceglie il modello più adatto" },
  { id: "ecmwf_ifs025", label: "ECMWF IFS", description: "Modello globale ECMWF" },
  { id: "icon_seamless", label: "ICON Seamless", description: "Modelli ICON regionali e globali" },
  { id: "gfs_seamless", label: "GFS Seamless", description: "Modelli NOAA regionali e globali" },
  { id: "ecmwf_aifs025_single", label: "ECMWF AIFS", description: "Modello previsionale basato su IA" }
];

const DOW = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
const MONTHS = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
