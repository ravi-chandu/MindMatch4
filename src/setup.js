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
window.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById("themeSelect");
  if (sel){
    sel.value = savedTheme;
    sel.addEventListener("change", (e)=> setTheme(e.target.value));
  }
  document.querySelector(".site-title")?.addEventListener("click", ()=>{
    window.dispatchEvent(new CustomEvent("mm4:navigate",{detail:{to:"home"}}));
  });
});

// Register service worker only outside localhost to avoid stale cache while testing.
if ("serviceWorker" in navigator) {
  const isLocalhost = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
  if (isLocalhost) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    if (window.caches?.keys) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  } else {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl);
  }
}

// Analytics hooks
window.addEventListener("mm4:hint",   (e)=> window.gtag && gtag('event','hint_used',{count:e.detail?.best?.length||0}));
window.addEventListener("mm4:aimove", (e)=> window.gtag && gtag('event','ai_move',{col:e.detail?.col}));
window.addEventListener("mm4:gameend",(e)=> window.gtag && gtag('event','game_end',{outcome:e.detail?.outcome}));
