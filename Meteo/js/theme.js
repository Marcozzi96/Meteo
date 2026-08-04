"use strict";

/* ================= Palette sfondo dinamico (cielo + temperatura) ================= */

const TEMP_COLD = 5;   // fino a questa temperatura si attiva il bianco ghiaccio
const TEMP_HOT = 30;   // sopra questa temperatura si attiva l'arancione
const TEMP_EXTREME = 35; // sopra questa temperatura si attiva il rosso

const SKY_THEMES = {
  clear: {
    day: {
      mild:   ["#2980B9", "#5DADE2", "#AED6F1"],
      cold:   ["#2980B9", "#7FB3D5", "#E8F7FF"],
      hot:    ["#2980B9", "#7FB3D5", "#FF9F43"],
      extreme:["#2980B9", "#FF9F43", "#E74C3C"]
    },
    night: {
      mild:   ["#0A1A2F", "#1C3A5C", "#2E5B8A"],
      cold:   ["#0A1A2F", "#1C3A5C", "#4A6070"],
      hot:    ["#0A1A2F", "#1C3A5C", "#8B4A1F"],
      extreme:["#0A1A2F", "#3D1F1F", "#5C1818"]
    }
  },
  cloudy: {
    day: {
      mild:   ["#5D6D7E", "#85929E", "#AEB6BF"],
      cold:   ["#5D6D7E", "#AEB6BF", "#D6EAF8"],
      hot:    ["#5D6D7E", "#85929E", "#D68910"],
      extreme:["#5D6D7E", "#D68910", "#C0392B"]
    },
    night: {
      mild:   ["#141E30", "#243B55", "#34495E"],
      cold:   ["#141E30", "#243B55", "#4A5A6A"],
      hot:    ["#141E30", "#243B55", "#6B4A20"],
      extreme:["#141E30", "#3D2A1F", "#5C1818"]
    }
  },
  fog: {
    day: {
      mild:   ["#7F8C8D", "#A6ACAF", "#D0D3D4"],
      cold:   ["#7F8C8D", "#BFC9CA", "#EAFAFA"]
    },
    night: {
      mild:   ["#232526", "#414345", "#5F6A6A"],
      cold:   ["#232526", "#414345", "#566565"]
    }
  },
  rain: {
    day: {
      mild:   ["#2C3E50", "#46637F", "#6E8CAB"],
      cold:   ["#2C3E50", "#6E8CAB", "#A9CCE3"],
      hot:    ["#2C3E50", "#46637F", "#D68910"]
    },
    night: {
      mild:   ["#16222A", "#3A6073", "#4A6FA5"],
      cold:   ["#16222A", "#3A6073", "#5D7A8C"],
      hot:    ["#16222A", "#3A6073", "#6B4A20"]
    }
  },
  snow: {
    day: {
      mild:   ["#21618C", "#5DADE2", "#AED6F1"],
      cold:   ["#21618C", "#85C1E9", "#EBF5FB"]
    },
    night: {
      mild:   ["#1B262C", "#0F4C75", "#3282B8"],
      cold:   ["#1B262C", "#0F4C75", "#4A6070"]
    }
  },
  thunder: {
    day: {
      mild:   ["#17202A", "#4A235A", "#7D3C98"]
    },
    night: {
      mild:   ["#200122", "#3D0A2C", "#6F0000"]
    }
  }
};

function tempBand(temp){
  if(temp == null) return "mild";
  if(temp > TEMP_EXTREME) return "extreme";
  if(temp > TEMP_HOT) return "hot";
  if(temp <= TEMP_COLD) return "cold";
  return "mild";
}

function getThemeColors(code, isDay, temp){
  const cat = wmoCategory(code);
  const period = isDay ? "day" : "night";
  const band = tempBand(temp);
  const theme = SKY_THEMES[cat]?.[period]?.[band] || SKY_THEMES[cat]?.[period]?.["mild"];
  if(theme) return { bg1: theme[0], bg2: theme[1], bg3: theme[2] };
  // fallback neutro
  return isDay
    ? { bg1: "#2980B9", bg2: "#5DADE2", bg3: "#AED6F1" }
    : { bg1: "#0A1A2F", bg2: "#1C3A5C", bg3: "#2E5B8A" };
}

function applyTheme(code, isDay, temp){
  const colors = getThemeColors(code, isDay, temp);
  document.body.classList.toggle("night", !isDay);
  document.body.style.setProperty("--bg1", colors.bg1);
  document.body.style.setProperty("--bg2", colors.bg2);
  document.body.style.setProperty("--bg3", colors.bg3);
}
