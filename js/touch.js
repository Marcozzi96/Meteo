"use strict";

/* ================= Swipe / drag per chiudere il detail sheet e navigare ore/giorni ================= */
(function(){
  const sheet = $("sheet");
  const overlay = $("overlay");
  const hourlyScroll = $("hourlyScroll");
  const handle = sheet.querySelector(".sheet-handle");

  const THRESHOLD = 80;             // pixel minimi per chiudere
  const VELOCITY_THRESHOLD = 0.6;   // px/ms
  const HORIZONTAL_THRESHOLD = 55;  // pixel per cambiare ora
  const DIRECTION_LOCK_THRESHOLD = 10;
  const HOURLY_DRAG_THRESHOLD = 5;

  let startX = 0, startY = 0;
  let currentX = 0, currentY = 0;
  let startTime = 0;
  let isDragging = false;
  let isMouse = false;
  let startFromHandle = false;
  let dragDirection = null; // null | "vertical" | "horizontal"
  let isHourlyMouseDragging = false;
  let hourlyDragStarted = false;
  let hourlyStartX = 0;
  let hourlyStartScrollLeft = 0;

  function preventBackgroundTouchScroll(e){
    if(!document.body.classList.contains("sheet-open")) return;
    if(sheet.contains(e.target)) return;
    if(!e.cancelable) return;
    e.preventDefault();
  }

  function getSheetSwipeConfig(){
    if(sheet.dataset.hourIndex != null){
      return {
        indexKey: "hourIndex",
        minKey: "hourMin",
        maxKey: "hourMax",
        stripSelector: ".hour-sheet-strip",
        render: renderHourSheetContent
      };
    }
    if(sheet.dataset.dayIndex != null){
      return {
        indexKey: "dayIndex",
        minKey: "dayMin",
        maxKey: "dayMax",
        stripSelector: ".day-sheet-strip",
        render: renderDaySheetContent
      };
    }
    return null;
  }

  function canStartDrag(target){
    // Se è aperto un dettaglio navigabile permetti lo swipe orizzontale ovunque sullo sheet.
    if(getSheetSwipeConfig()) return true;
    const isHandle = handle && handle.contains(target);
    return isHandle || sheet.scrollTop <= 0;
  }

  function setUserSelect(disable){
    document.body.style.userSelect = disable ? "none" : "";
  }

  function getSheetStrip(config){
    return config ? sheet.querySelector(config.stripSelector) : null;
  }

  function resetSheetStyles(){
    const config = getSheetSwipeConfig();
    const strip = getSheetStrip(config);
    sheet.style.transform = "";
    overlay.style.opacity = "";
    sheet.classList.remove("dragging");
    sheet.classList.remove("hour-swiping");
    sheet.classList.remove("sheet-swiping");
    if(strip) strip.style.transform = "translateX(-33.333%)";
  }

  function applySheetStripOffset(deltaX){
    const config = getSheetSwipeConfig();
    const strip = getSheetStrip(config);
    if(!config || !strip) return;

    const i = parseInt(sheet.dataset[config.indexKey], 10);
    const min = parseInt(sheet.dataset[config.minKey], 10);
    const max = parseInt(sheet.dataset[config.maxKey], 10);
    let offset = deltaX;

    if((deltaX > 0 && i <= min) || (deltaX < 0 && i >= max)){
      offset = deltaX * 0.28;
    }

    strip.style.transform = `translateX(calc(-33.333% + ${offset}px))`;
  }

  function settleSheetSwipe(nextIndex){
    const config = getSheetSwipeConfig();
    const strip = getSheetStrip(config);
    const currentIndex = config ? parseInt(sheet.dataset[config.indexKey], 10) : nextIndex;
    sheet.classList.remove("hour-swiping");
    sheet.classList.remove("sheet-swiping");

    if(!config || !strip || nextIndex === currentIndex){
      resetSheetStyles();
      return;
    }

    strip.style.transform = nextIndex > currentIndex ? "translateX(-66.666%)" : "translateX(0)";
    window.setTimeout(() => {
      config.render(nextIndex);
    }, 280);
  }

  function startHourlyMouseDrag(e){
    if(e.button !== 0) return;
    isHourlyMouseDragging = true;
    hourlyDragStarted = false;
    hourlyStartX = e.clientX;
    hourlyStartScrollLeft = hourlyScroll.scrollLeft;
    hourlyScroll.classList.add("dragging");
    setUserSelect(true);
  }

  function moveHourlyMouseDrag(e){
    if(!isHourlyMouseDragging) return;
    const deltaX = e.clientX - hourlyStartX;
    if(Math.abs(deltaX) > HOURLY_DRAG_THRESHOLD) hourlyDragStarted = true;
    if(hourlyDragStarted) e.preventDefault();
    hourlyScroll.scrollLeft = hourlyStartScrollLeft - deltaX;
  }

  function endHourlyMouseDrag(){
    if(!isHourlyMouseDragging) return;
    isHourlyMouseDragging = false;
    hourlyScroll.classList.remove("dragging");
    setUserSelect(false);
    if(hourlyDragStarted){
      window.setTimeout(() => { hourlyDragStarted = false; }, 0);
    }
  }

  function start(clientX, clientY, target){
    if(!canStartDrag(target)) return;
    startFromHandle = handle && handle.contains(target);
    startX = currentX = clientX;
    startY = currentY = clientY;
    startTime = Date.now();
    isDragging = true;
    dragDirection = null;
    sheet.classList.add("dragging");
  }

  function move(clientX, clientY, e){
    if(!isDragging) return;
    currentX = clientX;
    currentY = clientY;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    if(!dragDirection){
      if(Math.abs(deltaX) < DIRECTION_LOCK_THRESHOLD && Math.abs(deltaY) < DIRECTION_LOCK_THRESHOLD) return;
      // Con un dettaglio navigabile aperto e movimento prevalentemente orizzontale cambia pannello.
      if(getSheetSwipeConfig() && Math.abs(deltaX) > Math.abs(deltaY)){
        dragDirection = "horizontal";
        sheet.classList.add("hour-swiping");
        sheet.classList.add("sheet-swiping");
      }else{
        dragDirection = "vertical";
      }
    }

    if(dragDirection === "horizontal"){
      if(e.cancelable) e.preventDefault();
      applySheetStripOffset(deltaX);
      return;
    }

    // Chiusura verticale: solo verso il basso e solo dall'handle o quando il contenuto è in cima.
    if(deltaY > 0){
      if(!startFromHandle && sheet.scrollTop > 0) return;
      if(e.cancelable) e.preventDefault();
      sheet.style.transform = `translateY(${deltaY}px)`;
      const maxOpacity = 0.55;
      const opacity = Math.max(0, maxOpacity * (1 - Math.min(deltaY / sheet.offsetHeight, 1)));
      overlay.style.opacity = String(opacity);
    }
  }

  function end(){
    if(!isDragging) return;
    isDragging = false;
    sheet.classList.remove("dragging");
    setUserSelect(false);

    const config = getSheetSwipeConfig();
    if(dragDirection === "horizontal" && config){
      const deltaX = currentX - startX;
      const i = parseInt(sheet.dataset[config.indexKey], 10);
      const min = parseInt(sheet.dataset[config.minKey], 10);
      const max = parseInt(sheet.dataset[config.maxKey], 10);
      if(deltaX < -HORIZONTAL_THRESHOLD && i < max){
        settleSheetSwipe(i + 1);
      }else if(deltaX > HORIZONTAL_THRESHOLD && i > min){
        settleSheetSwipe(i - 1);
      }else{
        settleSheetSwipe(i);
      }
      dragDirection = null;
      return;
    }

    if(dragDirection === "vertical"){
      const deltaY = currentY - startY;
      if(!startFromHandle && sheet.scrollTop > 0){
        resetSheetStyles();
      }else{
        const elapsed = Date.now() - startTime;
        const velocity = elapsed > 0 ? deltaY / elapsed : 0;
        if(deltaY > THRESHOLD || (deltaY > 30 && velocity > VELOCITY_THRESHOLD)){
          resetSheetStyles();
          closeSheet();
        }else{
          resetSheetStyles();
        }
      }
    }

    dragDirection = null;
  }

  /* ---------- Touch ---------- */
  sheet.addEventListener("touchstart", e => {
    const touch = e.touches[0];
    start(touch.clientX, touch.clientY, e.target);
  }, { passive: true });

  sheet.addEventListener("touchmove", e => {
    const touch = e.touches[0];
    move(touch.clientX, touch.clientY, e);
  }, { passive: false });

  sheet.addEventListener("touchend", end);
  sheet.addEventListener("touchcancel", end);
  document.addEventListener("touchmove", preventBackgroundTouchScroll, { passive: false });

  /* ---------- Mouse (PC) ---------- */
  sheet.addEventListener("mousedown", e => {
    if(e.button !== 0) return;
    isMouse = true;
    setUserSelect(true);
    start(e.clientX, e.clientY, e.target);
  });

  window.addEventListener("mousemove", e => {
    if(!isMouse) return;
    move(e.clientX, e.clientY, e);
  });

  window.addEventListener("mouseup", () => {
    if(!isMouse) return;
    isMouse = false;
    end();
  });

  window.addEventListener("mouseleave", () => {
    if(!isMouse) return;
    isMouse = false;
    end();
  });

  hourlyScroll.addEventListener("mousedown", startHourlyMouseDrag);

  hourlyScroll.addEventListener("click", e => {
    if(!hourlyDragStarted) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  window.addEventListener("mousemove", moveHourlyMouseDrag);
  window.addEventListener("mouseup", endHourlyMouseDrag);
  window.addEventListener("mouseleave", endHourlyMouseDrag);
})();
