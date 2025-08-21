import "../ai/adapter.js";
import "../ai/mm4-plugin.js";
import "../ai/mm4-plugin-wire.js";

// Apply saved theme immediately
const savedTheme = localStorage.getItem("mm4_theme") || "auto";
document.documentElement.setAttribute("data-theme", savedTheme);

function setTheme(t){
  localStorage.setItem("mm4_theme", t);
  document.documentElement.setAttribute("data-theme", t);
}

function fitCell(){
  const gap = 10;          // keep in sync
  const pagePad = 24;      // left+right page padding
  const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  const headerH = (document.querySelector('.site-header')?.offsetHeight || 0);

  const availW = vw - pagePad - 2;    // -2 for rounding
  const availH = vh - headerH - 220;  // headroom for bars

  const cellFromW = Math.floor((availW - gap*6) / 7);
  const cellFromH = Math.floor((availH - gap*5) / 6);
  const size = Math.max(26, Math.min(92, Math.min(cellFromW, cellFromH)));

  document.documentElement.style.setProperty('--gap',  gap + 'px');
  document.documentElement.style.setProperty('--cell', size + 'px');
}

window.addEventListener('resize', fitCell);
window.addEventListener('orientationchange', fitCell);
window.addEventListener('DOMContentLoaded', () => {
  fitCell();
  const sel = document.getElementById("themeSelect");
  if (sel){
    sel.value = savedTheme;
    sel.addEventListener("change", (e)=> setTheme(e.target.value));
  }
  document.querySelector(".site-title")?.addEventListener("click", ()=>{
    window.dispatchEvent(new CustomEvent("mm4:navigate",{detail:{to:"home"}}));
  });
});

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/MindMatch4/sw.js");
}

// Analytics hooks
window.addEventListener("mm4:hint",   (e)=> window.gtag && gtag('event','hint_used',{count:e.detail?.best?.length||0}));
window.addEventListener("mm4:aimove", (e)=> window.gtag && gtag('event','ai_move',{col:e.detail?.col}));
window.addEventListener("mm4:gameend",(e)=> window.gtag && gtag('event','game_end',{outcome:e.detail?.outcome}));
