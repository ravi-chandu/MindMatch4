// ai/analytics.js
(function () {
  const midMeta = document.querySelector('meta[name="ga-measurement-id"]');
  const MID = midMeta && midMeta.content;
  if (!MID) {
    window.mm4log = () => {};
    return;
  }

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${MID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', MID);

  window.mm4log = function (eventName, params = {}) {
    try {
      window.gtag?.('event', eventName, params);
    } catch (e) {
      /* noop */
    }
  };

  window.addEventListener('mm4:hint', (e) =>
    window.mm4log('hint_used', { count: e.detail?.best?.length || 0 })
  );
  window.addEventListener('mm4:daily', () => window.mm4log('daily_loaded'));
  window.addEventListener('mm4:aimove', (e) =>
    window.mm4log('ai_move', { col: e.detail?.col })
  );
  window.addEventListener('mm4:gameend', (e) =>
    window.mm4log('game_end', { outcome: e.detail?.outcome })
  );
})();
