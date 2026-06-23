(function () {
  'use strict';

  const cfg = window.SIVALE_GENESYS || {};
  const DEBUG = !!cfg.debug;
  const log = (...args) => DEBUG && console.log('[UP Si Vale Genesys Demo]', ...args);

  const ROUTES = {
    'index.html': { route: 'home', stage: 'Inicio', segment: 'exploracion', intent: 'explorar_prestaciones', score: 5 },
    'productos.html': { route: 'products', stage: 'Productos', segment: 'evaluacion', intent: 'comparar_productos', score: 18 },
    'vales-beneficios.html': { route: 'benefits', stage: 'Beneficios', segment: 'evaluacion_alta', intent: 'beneficios_fiscales', score: 28 },
    'comercios-afiliados.html': { route: 'acceptance', stage: 'Red de aceptacion', segment: 'uso_tarjeta', intent: 'buscar_comercios', score: 20 },
    'cotizacion.html': { route: 'quote', stage: 'Cotizacion', segment: 'alta_intencion', intent: 'cotizar_prestaciones', score: 54 },
    'checkout.html': { route: 'checkout', stage: 'Solicitud comercial', segment: 'muy_alta_intencion', intent: 'crear_oportunidad', score: 70 },
    'confirmacion.html': { route: 'confirmation', stage: 'Conversion', segment: 'conversion', intent: 'solicitud_enviada', score: 90 },
    'continuidad.html': { route: 'continuity', stage: 'Continuidad asistida', segment: 'asistencia', intent: 'recuperar_contexto', score: 62 },
    'knowledge-portal.html': { route: 'knowledge', stage: 'Knowledge Portal', segment: 'self_service', intent: 'buscar_conocimiento', score: 36 }
  };

  function loadGenesys() {
    if (!cfg.enabled || !cfg.deploymentId || cfg.deploymentId.indexOf('REPLACE_') === 0) {
      log('Genesys Messenger not loaded. Add deploymentId/environment in js/genesys-config.js');
      window.Genesys = window.Genesys || function () { (window.Genesys.q = window.Genesys.q || []).push(arguments); };
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

  function fileName() {
    return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function routeConfig() {
    const explicit = document.body ? document.body.getAttribute('data-route') : '';
    const fromFile = ROUTES[fileName()] || ROUTES['index.html'];
    if (!explicit) return fromFile;
    return Object.values(ROUTES).find((item) => item.route === explicit) || fromFile;
  }

  function pagePayload(extra) {
    const url = new URL(window.location.href);
    const route = routeConfig();
    const params = Object.fromEntries(url.searchParams.entries());
    return Object.assign({
      demoName: cfg.demoName || 'up-sivale-demo',
      brand: cfg.brand || 'Up Si Vale',
      pageUrl: url.href,
      pagePath: url.pathname,
      path: fileName(),
      query: url.search,
      route: route.route,
      stage: route.stage,
      segment: route.segment,
      inferredIntent: route.intent,
      journeyScore: String(route.score),
      knowledgeBase: cfg.knowledgeBaseName || '',
      searchQueryParam: cfg.searchQueryParam || 'q',
      viewportWidth: String(window.innerWidth),
      viewportHeight: String(window.innerHeight),
      sourceTimestamp: new Date().toISOString(),
      product: params.product || params.tipo || '',
      employees: params.empleados || '',
      searchTerm: params[cfg.searchQueryParam || 'q'] || ''
    }, extra || {});
  }

  function record(eventName, attributes) {
    const customAttributes = pagePayload(attributes || {});
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
      console.warn('[UP Si Vale Genesys Demo] Unable to record event', eventName, err);
    }
    feedLocalPanel(eventName, customAttributes);
  }

  function pageview(extra) {
    const payload = pagePayload(extra || {});
    try {
      if (typeof window.Genesys === 'function') {
        window.Genesys('command', 'Journey.pageview', {
          pageTitle: document.title,
          customAttributes: payload
        });
      }
      log('Journey.pageview', payload);
    } catch (err) {
      console.warn('[UP Si Vale Genesys Demo] Unable to record pageview', err);
    }
    feedLocalPanel('Journey.pageview', payload);
  }

  function captureIntent(intentName, attributes) {
    record('intent_captured', Object.assign({
      intentName: intentName || routeConfig().intent || 'desconocida',
      captureSource: 'SivaleDemoTracking.captureIntent'
    }, attributes || {}));
  }

  function openMessenger() {
    try {
      if (typeof window.Genesys === 'function') window.Genesys('command', 'Messenger.open');
      log('Messenger.open');
    } catch (err) {
      console.warn('[UP Si Vale Genesys Demo] Unable to open Messenger', err);
    }
  }

  function setSearchParam(term) {
    const param = cfg.searchQueryParam || 'q';
    const url = new URL(window.location.href);
    if (term) url.searchParams.set(param, term);
    else url.searchParams.delete(param);
    try { history.replaceState({ searchTerm: term }, '', url.toString()); } catch (e) {}
  }

  function trackSearch(term, source) {
    const value = String(term || '').trim();
    if (!value) return;
    setSearchParam(value);
    record('site_search_performed', {
      searchTerm: value,
      queryParam: cfg.searchQueryParam || 'q',
      source: source || 'search_form'
    });
    captureIntent(classifyIntent(value), {
      searchTerm: value,
      source: source || 'search_form'
    });
  }

  function classifyIntent(text) {
    const q = String(text || '').toLowerCase();
    if (/saldo|movimiento|tarjeta|nip|activar|bloque|reposici|extrav/.test(q)) return 'soporte_tarjeta';
    if (/cotiz|contratar|empresa|emplead|prestacion|despensa|restaurante|gasolina/.test(q)) return 'cotizar_prestaciones';
    if (/factur|cfdi|deduc|fiscal|complemento/.test(q)) return 'beneficios_fiscales';
    if (/comerc|afiliad|acept|red|ubicaci|restaurante|tienda/.test(q)) return 'buscar_comercios';
    if (/asesor|agente|humano|ejecutivo|llamada|contact/.test(q)) return 'hablar_con_agente';
    return routeConfig().intent || 'buscar_conocimiento';
  }

  function setupInvite() {
    const invite = document.getElementById('predictiveInvite');
    const launcher = document.getElementById('predictiveLauncher');
    const accept = document.getElementById('predictiveAccept');
    const dismiss = document.getElementById('predictiveDismiss');
    const close = document.getElementById('predictiveClose');
    if (!invite || !launcher) return;

    if ((cfg.inviteMode || 'center') === 'center') invite.classList.add('predictive-invite--center');

    let idleTimer = null;
    let inviteShown = false;
    let dismissed = false;
    const inactivityMs = Math.max(1, Number(cfg.inactivitySeconds || 15)) * 1000;

    function showInvite(trigger) {
      if (inviteShown || dismissed) return;
      inviteShown = true;
      invite.classList.add('is-visible');
      const title = invite.querySelector('.predictive-invite__title');
      if (title && routeConfig().route === 'knowledge') title.textContent = 'Te puedo conectar con la base MEX_CS_SIVALE';
      record('bot_invite_shown', {
        trigger: trigger || 'idle',
        idleSeconds: String(cfg.inactivitySeconds || 15),
        inviteMode: cfg.inviteMode || 'center',
        inviteRoute: routeConfig().route
      });
      try { accept && accept.focus({ preventScroll: true }); } catch (e) {}
    }

    function resetIdle() {
      if (inviteShown || dismissed) return;
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => showInvite('inactivity_15_seconds'), inactivityMs);
    }

    ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach((evt) => window.addEventListener(evt, resetIdle, { passive: true }));
    resetIdle();

    launcher.addEventListener('click', function () {
      record('bot_launcher_clicked', { source: 'floating_launcher', route: routeConfig().route });
      openMessenger();
    });

    if (accept) {
      accept.addEventListener('click', function () {
        record('bot_invite_accepted', { source: 'predictive_invite', route: routeConfig().route });
        invite.classList.remove('is-visible');
        if (cfg.openMessengerOnAccept !== false) openMessenger();
      });
    }

    function dismissInvite(source) {
      dismissed = true;
      invite.classList.remove('is-visible');
      record('bot_invite_dismissed', { source: source || 'dismiss', route: routeConfig().route });
    }
    if (dismiss) dismiss.addEventListener('click', () => dismissInvite('secondary_button'));
    if (close) close.addEventListener('click', () => dismissInvite('close_button'));
  }

  function setupTracking() {
    document.addEventListener('click', function (e) {
      const target = e.target.closest('button, a, [role="button"], .h2d-text, [data-intent]');
      if (!target) return;
      const text = (target.getAttribute('data-track-label') || target.innerText || target.getAttribute('aria-label') || '').trim().slice(0, 140);
      const href = target.getAttribute('href') || '';
      const intent = target.getAttribute('data-intent') || classifyIntent(text + ' ' + href);
      if (text || href || target.hasAttribute('data-intent')) {
        record('site_interaction', {
          label: text,
          href: href,
          element: target.tagName.toLowerCase(),
          interactionIntent: intent
        });
        if (target.hasAttribute('data-intent')) captureIntent(intent, { label: text, source: 'data_intent_click' });
      }
    });

    document.addEventListener('submit', function (e) {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      const formType = form.getAttribute('data-form-type') || form.getAttribute('id') || 'form';
      const data = Object.fromEntries(new FormData(form).entries());
      if (formType.includes('search') || form.hasAttribute('role')) {
        e.preventDefault();
        trackSearch(data.q || data.search || data.term || '', formType);
        return;
      }
      record('form_submitted', {
        formType: formType,
        product: data.product || data.tipo || '',
        employees: data.empleados || data.employees || '',
        companySize: data.empleados || data.employees || '',
        contactChannel: data.canal || data.channel || ''
      });
      captureIntent(form.getAttribute('data-intent') || classifyIntent(JSON.stringify(data)), {
        source: formType,
        product: data.product || data.tipo || '',
        employees: data.empleados || data.employees || ''
      });
    }, true);
  }

  function feedLocalPanel(eventName, payload) {
    const feed = document.getElementById('journeyFeed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'sv-feed-item';
    item.innerHTML = '<strong>' + escapeHtml(eventName) + '</strong><span>' + escapeHtml(payload.stage || '') + ' · ' + escapeHtml(payload.inferredIntent || payload.intentName || '') + '</span>';
    feed.prepend(item);
    Array.from(feed.children).slice(8).forEach((node) => node.remove());
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>'"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c];
    });
  }

  function initKnowledgeSearchFromUrl() {
    const input = document.querySelector('input[name="q"]');
    if (!input) return;
    const param = cfg.searchQueryParam || 'q';
    const term = new URL(window.location.href).searchParams.get(param) || '';
    if (term) {
      input.value = term;
      record('site_search_loaded_from_url', { searchTerm: term, queryParam: param });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadGenesys();
    initKnowledgeSearchFromUrl();

    if (typeof window.Genesys === 'function') {
      window.Genesys('subscribe', 'Journey.ready', function () {
        log('Journey.ready');
        pageview({ source: 'Journey.ready' });
        record('route_loaded', { source: 'Journey.ready' });
      });
      window.Genesys('subscribe', 'Messenger.ready', function () { log('Messenger.ready'); });
      window.Genesys('subscribe', 'Launcher.ready', function () { log('Launcher.ready'); });
    }

    setTimeout(function () {
      pageview({ source: 'fallback_timer' });
    }, 1200);

    setupInvite();
    setupTracking();
  });

  window.SivaleDemoTracking = { record, pageview, captureIntent, openMessenger, trackSearch, classifyIntent, pagePayload };
})();
