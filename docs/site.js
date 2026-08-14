(function () {
  'use strict';

  var WATCH_KEY = 'scoutly:watches:v1';
  var ANALYTICS_KEY = 'scoutly:analytics-opt-out';
  var ATTRIBUTION_KEY = 'scoutly:attribution:v1';
  var SESSION_KEY = 'scoutly:session:v1';
  var EVENT_QUEUE_KEY = 'scoutly:event-queue:v1';
  var ANALYTICS_ENDPOINT = (function () {
    var meta = document.querySelector('meta[name="scoutly-analytics-endpoint"]');
    if (meta && meta.content) return meta.content;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://127.0.0.1:4173/api/analytics/events';
    }
    return '';
  })();

  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va('beforeSend', function (event) {
    return localStorage.getItem(ANALYTICS_KEY) === '1' ? null : event;
  });

  function analyticsDisabled() {
    return localStorage.getItem(ANALYTICS_KEY) === '1';
  }

  function sessionId() {
    try {
      var existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      var next = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, next);
      return next;
    } catch (error) {
      return 'sess_fallback';
    }
  }

  function readAttribution() {
    try {
      return JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function captureAttribution() {
    var params = new URLSearchParams(window.location.search);
    var current = readAttribution();
    var next = {
      utm_source: params.get('utm_source') || current.utm_source || null,
      utm_medium: params.get('utm_medium') || current.utm_medium || null,
      utm_campaign: params.get('utm_campaign') || current.utm_campaign || null,
      utm_content: params.get('utm_content') || current.utm_content || null,
      referrer: document.referrer || current.referrer || null
    };
    try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next)); } catch (error) { /* ignore */ }
    return next;
  }

  function pageType() {
    var path = window.location.pathname;
    if (path.indexOf('/guides/') === 0) return 'guide';
    if (path.indexOf('/go/') === 0) return 'outbound';
    if (path.indexOf('/posts/') === 0) return 'post';
    if (path === '/' || path === '/index.html') return 'home';
    return 'page';
  }

  function readEventQueue() {
    try {
      var value = JSON.parse(localStorage.getItem(EVENT_QUEUE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function writeEventQueue(items) {
    try { localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(items.slice(-200))); } catch (error) { /* ignore */ }
  }

  function trackEvent(name, props) {
    if (analyticsDisabled()) return;
    var attribution = captureAttribution();
    var payload = {
      name: name,
      at: new Date().toISOString(),
      path: window.location.pathname,
      pageType: pageType(),
      sessionId: sessionId(),
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      referrer: attribution.referrer,
      meta: props || {}
    };
    if (props && props.ctaId) payload.ctaId = props.ctaId;
    if (props && props.destination) payload.destination = props.destination;

    try { window.va('event', name, payload.meta); } catch (error) { /* optional */ }

    if (navigator.sendBeacon && ANALYTICS_ENDPOINT) {
      try {
        var blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(ANALYTICS_ENDPOINT, blob)) return;
      } catch (error) { /* fall through */ }
    }

    var queue = readEventQueue();
    queue.push(payload);
    writeEventQueue(queue);
    if (window.fetch && ANALYTICS_ENDPOINT) {
      fetch(ANALYTICS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
    }
  }

  function ctaIdFromLink(link) {
    if (link.dataset.watchId) return link.dataset.watchId;
    if (link.hash) return link.hash.replace(/^#/, '');
    var href = link.getAttribute('href') || '';
    if (href.indexOf('/go/') >= 0) return href.split('/').pop().replace('.html', '');
    if (href.indexOf('amazon.in') >= 0) return 'amazon';
    return href || 'cta';
  }

  function isAffiliateLink(link) {
    var href = link.getAttribute('href') || '';
    return link.classList.contains('cta')
      || link.classList.contains('mini-cta')
      || href.indexOf('/go/') === 0
      || (href.indexOf('amazon.in') >= 0 && href.indexOf('tag=') >= 0)
      || link.getAttribute('rel') === 'nofollow sponsored';
  }

  function setupFunnelTracking() {
    var engaged = false;
    var pageStart = Date.now();
    trackEvent('page_view', { title: document.title });

    function markEngaged(reason) {
      if (engaged) return;
      engaged = true;
      trackEvent('engaged', { reason: reason, dwell_ms: Date.now() - pageStart });
    }

    window.setTimeout(function () { markEngaged('dwell_20s'); }, 20000);
    window.addEventListener('scroll', function () {
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      var ratio = window.scrollY / scrollable;
      if (ratio >= 0.5) markEngaged('scroll_50');
    }, { passive: true });

    document.addEventListener('click', function (event) {
      var link = event.target.closest('a');
      if (!link || !isAffiliateLink(link)) return;
      var destination = link.getAttribute('href') || '';
      var ctaId = ctaIdFromLink(link);
      trackEvent('cta_click', { ctaId: ctaId, destination: destination });
      if (destination.indexOf('/go/') === 0 || destination.indexOf('amazon.in') >= 0) {
        trackEvent('affiliate_outbound', { ctaId: ctaId, destination: destination });
      }
    }, true);
  }

  function exportQueuedEvents() {
    return readEventQueue();
  }

  window.scoutlyExportAnalytics = exportQueuedEvents;

  function readWatches() {
    try {
      var value = JSON.parse(localStorage.getItem(WATCH_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function saveWatches(items) {
    localStorage.setItem(WATCH_KEY, JSON.stringify(items));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character];
    });
  }

  function updateWatchUi() {
    var watches = readWatches();
    var ids = watches.map(function (item) { return item.id; });

    document.querySelectorAll('[data-watch-id]').forEach(function (button) {
      var saved = ids.indexOf(button.dataset.watchId) !== -1;
      button.setAttribute('aria-pressed', String(saved));
      button.textContent = saved ? 'Saved ✓' : 'Track this price';
    });

    document.querySelectorAll('[data-saved-count]').forEach(function (node) {
      node.textContent = String(watches.length);
    });

    var container = document.querySelector('[data-saved-items]');
    if (!container) return;

    if (!watches.length) {
      container.innerHTML = '<div class="empty-state">No saved products yet. Use “Track this price” on a checked product and it will appear here.</div>';
      return;
    }

    container.innerHTML = watches.map(function (item) {
      return '<article class="saved-item">' +
        '<a href="' + escapeHtml(item.url) + '">' + escapeHtml(item.title) + '</a>' +
        '<p>Last saved reference: ' + escapeHtml(item.price) + '. Recheck the live retailer price before buying.</p>' +
        '<button type="button" data-remove-watch="' + escapeHtml(item.id) + '">Remove</button>' +
      '</article>';
    }).join('');
  }

  function toggleWatch(button) {
    var watches = readWatches();
    var id = button.dataset.watchId;
    var index = watches.findIndex(function (item) { return item.id === id; });

    if (index >= 0) {
      watches.splice(index, 1);
    } else {
      watches.push({
        id: id,
        title: button.dataset.watchTitle || id,
        price: button.dataset.watchPrice || 'price not set',
        url: button.dataset.watchUrl || window.location.pathname
      });
      trackEvent('watch_save', { watchId: id, title: button.dataset.watchTitle || id });
    }

    saveWatches(watches);
    updateWatchUi();
  }

  function setupDiscovery() {
    var form = document.querySelector('[data-search-form]');
    var input = document.querySelector('[data-search-input]');
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-discovery-item]'));
    var status = document.querySelector('[data-result-status]');
    if (!form || !input || !items.length) return;

    var params = new URLSearchParams(window.location.search);
    var state = {
      query: params.get('q') || '',
      category: params.get('category') || 'all',
      budget: Number(params.get('budget') || 0)
    };
    input.value = state.query;

    function applyFilters() {
      var words = state.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
      var shown = 0;
      items.forEach(function (item) {
        var haystack = (item.dataset.search || item.textContent).toLowerCase();
        var categories = (item.dataset.category || '').split(' ');
        var price = Number(item.dataset.price || item.dataset.priceMax || 0);
        var queryMatch = words.every(function (word) { return haystack.indexOf(word) >= 0; });
        var categoryMatch = state.category === 'all' || categories.indexOf(state.category) >= 0;
        var budgetMatch = !state.budget || (price > 0 && price <= state.budget);
        var visible = queryMatch && categoryMatch && budgetMatch;
        item.hidden = !visible;
        if (visible) shown += 1;
      });

      document.querySelectorAll('[data-filter-category]').forEach(function (chip) {
        chip.setAttribute('aria-pressed', String(chip.dataset.filterCategory === state.category));
      });
      document.querySelectorAll('[data-filter-budget]').forEach(function (chip) {
        chip.setAttribute('aria-pressed', String(Number(chip.dataset.filterBudget) === state.budget));
      });

      if (status) {
        status.textContent = shown ? shown + (shown === 1 ? ' useful result' : ' useful results') : 'No exact match yet. Try a category or request a comparison.';
      }
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      state.query = input.value;
      applyFilters();
    });
    input.addEventListener('input', function () {
      state.query = input.value;
      applyFilters();
    });
    document.querySelectorAll('[data-filter-category]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.category = chip.dataset.filterCategory;
        applyFilters();
      });
    });
    document.querySelectorAll('[data-filter-budget]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var value = Number(chip.dataset.filterBudget);
        state.budget = state.budget === value ? 0 : value;
        applyFilters();
      });
    });
    applyFilters();
  }

  function setupAnalyticsControl() {
    var button = document.querySelector('[data-analytics-toggle]');
    var status = document.querySelector('[data-analytics-status]');
    if (!button) return;

    function render() {
      var disabled = localStorage.getItem(ANALYTICS_KEY) === '1';
      button.textContent = disabled ? 'Enable anonymous analytics' : 'Disable anonymous analytics';
      if (status) status.textContent = disabled ? 'Analytics is disabled on this device.' : 'Anonymous, cookie-free page analytics is enabled.';
    }
    button.addEventListener('click', function () {
      if (localStorage.getItem(ANALYTICS_KEY) === '1') localStorage.removeItem(ANALYTICS_KEY);
      else localStorage.setItem(ANALYTICS_KEY, '1');
      render();
    });
    render();
  }

  function setupOutboundRedirect() {
    var url = document.body.dataset.outboundUrl;
    if (!url) return;
    trackEvent('affiliate_outbound', { ctaId: window.location.pathname.split('/').pop(), destination: url });
    window.setTimeout(function () { window.location.replace(url); }, 650);
  }

  document.addEventListener('click', function (event) {
    var watchButton = event.target.closest('[data-watch-id]');
    if (watchButton) toggleWatch(watchButton);

    var removeButton = event.target.closest('[data-remove-watch]');
    if (removeButton) {
      var remaining = readWatches().filter(function (item) { return item.id !== removeButton.dataset.removeWatch; });
      saveWatches(remaining);
      updateWatchUi();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    captureAttribution();
    setupFunnelTracking();
    setupDiscovery();
    setupAnalyticsControl();
    updateWatchUi();
    setupOutboundRedirect();
  });
}());
