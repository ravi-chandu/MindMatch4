import '../ai/adapter.js';
import '../ai/mm4-plugin.js';
import '../ai/mm4-plugin-wire.js';
import { lsGet, lsSet } from './utils/storage.js';

// Apply saved theme immediately
let savedTheme = lsGet('mm4_theme', 'auto');
document.documentElement.setAttribute('data-theme', savedTheme);

function setTheme(t) {
  lsSet('mm4_theme', t);
  document.documentElement.setAttribute('data-theme', t);
}
window.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('themeSelect');
  if (sel) {
    sel.value = savedTheme;
    sel.addEventListener('change', (e) => setTheme(e.target.value));
  }
  document.querySelector('.site-title')?.addEventListener('click', () => {
    window.dispatchEvent(
      new CustomEvent('mm4:navigate', { detail: { to: 'home' } })
    );
  });
});

// Register service worker
if ('serviceWorker' in navigator) {
  const swUrl = new URL('sw.js', import.meta.env.BASE_URL).href;
  navigator.serviceWorker.register(swUrl);
}

// Analytics hooks
window.addEventListener('mm4:hint', (e) =>
  window.gtag?.('event', 'hint_used', { count: e.detail?.best?.length || 0 })
);
window.addEventListener('mm4:aimove', (e) =>
  window.gtag?.('event', 'ai_move', { col: e.detail?.col })
);
window.addEventListener('mm4:gameend', (e) =>
  window.gtag?.('event', 'game_end', { outcome: e.detail?.outcome })
);
