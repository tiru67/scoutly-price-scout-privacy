(function () {
  'use strict';

  var WATCH_KEY = 'scoutly:watches:v1';
  var ANALYTICS_KEY = 'scoutly:analytics-opt-out';

  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va('beforeSend', function (event) {
    return localStorage.getItem(ANALYTICS_KEY) === '1' ? null : event;
  });

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
    setupDiscovery();
    setupAnalyticsControl();
    updateWatchUi();
    setupOutboundRedirect();
  });
}());
