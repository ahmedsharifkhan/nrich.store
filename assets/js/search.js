// NRICH — Client-Side Product Search

(function () {
  'use strict';

  var debounceTimer = null;
  var lastQuery = '';

  function getProducts() {
    return window.NRICH_PRODUCTS || window.NRICH && window.NRICH.products || [];
  }

  function normalize(str) {
    return (str || '').toLowerCase().trim();
  }

  function scoreProduct(product, query) {
    var q = normalize(query);
    var name = normalize(product.name || product.title || '');
    var category = normalize(product.category || product.category_slug || '');
    var tags = (product.tags || []).join(' ').toLowerCase();
    var desc = normalize(product.description_short || product.description || '');

    if (!q) return 0;
    var score = 0;
    if (name.startsWith(q)) score += 10;
    if (name.includes(q)) score += 6;
    if (category.includes(q)) score += 4;
    if (tags.includes(q)) score += 3;
    if (desc.includes(q)) score += 1;
    return score;
  }

  function searchProducts(query) {
    if (!query || query.length < 2) return [];
    return getProducts()
      .map(function (p) { return { product: p, score: scoreProduct(p, query) }; })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (r) { return r.product; });
  }

  function renderResults(results, query, container) {
    var cfg = window.NRICH_CONFIG || { currency: '৳' };
    var sym = cfg.currency;

    if (!results.length) {
      container.innerHTML = '<div class="search-no-results">' +
        '<p>No results for &ldquo;' + escapeHtml(query) + '&rdquo;</p>' +
        '<p class="text-sm" style="margin-top:8px;color:var(--gray-500)">Try a different search term</p>' +
      '</div>';
      return;
    }

    container.innerHTML = '<div class="search-results-grid">' +
      results.slice(0, 12).map(function (p) {
        var slug = p.slug || p.id;
        var img = p.image || (p.images && p.images[0]) || '';
        var price = parseFloat(p.sale_price) > 0 ? parseFloat(p.sale_price) : parseFloat(p.price);
        var orig = parseFloat(p.sale_price) > 0 ? parseFloat(p.price) : 0;
        return '<a href="' + (window.NRICH_BASEURL||'') + '/products/' + slug + '/" class="search-result-card">' +
          '<div class="search-result-img"><img src="' + img + '?w=300&q=75" alt="' + escapeHtml(p.name || p.title) + '" loading="lazy"></div>' +
          '<div class="search-result-info">' +
            '<div class="search-result-name">' + escapeHtml(p.name || p.title) + '</div>' +
            '<div class="search-result-price">' +
              (orig > 0 ? '<span class="original-price">' + sym + orig.toLocaleString() + '</span> ' : '') +
              sym + price.toLocaleString() +
            '</div>' +
          '</div>' +
        '</a>';
      }).join('') +
    '</div>';
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function performSearch(query, container) {
    query = (query || '').trim();
    if (!query) { container.innerHTML = ''; return; }
    var results = searchProducts(query);
    renderResults(results, query, container);
    if (query !== lastQuery && query.length >= 2) {
      lastQuery = query;
      if (window.NRICH && window.NRICH.tracking) {
        window.NRICH.tracking.search(query, results.length);
      }
    }
  }

  // ── Search Overlay ────────────────────────────────────────────

  function openSearch() {
    var overlay = document.getElementById('search-overlay');
    var input = document.getElementById('search-input');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.classList.add('search-open');
    setTimeout(function () { if (input) input.focus(); }, 100);
  }

  function closeSearch() {
    var overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.classList.remove('search-open');
    var input = document.getElementById('search-input');
    if (input) input.value = '';
    var results = document.getElementById('search-results');
    if (results) results.innerHTML = '';
    lastQuery = '';
  }

  // ── Search Page ───────────────────────────────────────────────

  function renderSearchPage() {
    var pageInput = document.getElementById('search-page-input');
    var pageResults = document.getElementById('search-page-results');
    var pageCount = document.getElementById('search-result-count');
    if (!pageInput || !pageResults) return;

    var params = new URLSearchParams(window.location.search);
    var q = params.get('q') || '';
    if (q) {
      pageInput.value = q;
      var results = searchProducts(q);
      if (pageCount) pageCount.textContent = results.length + ' result' + (results.length !== 1 ? 's' : '') + ' for "' + q + '"';
      renderSearchPageResults(results, q, pageResults);
      if (window.NRICH && window.NRICH.tracking) {
        window.NRICH.tracking.search(q, results.length);
      }
    }

    pageInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        var q2 = pageInput.value.trim();
        if (q2.length < 2) { pageResults.innerHTML = ''; if (pageCount) pageCount.textContent = ''; return; }
        var results2 = searchProducts(q2);
        if (pageCount) pageCount.textContent = results2.length + ' result' + (results2.length !== 1 ? 's' : '') + ' for "' + q2 + '"';
        renderSearchPageResults(results2, q2, pageResults);
      }, 300);
    });

    var searchForm = document.getElementById('search-page-form');
    if (searchForm) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var q3 = pageInput.value.trim();
        if (!q3) return;
        window.history.replaceState(null, '', '/search/?q=' + encodeURIComponent(q3));
        var results3 = searchProducts(q3);
        if (pageCount) pageCount.textContent = results3.length + ' result' + (results3.length !== 1 ? 's' : '') + ' for "' + q3 + '"';
        renderSearchPageResults(results3, q3, pageResults);
        if (window.NRICH && window.NRICH.tracking) {
          window.NRICH.tracking.search(q3, results3.length);
        }
      });
    }
  }

  function renderSearchPageResults(results, query, container) {
    var cfg = window.NRICH_CONFIG || { currency: '৳' };
    var sym = cfg.currency;

    if (!results.length) {
      container.innerHTML = '<div style="text-align:center;padding:60px 0;color:var(--gray-500)"><p style="font-family:var(--font-display);font-size:24px">No results found</p><p style="margin-top:8px">Try searching for something else</p></div>';
      return;
    }

    container.innerHTML = '<div class="products-grid">' +
      results.map(function (p) {
        var slug = p.slug || p.id;
        var img = p.image || (p.images && p.images[0]) || '';
        var hoverImg = p.hover_image || (p.images && p.images[1]) || img;
        var price = parseFloat(p.sale_price) > 0 ? parseFloat(p.sale_price) : parseFloat(p.price);
        var orig = parseFloat(p.sale_price) > 0 ? parseFloat(p.price) : 0;
        var discountPct = orig > 0 ? Math.round((1 - price / orig) * 100) : 0;
        return '<div class="product-card">' +
          '<div class="product-card-image-wrap">' +
            '<a href="' + (window.NRICH_BASEURL||'') + '/products/' + slug + '/">' +
              '<img src="' + img + '" alt="' + escapeHtml(p.name || p.title) + '" class="primary" loading="lazy">' +
              (hoverImg !== img ? '<img src="' + hoverImg + '" alt="" class="product-hover-img" loading="lazy">' : '') +
            '</a>' +
            '<button class="wishlist-btn" data-wishlist-id="' + (p.id || slug) + '">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
            '</button>' +
            (discountPct > 0 ? '<div class="product-badge badge badge--sale">-' + discountPct + '%</div>' : (p.is_new ? '<div class="product-badge badge badge--new">NEW</div>' : '')) +
          '</div>' +
          '<div class="product-card-info">' +
            '<div class="product-card-category">' + (p.category_name || p.category || '') + '</div>' +
            '<h4 class="product-card-name"><a href="' + (window.NRICH_BASEURL||'') + '/products/' + slug + '/">' + escapeHtml(p.name || p.title) + '</a></h4>' +
            '<div class="product-card-price">' +
              (orig > 0 ? '<span class="original-price">' + sym + orig.toLocaleString() + '</span>' : '') +
              '<span class="current-price">' + sym + price.toLocaleString() + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  // ── Init ──────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var searchBtn = document.getElementById('search-btn');
    var closeBtn = document.getElementById('search-close');
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');

    if (searchBtn) searchBtn.addEventListener('click', openSearch);
    if (closeBtn) closeBtn.addEventListener('click', closeSearch);

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSearch();
    });

    if (input && results) {
      input.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          performSearch(input.value, results);
        }, 250);
      });

      // Press Enter to go to search page
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var q = input.value.trim();
          if (q) { window.location.href = '/search/?q=' + encodeURIComponent(q); }
        }
      });
    }

    // Search page
    renderSearchPage();
  });

  window.NRICH = window.NRICH || {};
  window.NRICH.search = { open: openSearch, close: closeSearch, perform: performSearch };

})();
