(function () {
  const cfg = window.SIVALE_GENESYS || {};
  const DEBUG = !!cfg.debug;
  const log = (...args) => DEBUG && console.log('[Sivale Genesys Demo]', ...args);

  function loadGenesys() {
    if (!cfg.enabled || !cfg.deploymentId || cfg.deploymentId.indexOf('REPLACE_') === 0) {
      log('Genesys Messenger not loaded. Add deploymentId/environment in js/genesys-config.js');
      window.Genesys = window.Genesys || function () {
        (window.Genesys.q = window.Genesys.q || []).push(arguments);
      };
      return;
    }
    if (window._genesysLoaded) return;
    window._genesysLoaded = true;
    (function (g, e, n, es, ys) {
      g['_genesysJs'] = e;
      g[e] = g[e] || function () { (g[e].q = g[e].q || []).push(arguments); };
      g[e].t = 1 * new Date();
      g[e].c = es;
      ys = document.createElement('script');
      ys.async = 1;
      ys.src = n;
      ys.charset = 'utf-8';
      document.head.appendChild(ys);
    })(window, 'Genesys', cfg.scriptUrl || 'https://apps.mypurecloud.com/genesys-bootstrap/genesys.min.js', {
      environment: cfg.environment || 'prod',
      deploymentId: cfg.deploymentId
    });
  }

  function normalizedPath() {
    return window.location.pathname.replace(/\/+/g, '/');
  }

  function isHomePage() {
    const path = normalizedPath();
    return path === '/' || /index\.html?$/.test(path) || path.endsWith('/sivale_genesys_demo/');
  }

  function isKnowledgePortal() {
    return /knowledge-portal\.html?$/.test(normalizedPath());
  }

  function isInviteEligiblePage() {
    return isHomePage() || (isKnowledgePortal() && cfg.showInviteOnKnowledgePortal !== false) || cfg.showInviteOnAllPages === true;
  }

  function record(eventName, attributes) {
    const customAttributes = Object.assign({
      demoName: cfg.demoName || 'sivale-demo',
      pagePath: window.location.pathname,
      pageTitle: document.title,
      viewportWidth: String(window.innerWidth),
      viewportHeight: String(window.innerHeight)
    }, attributes || {});
    try {
      if (typeof window.Genesys === 'function') {
        window.Genesys('command', 'Journey.record', {
          eventName: eventName,
          customAttributes: customAttributes,
          traitsMapper: []
        });
      }
      log('Journey.record', eventName, customAttributes);
    } catch (err) {
      console.warn('[Sivale Genesys Demo] Unable to record event', eventName, err);
    }
  }

  function captureIntent(intentName, attributes) {
    record('intent_captured', Object.assign({
      intentName: intentName || 'desconocida',
      captureSource: 'SivaleDemoTracking.captureIntent'
    }, attributes || {}));
  }

  function openMessenger() {
    try {
      if (typeof window.Genesys === 'function') {
        window.Genesys('command', 'Messenger.open');
      }
      log('Messenger.open');
    } catch (err) {
      console.warn('[Sivale Genesys Demo] Unable to open Messenger', err);
    }
  }

  function setupInvite() {
    const invite = document.getElementById('predictiveInvite');
    const launcher = document.getElementById('predictiveLauncher');
    const accept = document.getElementById('predictiveAccept');
    const dismiss = document.getElementById('predictiveDismiss');
    const close = document.getElementById('predictiveClose');
    if (!invite || !launcher) return;

    let idleTimer = null;
    let inviteShown = false;
    const dismissedKey = isKnowledgePortal() ? 'sivaleKnowledgeInviteDismissed' : 'sivaleBotInviteDismissed';
    let dismissed = sessionStorage.getItem(dismissedKey) === '1';
    const inactivityMs = Math.max(1, Number(cfg.inactivitySeconds || 15)) * 1000;

    function showInvite(trigger) {
      if (inviteShown || dismissed || !isInviteEligiblePage()) return;
      inviteShown = true;
      invite.classList.add('is-visible');
      record('bot_invite_shown', {
        trigger: trigger || 'idle',
        idleSeconds: String(cfg.inactivitySeconds || 15),
        invitePageType: isKnowledgePortal() ? 'knowledge_portal' : 'home'
      });
    }
    function resetIdle() {
      if (inviteShown || dismissed) return;
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => showInvite(isKnowledgePortal() ? 'knowledge_portal_idle' : 'homepage_idle'), inactivityMs);
    }
    ['click', 'keydown', 'touchstart', 'scroll'].forEach(evt => window.addEventListener(evt, resetIdle, { passive: true }));
    resetIdle();

    launcher.addEventListener('click', function () {
      record('bot_launcher_clicked', {
        source: 'floating_launcher',
        pageType: isKnowledgePortal() ? 'knowledge_portal' : 'home'
      });
      openMessenger();
    });
    if (accept) {
      accept.addEventListener('click', function () {
        record('bot_invite_accepted', {
          source: 'predictive_invite',
          pageType: isKnowledgePortal() ? 'knowledge_portal' : 'home'
        });
        invite.classList.remove('is-visible');
        if (cfg.openMessengerOnAccept !== false) openMessenger();
      });
    }
    function dismissInvite(source) {
      dismissed = true;
      sessionStorage.setItem(dismissedKey, '1');
      invite.classList.remove('is-visible');
      record('bot_invite_dismissed', { source: source || 'dismiss' });
    }
    if (dismiss) dismiss.addEventListener('click', () => dismissInvite('secondary_button'));
    if (close) close.addEventListener('click', () => dismissInvite('close_button'));
  }

  function trackClicks() {
    document.addEventListener('click', function (e) {
      const target = e.target.closest('button, a, [role="button"], .h2d-text');
      if (!target) return;
      const text = (
        target.getAttribute('data-track-label') ||
        target.innerText ||
        target.alt ||
        target.getAttribute('aria-label') ||
        ''
      ).trim().slice(0, 100);
      if (!text) return;
      const normalized = text.toLowerCase();
      if (/quiero contratar|quiero cotizar|ir al portal|portal de conocimiento|productos|soluciones|afíliate|afiliate|centro de ayuda|categorías|categorias|artículos|articulos|abrir bot|volver a inicio/.test(normalized)) {
        record('site_cta_clicked', {
          label: text,
          pageType: isKnowledgePortal() ? 'knowledge_portal' : 'home',
          href: target.getAttribute('href') || ''
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadGenesys();
    if (typeof window.Genesys === 'function') {
      window.Genesys('subscribe', 'Journey.ready', function () {
        log('Journey.ready');
        window.Genesys('command', 'Journey.pageview');
        record(isKnowledgePortal() ? 'knowledge_portal_page_loaded' : 'sivale_demo_home_loaded', { source: 'DOMContentLoaded' });
      });
      window.Genesys('subscribe', 'Messenger.ready', function () {
        log('Messenger.ready');
      });
    }
    setupInvite();
    trackClicks();
  });

  window.SivaleDemoTracking = { record, captureIntent, openMessenger };
})();
