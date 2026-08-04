"use strict";

function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 3200);
}

function windDir(deg){
  const d = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSO","SO","OSO","O","ONO","NO","NNO"];
  return d[Math.round(deg / 22.5) % 16];
}

function toCorrectedDate(iso, utcOffsetSeconds){
  if(iso instanceof Date) return iso;
  if(utcOffsetSeconds == null) return new Date(iso);
  const sign = utcOffsetSeconds >= 0 ? "+" : "-";
  const abs = Math.abs(utcOffsetSeconds);
  const h = Math.floor(abs / 3600).toString().padStart(2, "0");
  const m = Math.floor((abs % 3600) / 60).toString().padStart(2, "0");
  return new Date(iso + sign + h + ":" + m);
}

function fmtTime(iso, timeZone, utcOffsetSeconds){
  const d = toCorrectedDate(iso, utcOffsetSeconds);
  if(timeZone && typeof Intl !== "undefined"){
    try{
      return new Intl.DateTimeFormat("it-IT", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
    }catch(e){}
  }
  return d.getUTCHours().toString().padStart(2, "0") + ":" + d.getUTCMinutes().toString().padStart(2, "0");
}

function uvLabel(u){
  if(u < 3) return "Basso";
  if(u < 6) return "Moderato";
  if(u < 8) return "Alto";
  if(u < 11) return "Molto alto";
  return "Estremo";
}
