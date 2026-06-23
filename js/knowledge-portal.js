(function () {
  const articles = [
    {
      id: 'saldo-app',
      title: 'Consultar saldo y movimientos desde la app',
      summary: 'Guía rápida para revisar saldo, movimientos recientes y vigencia de tu tarjeta Sí Vale.',
      category: 'Usuarios de tarjeta',
      intent: 'consultar_saldo',
      keywords: ['saldo', 'movimientos', 'app', 'consultar', 'disponible']
    },
    {
      id: 'activar-tarjeta',
      title: 'Activar tarjeta y recuperar NIP',
      summary: 'Pasos sugeridos para activar una tarjeta, cambiar NIP o resolver bloqueo de acceso.',
      category: 'Usuarios de tarjeta',
      intent: 'activar_tarjeta',
      keywords: ['activar', 'nip', 'pin', 'bloqueo', 'tarjeta']
    },
    {
      id: 'bloqueo-reposicion',
      title: 'Bloqueo, robo, extravío y reposición',
      summary: 'Qué hacer si perdiste tu tarjeta o necesitas levantar una aclaración de movimientos.',
      category: 'Soporte',
      intent: 'soporte_tarjeta',
      keywords: ['robo', 'extravío', 'extravio', 'bloquear', 'reposición', 'reposicion', 'aclaración', 'aclaracion']
    },
    {
      id: 'beneficios-fiscales',
      title: 'Beneficios fiscales para empresas',
      summary: 'Cómo los vales de despensa, restaurante y gasolina pueden apoyar la estrategia de prestaciones.',
      category: 'Empresas',
      intent: 'beneficios_fiscales',
      keywords: ['beneficios', 'fiscales', 'deducible', 'prestaciones', 'despensa', 'restaurante']
    },
    {
      id: 'cotizar-empresa',
      title: 'Cotizar tarjetas de vales para mi empresa',
      summary: 'Información necesaria para orientar una cotización y conectar con un asesor comercial.',
      category: 'Empresas',
      intent: 'cotizar_prestaciones',
      keywords: ['cotizar', 'contratar', 'empresa', 'colaboradores', 'empleados', 'precio']
    },
    {
      id: 'red-comercios',
      title: 'Dónde aceptan mi tarjeta Sí Vale',
      summary: 'Consulta de comercios, restaurantes y estaciones de gasolina afiliadas.',
      category: 'Red de aceptación',
      intent: 'comercios_afiliados',
      keywords: ['aceptan', 'comercios', 'afiliados', 'restaurantes', 'gasolina', 'ubicación', 'ubicacion']
    },
    {
      id: 'facturacion-cfdi',
      title: 'Facturación, CFDI y estados de cuenta',
      summary: 'Temas frecuentes de facturación, CFDI, complementos y reportes administrativos.',
      category: 'Facturación',
      intent: 'facturacion',
      keywords: ['factura', 'facturación', 'facturacion', 'cfdi', 'estado de cuenta', 'complemento']
    }
  ];

  const intentLabels = {
    consultar_saldo: 'Consultar saldo',
    activar_tarjeta: 'Activar tarjeta / NIP',
    soporte_tarjeta: 'Soporte de tarjeta',
    beneficios_fiscales: 'Beneficios fiscales',
    cotizar_prestaciones: 'Cotizar prestaciones',
    comercios_afiliados: 'Comercios afiliados',
    facturacion: 'Facturación / CFDI',
    hablar_con_agente: 'Hablar con agente',
    desconocida: 'Intención desconocida'
  };

  const SITE_SEARCH_QUERY_PARAMETER = 'q';

  let currentIntent = {
    name: 'desconocida',
    label: intentLabels.desconocida,
    confidence: 0,
    source: 'initial_state',
    query: ''
  };

  function normalize(value) {
    return (value || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function record(eventName, attributes) {
    const payload = Object.assign({
      portalName: 'sivale-knowledge-portal-demo',
      lastIntent: currentIntent.name,
      lastIntentLabel: currentIntent.label
    }, attributes || {});

    if (window.SivaleDemoTracking && typeof window.SivaleDemoTracking.record === 'function') {
      window.SivaleDemoTracking.record(eventName, payload);
    } else if (typeof window.Genesys === 'function') {
      window.Genesys('command', 'Journey.record', {
        eventName: eventName,
        customAttributes: payload,
        traitsMapper: []
      });
    }
    addFeedItem(eventName, payload);
  }

  function addFeedItem(eventName, payload) {
    const feed = document.getElementById('kpJourneyFeed');
    if (!feed) return;
    const row = document.createElement('div');
    row.className = 'kp-feed-item';
    const time = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    row.innerHTML = '<strong>' + escapeHtml(eventName) + '</strong>' + escapeHtml(time + ' · ' + summarizePayload(payload));
    feed.prepend(row);
    while (feed.children.length > 8) feed.removeChild(feed.lastChild);
  }

  function summarizePayload(payload) {
    const parts = [];
    if (payload.intentName) parts.push('intent=' + payload.intentName);
    if (payload.searchTerm) parts.push('query=' + payload.searchTerm);
    if (payload.category) parts.push('category=' + payload.category);
    if (payload.articleId) parts.push('article=' + payload.articleId);
    if (payload.feedback) parts.push('feedback=' + payload.feedback);
    return parts.join(' · ') || 'evento capturado';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
    });
  }

  function detectIntent(input) {
    const query = normalize(input);
    if (!query) return { name: 'desconocida', label: intentLabels.desconocida, confidence: 0, matched: [] };

    let best = { name: 'desconocida', label: intentLabels.desconocida, confidence: 0, matched: [] };
    articles.forEach(function (article) {
      const matched = article.keywords.filter(function (keyword) { return query.includes(normalize(keyword)); });
      const titleMatch = normalize(article.title).split(' ').filter(function (word) { return word.length > 4 && query.includes(word); });
      const score = Math.min(98, Math.round(((matched.length * 22) + (titleMatch.length * 10) + (query.includes(normalize(article.category)) ? 16 : 0))));
      if (score > best.confidence) {
        best = {
          name: article.intent,
          label: intentLabels[article.intent] || article.intent,
          confidence: Math.max(score, matched.length ? 62 : 0),
          matched: matched
        };
      }
    });

    if (query.includes('asesor') || query.includes('agente') || query.includes('humano') || query.includes('ejecutivo')) {
      best = { name: 'hablar_con_agente', label: intentLabels.hablar_con_agente, confidence: 95, matched: ['agente'] };
    }
    return best;
  }

  function setIntent(intent, source, query, extra) {
    currentIntent = {
      name: intent.name,
      label: intent.label,
      confidence: intent.confidence,
      source: source,
      query: query || '',
      matched: intent.matched || []
    };

    const name = document.getElementById('kpIntentName');
    const bar = document.getElementById('kpConfidenceBar');
    const meta = document.getElementById('kpIntentMeta');
    if (name) name.textContent = currentIntent.label;
    if (bar) bar.style.width = String(Math.max(0, Math.min(100, currentIntent.confidence))) + '%';
    if (meta) {
      meta.textContent = currentIntent.confidence > 0
        ? 'Confianza ' + currentIntent.confidence + '% · Fuente: ' + source + (query ? ' · Búsqueda: "' + query + '"' : '')
        : 'No se detectó intención. Intenta con saldo, activar, factura, cotizar o agente.';
    }

    if (currentIntent.name !== 'desconocida') {
      record('knowledge_intent_detected', Object.assign({
        intentName: currentIntent.name,
        intentLabel: currentIntent.label,
        confidence: String(currentIntent.confidence),
        source: source,
        searchTerm: query || '',
        matchedKeywords: (currentIntent.matched || []).join(',')
      }, extra || {}));
    }
  }

  function renderArticles(list, reason) {
    const container = document.getElementById('kpArticleList');
    if (!container) return;
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = '<div class="kp-results-empty">No encontré un artículo exacto en esta maqueta. Registraremos la intención y te sugerimos continuar con el bot para completar la atención.</div>';
      return;
    }
    list.forEach(function (article) {
      const card = document.createElement('article');
      card.className = 'kp-article';
      card.innerHTML =
        '<div class="kp-article__top">' +
          '<div><h3>' + escapeHtml(article.title) + '</h3><p>' + escapeHtml(article.summary) + '</p></div>' +
          '<span class="kp-tag">' + escapeHtml(article.category) + '</span>' +
        '</div>' +
        '<div class="kp-article__actions">' +
          '<button type="button" data-open-article="' + escapeHtml(article.id) + '" data-primary="true">Ver artículo</button>' +
          '<button type="button" data-start-bot="' + escapeHtml(article.intent) + '">Preguntar al bot</button>' +
        '</div>';
      container.appendChild(card);
    });
    if (reason) {
      record('knowledge_articles_rendered', { resultCount: String(list.length), reason: reason });
    }
  }

  function filterArticles(query) {
    const q = normalize(query);
    if (!q) return articles.slice(0, 5);
    const scored = articles.map(function (article) {
      const haystack = normalize([article.title, article.summary, article.category, article.keywords.join(' ')].join(' '));
      const matched = article.keywords.filter(function (keyword) { return q.includes(normalize(keyword)) || haystack.includes(q); });
      return { article: article, score: matched.length + (haystack.includes(q) ? 2 : 0) };
    }).filter(function (item) { return item.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.map(function (item) { return item.article; });
  }

  function openMessengerWithIntent(source, escalation) {
    record(escalation ? 'knowledge_escalation_requested' : 'knowledge_bot_started', {
      source: source,
      intentName: currentIntent.name,
      intentLabel: currentIntent.label,
      confidence: String(currentIntent.confidence),
      escalationRequested: escalation ? 'true' : 'false',
      searchTerm: currentIntent.query || ''
    });
    if (window.SivaleDemoTracking && typeof window.SivaleDemoTracking.openMessenger === 'function') {
      window.SivaleDemoTracking.openMessenger();
    } else if (typeof window.Genesys === 'function') {
      window.Genesys('command', 'Messenger.open');
    }
  }

  function updateSiteSearchUrl(query) {
    if (!window.history || !window.URL) return;
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set(SITE_SEARCH_QUERY_PARAMETER, query);
    } else {
      url.searchParams.delete(SITE_SEARCH_QUERY_PARAMETER);
    }
    const nextUrl = url.pathname + url.search + url.hash;
    if (nextUrl !== (window.location.pathname + window.location.search + window.location.hash)) {
      window.history.pushState({ sivaleSiteSearch: query || '' }, '', nextUrl);
    }
  }

  function runSearch(query, source, shouldUpdateUrl) {
    const cleanQuery = (query || '').trim();
    if (shouldUpdateUrl) updateSiteSearchUrl(cleanQuery);
    const intent = detectIntent(cleanQuery);
    const results = filterArticles(cleanQuery);
    setIntent(intent, source || 'knowledge_portal_search', cleanQuery, {
      resultCount: String(results.length),
      urlSearchParameter: SITE_SEARCH_QUERY_PARAMETER
    });
    record('knowledge_portal_search', {
      searchTerm: cleanQuery,
      resultCount: String(results.length),
      intentName: intent.name,
      intentLabel: intent.label,
      confidence: String(intent.confidence),
      source: source || 'knowledge_portal_search',
      urlSearchParameter: SITE_SEARCH_QUERY_PARAMETER
    });
    renderArticles(results, 'search');
  }

  function setupSearch() {
    const form = document.getElementById('kpSearchForm');
    const input = document.getElementById('kpSearchInput');
    if (!form || !input) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      runSearch(input.value, 'knowledge_portal_search', true);
    });

    const initialSearch = new URLSearchParams(window.location.search).get(SITE_SEARCH_QUERY_PARAMETER);
    if (initialSearch) {
      input.value = initialSearch;
      runSearch(initialSearch, 'url_query_parameter', false);
    }
  }

  function setupCategoryClicks() {
    document.querySelectorAll('.kp-category').forEach(function (button) {
      button.addEventListener('click', function () {
        document.querySelectorAll('.kp-category').forEach(function (item) { item.classList.remove('is-active'); });
        button.classList.add('is-active');
        const intentName = button.getAttribute('data-intent') || 'desconocida';
        const category = button.getAttribute('data-category') || '';
        const intent = { name: intentName, label: intentLabels[intentName] || intentName, confidence: 88, matched: [category] };
        setIntent(intent, 'knowledge_category_click', category, { category: category });
        record('knowledge_category_selected', {
          category: category,
          intentName: intentName,
          intentLabel: intent.label,
          confidence: '88'
        });
        renderArticles(articles.filter(function (article) { return article.category === category || article.intent === intentName; }), 'category');
      });
    });
  }

  function setupArticleActions() {
    document.addEventListener('click', function (event) {
      const open = event.target.closest('[data-open-article]');
      if (open) {
        const article = articles.find(function (item) { return item.id === open.getAttribute('data-open-article'); });
        if (!article) return;
        const intent = { name: article.intent, label: intentLabels[article.intent] || article.intent, confidence: 91, matched: [article.title] };
        setIntent(intent, 'knowledge_article_click', article.title, { articleId: article.id, category: article.category });
        record('knowledge_article_opened', {
          articleId: article.id,
          articleTitle: article.title,
          category: article.category,
          intentName: article.intent,
          intentLabel: intent.label
        });
      }

      const bot = event.target.closest('[data-start-bot]');
      if (bot) {
        const intentName = bot.getAttribute('data-start-bot');
        const intent = { name: intentName, label: intentLabels[intentName] || intentName, confidence: 93, matched: ['article_bot_cta'] };
        setIntent(intent, 'article_bot_cta', '', {});
        openMessengerWithIntent('article_bot_cta', false);
      }

      const feedback = event.target.closest('[data-feedback]');
      if (feedback) {
        const value = feedback.getAttribute('data-feedback');
        record('knowledge_article_feedback', {
          feedback: value,
          intentName: currentIntent.name,
          intentLabel: currentIntent.label,
          searchTerm: currentIntent.query || ''
        });
        if (value === 'no') openMessengerWithIntent('negative_feedback', true);
      }
    });
  }

  function setupBotButtons() {
    const startBot = document.getElementById('kpStartBot');
    const escalate = document.getElementById('kpEscalate');
    const navBot = document.getElementById('kpNavBot');
    if (startBot) startBot.addEventListener('click', function () { openMessengerWithIntent('side_panel', false); });
    if (escalate) escalate.addEventListener('click', function () { openMessengerWithIntent('side_panel', true); });
    if (navBot) navBot.addEventListener('click', function () { openMessengerWithIntent('nav_button', false); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderArticles(articles.slice(0, 5), 'initial_load');
    setupSearch();
    setupCategoryClicks();
    setupArticleActions();
    setupBotButtons();
    record('knowledge_portal_loaded', { source: 'DOMContentLoaded', articleCount: String(articles.length) });
  });
})();
