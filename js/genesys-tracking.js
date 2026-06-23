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

    const messages = {
      home: {
        title: '¡Bienvenido a Up Sí Vale!',
        subtitle: 'Asistente virtual Sí Mon',
        body: 'Soy Sí Mon. Veo que estás interesado en nuestras soluciones para tu empresa. Puedo ayudarte con vales, beneficios, tarjetas y contratación. Nuestro horario de atención es de lunes a viernes de 9 am a 6 pm.',
        cta: 'Comenzar conversación',
        triggerLabel: 'home_inactivity_15_seconds'
      },
      products: {
        title: '¿Te ayudo a comparar productos?',
        subtitle: 'Predictive Engagement · Productos',
        body: 'Veo que estás revisando soluciones de vales. Puedo ayudarte a elegir entre despensa, restaurante, gasolina, incentivos o gastos empresariales según el perfil de tu empresa.',
        cta: 'Comparar con el bot',
        triggerLabel: 'products_dwell_10_seconds'
      },
      benefits: {
        title: '¿Quieres aterrizar los beneficios?',
        subtitle: 'Predictive Engagement · Vales y beneficios',
        body: 'Detecté interés en beneficios para colaboradores. Puedo explicarte impacto fiscal, experiencia del usuario y cómo presentar la propuesta internamente.',
        cta: 'Consultar beneficios',
        triggerLabel: 'benefits_dwell_10_seconds'
      },
      acceptance: {
        title: '¿Buscas comercios afiliados?',
        subtitle: 'Predictive Engagement · Red de aceptación',
        body: 'Puedo ayudarte a encontrar dónde se aceptan las tarjetas, resolver dudas de uso y guardar esta búsqueda como intención de comercios afiliados.',
        cta: 'Buscar con el bot',
        triggerLabel: 'acceptance_dwell_10_seconds'
      },
      quote: {
        title: '¿Te ayudo con la cotización?',
        subtitle: 'Predictive Engagement · Alta intención',
        body: 'Parece que estás por cotizar. Puedo recuperar producto, número de empleados y canal preferido para iniciar una conversación con contexto comercial.',
        cta: 'Continuar cotización',
        triggerLabel: 'quote_dwell_10_seconds'
      },
      checkout: {
        title: 'Estás a un paso de enviar la solicitud',
        subtitle: 'Predictive Engagement · Conversión',
        body: 'Si tienes dudas antes de avanzar, puedo abrir el bot con el contexto de la solicitud para ayudarte a completar la información o escalar con un asesor.',
        cta: 'Resolver dudas',
        triggerLabel: 'checkout_dwell_10_seconds'
      },
      confirmation: {
        title: 'Solicitud recibida',
        subtitle: 'Predictive Engagement · Seguimiento',
        body: 'Puedo ayudarte a explicar los siguientes pasos, preparar la continuidad del caso o conectar el journey con atención comercial.',
        cta: 'Ver próximos pasos',
        triggerLabel: 'confirmation_dwell_10_seconds'
      },
      continuity: {
        title: 'Contexto listo para continuidad',
        subtitle: 'Predictive Engagement · Asistencia',
        body: 'Esta página simula la vista de continuidad. Puedo abrir Messenger con el historial de intención, ruta, producto y etapa para que el asesor retome la conversación.',
        cta: 'Abrir continuidad',
        triggerLabel: 'continuity_dwell_10_seconds'
      },
      knowledge: {
        title: '¿Buscamos en MEX_CS_SIVALE?',
        subtitle: 'Predictive Engagement · Knowledge Portal',
        body: 'Puedo ayudarte a consultar artículos de la base de conocimiento, capturar el término buscado y escalar al bot o a un agente si la respuesta no resuelve la duda.',
        cta: 'Preguntar al bot',
        triggerLabel: 'knowledge_dwell_10_seconds'
      }
    };

    function messageForRoute() {
      const route = routeConfig().route || 'home';
      return messages[route] || messages.home;
    }

    function applyInviteMessage(trigger) {
      const msg = messageForRoute();
      const title = invite.querySelector('.predictive-invite__title');
      const subtitle = invite.querySelector('.predictive-invite__subtitle');
      const body = invite.querySelector('.predictive-invite__body p');
      if (title) title.textContent = msg.title;
      if (subtitle) subtitle.textContent = msg.subtitle;
      if (body) body.textContent = msg.body;
      if (accept) accept.textContent = msg.cta;
      invite.setAttribute('data-pe-message', msg.triggerLabel || trigger || 'predictive_engagement');
      return msg;
    }

    let homeIdleTimer = null;
    let secondaryDwellTimer = null;
    let inviteShown = false;
    let dismissed = false;
    let userScrolled = false;
    const currentRoute = routeConfig().route;
    const isHome = currentRoute === 'home';
    const homeInactivityMs = Math.max(1, Number(cfg.inactivitySeconds || 15)) * 1000;
    const secondaryDwellMs = Math.max(1, Number(cfg.secondaryDwellSeconds || 10)) * 1000;

    function showInvite(trigger) {
      if (inviteShown || dismissed) return;
      inviteShown = true;
      const msg = applyInviteMessage(trigger);
      invite.classList.add('is-visible');
      record('predictive_popup_shown', {
        trigger: trigger || msg.triggerLabel || 'predictive_engagement',
        idleSeconds: isHome ? String(cfg.inactivitySeconds || 15) : '',
        dwellSeconds: !isHome ? String(cfg.secondaryDwellSeconds || 10) : '',
        inviteMode: cfg.inviteMode || 'center',
        inviteRoute: currentRoute,
        inviteTitle: msg.title,
        inviteMessage: msg.body,
        userScrolledBeforePopup: String(userScrolled)
      });
      record('bot_invite_shown', {
        trigger: trigger || msg.triggerLabel || 'predictive_engagement',
        idleSeconds: isHome ? String(cfg.inactivitySeconds || 15) : '',
        dwellSeconds: !isHome ? String(cfg.secondaryDwellSeconds || 10) : '',
        inviteMode: cfg.inviteMode || 'center',
        inviteRoute: currentRoute,
        inviteTitle: msg.title
      });
      try { accept && accept.focus({ preventScroll: true }); } catch (e) {}
    }

    function resetHomeIdle() {
      if (!isHome || inviteShown || dismissed) return;
      window.clearTimeout(homeIdleTimer);
      homeIdleTimer = window.setTimeout(function () {
        showInvite('home_inactivity_' + String(cfg.inactivitySeconds || 15) + '_seconds');
      }, homeInactivityMs);
    }

    function startSecondaryDwell() {
      if (isHome || inviteShown || dismissed) return;
      window.clearTimeout(secondaryDwellTimer);
      secondaryDwellTimer = window.setTimeout(function () {
        const trigger = userScrolled ? 'secondary_scroll_dwell_' : 'secondary_fixed_screen_';
        showInvite(trigger + String(cfg.secondaryDwellSeconds || 10) + '_seconds');
      }, secondaryDwellMs);
    }

    ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(function (evt) {
      window.addEventListener(evt, function () {
        if (evt === 'scroll') userScrolled = true;
        if (isHome) resetHomeIdle();
      }, { passive: true });
    });

    if (isHome) resetHomeIdle();
    else startSecondaryDwell();

    launcher.addEventListener('click', function () {
      record('bot_launcher_clicked', { source: 'floating_launcher', route: currentRoute });
      openMessenger();
    });

    if (accept) {
      accept.addEventListener('click', function () {
        const msg = messageForRoute();
        record('bot_invite_accepted', {
          source: 'predictive_invite',
          route: currentRoute,
          inviteTitle: msg.title,
          inviteMessage: msg.body
        });
        invite.classList.remove('is-visible');
        if (cfg.openMessengerOnAccept !== false) openMessenger();
      });
    }

    function dismissInvite(source) {
      dismissed = true;
      invite.classList.remove('is-visible');
      record('bot_invite_dismissed', { source: source || 'dismiss', route: currentRoute });
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
