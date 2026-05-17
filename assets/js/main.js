// NRICH — Main Site JavaScript
// Header, mobile menu, announcement bar, toasts, quick view, shop filters

(function () {
  'use strict';

  // ── Header Scroll ─────────────────────────────────────────────

  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastY = 0;
    var ticking = false;

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(function () {
          var y = window.scrollY;
          header.classList.toggle('scrolled', y > 10);
          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── Mobile Navigation ─────────────────────────────────────────

  function initMobileNav() {
    var hamburger = document.getElementById('hamburger-btn');
    var mobileNav = document.getElementById('mobile-nav');
    var overlay = document.getElementById('overlay');
    var closeNav = document.getElementById('mobile-nav-close');

    function openNav() {
      if (!mobileNav) return;
      mobileNav.classList.add('open');
      if (hamburger) hamburger.classList.add('active');
      document.body.classList.add('nav-open');
      if (overlay) { overlay.classList.add('visible'); overlay.setAttribute('data-for', 'nav'); }
    }

    function closeNavFn() {
      if (!mobileNav) return;
      mobileNav.classList.remove('open');
      if (hamburger) hamburger.classList.remove('active');
      document.body.classList.remove('nav-open');
      if (overlay && overlay.getAttribute('data-for') === 'nav') {
        overlay.classList.remove('visible');
        overlay.removeAttribute('data-for');
      }
    }

    if (hamburger) hamburger.addEventListener('click', openNav);
    if (closeNav) closeNav.addEventListener('click', closeNavFn);
    if (overlay) {
      overlay.addEventListener('click', function () {
        if (overlay.getAttribute('data-for') === 'nav') closeNavFn();
      });
    }

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (mobileNav && mobileNav.classList.contains('open')) closeNavFn();
      }
    });
  }

  // ── Announcement Bar ──────────────────────────────────────────

  function initAnnouncementBar() {
    // Ticker bar is always visible — no close button, no session storage check
  }

  // ── Toast Notifications ───────────────────────────────────────

  function showToast(msg, type) {
    // Remove existing toasts
    document.querySelectorAll('.nrich-toast').forEach(function (t) {
      t.classList.remove('show');
    });
    var t = document.createElement('div');
    t.className = 'nrich-toast' + (type ? ' nrich-toast--' + type : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 2800);
  }

  window.showToast = showToast;

  // ── Quick View Modal ──────────────────────────────────────────

  function initQuickView() {
    var modal = document.getElementById('quick-view-modal');
    var modalClose = document.getElementById('quick-view-close');
    var overlay = document.getElementById('overlay');

    if (!modal) return;

    if (modalClose) {
      modalClose.addEventListener('click', closeQuickView);
    }

    if (overlay) {
      overlay.addEventListener('click', function () {
        if (overlay.getAttribute('data-for') === 'quickview') closeQuickView();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeQuickView();
    });

    // Quick view trigger buttons
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-quick-view]');
      if (!btn) return;
      e.preventDefault();
      var productId = btn.getAttribute('data-quick-view');
      var products = window.NRICH_PRODUCTS || [];
      var product = products.find(function (p) { return (p.id || p.slug) === productId; });
      if (product) openQuickView(product);
    });
  }

  function openQuickView(product) {
    var modal = document.getElementById('quick-view-modal');
    var overlay = document.getElementById('overlay');
    if (!modal) return;

    var cfg = window.NRICH_CONFIG || { currency: '৳' };
    var sym = cfg.currency;
    var price = parseFloat(product.sale_price) > 0 ? parseFloat(product.sale_price) : parseFloat(product.price);
    var orig = parseFloat(product.sale_price) > 0 ? parseFloat(product.price) : 0;
    var img = (product.images && product.images[0]) || product.image || '';
    var slug = product.slug || product.id;

    var content = modal.querySelector('.quick-view-content');
    if (content) {
      content.innerHTML =
        '<div class="quick-view-img"><img src="' + img + '" alt="' + (product.name || product.title) + '"></div>' +
        '<div class="quick-view-info">' +
          '<div class="product-card-category">' + (product.category_name || product.category || '') + '</div>' +
          '<h2 class="quick-view-name">' + (product.name || product.title) + '</h2>' +
          '<div class="quick-view-price">' +
            (orig > 0 ? '<span class="original-price" style="text-decoration:line-through;color:var(--gray-400);margin-right:8px">' + sym + orig.toLocaleString() + '</span>' : '') +
            '<span class="current-price" style="font-size:24px;font-weight:600">' + sym + price.toLocaleString() + '</span>' +
          '</div>' +
          '<p style="color:var(--gray-600);margin:16px 0">' + (product.description_short || '') + '</p>' +
          '<div style="display:flex;gap:12px;margin-top:24px">' +
            '<a href="/products/' + slug + '/" class="btn btn--outline" style="flex:1">View Details</a>' +
            '<button class="btn btn--primary" style="flex:1" onclick="NRICH.cart.add({id:\'' + (product.id || slug) + '\',name:\'' + (product.name || product.title).replace(/'/g, "\\'") + '\',price:' + price + ',originalPrice:' + (orig || price) + ',image:\'' + img + '\',slug:\'' + slug + '\',category:\'' + (product.category || '') + '\',quantity:1}); closeQuickView();">Add to Cart</button>' +
          '</div>' +
        '</div>';
    }

    modal.classList.add('open');
    document.body.classList.add('modal-open');
    if (overlay) { overlay.classList.add('visible'); overlay.setAttribute('data-for', 'quickview'); }
  }

  function closeQuickView() {
    var modal = document.getElementById('quick-view-modal');
    var overlay = document.getElementById('overlay');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
    if (overlay && overlay.getAttribute('data-for') === 'quickview') {
      overlay.classList.remove('visible');
      overlay.removeAttribute('data-for');
    }
  }

  window.closeQuickView = closeQuickView;

  // ── Shop Page Filtering & Sorting ─────────────────────────────

  function initShopFilters() {
    var filterBtns = document.querySelectorAll('[data-filter]');
    var sortSelect = document.getElementById('sort-select');
    var grid = document.getElementById('products-grid');
    if (!grid) return;

    var allCards = Array.from(document.querySelectorAll('.product-card[data-product-json]'));
    var activeFilter = 'all';
    var activeSort = 'default';

    function getProducts() {
      return allCards.map(function (card) {
        try { return { el: card, data: JSON.parse(card.getAttribute('data-product-json')) }; }
        catch (e) { return { el: card, data: {} }; }
      });
    }

    function applyFiltersAndSort() {
      var products = getProducts();
      // Filter
      var filtered = products.filter(function (p) {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'new') return p.data.is_new;
        if (activeFilter === 'bestseller' || activeFilter === 'best') return p.data.is_bestseller || p.data.is_best_seller;
        if (activeFilter === 'sale') return p.data.is_sale || (p.data.sale_price && p.data.sale_price > 0);
        return (p.data.category || p.data.category_slug) === activeFilter;
      });

      // Sort
      filtered.sort(function (a, b) {
        var ap = parseFloat(a.data.sale_price) > 0 ? parseFloat(a.data.sale_price) : parseFloat(a.data.price);
        var bp = parseFloat(b.data.sale_price) > 0 ? parseFloat(b.data.sale_price) : parseFloat(b.data.price);
        if (activeSort === 'price-asc') return ap - bp;
        if (activeSort === 'price-desc') return bp - ap;
        if (activeSort === 'newest') return (b.data.is_new ? 1 : 0) - (a.data.is_new ? 1 : 0);
        if (activeSort === 'bestselling') return ((b.data.is_bestseller || b.data.is_best_seller) ? 1 : 0) - ((a.data.is_bestseller || a.data.is_best_seller) ? 1 : 0);
        return 0;
      });

      // Re-order DOM
      allCards.forEach(function (card) { card.style.display = 'none'; });
      filtered.forEach(function (p) { p.el.style.display = ''; });

      // Update count
      var countEl = document.getElementById('product-count');
      if (countEl) countEl.textContent = filtered.length + ' product' + (filtered.length !== 1 ? 's' : '');

      // View item list tracking
      if (window.NRICH && window.NRICH.tracking) {
        window.NRICH.tracking.viewItemList(filtered.map(function (p) { return p.data; }), activeFilter);
      }
    }

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter');
        applyFiltersAndSort();
      });
    });

    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        activeSort = sortSelect.value;
        applyFiltersAndSort();
      });
    }

    // Check URL params for initial filter
    var params = new URLSearchParams(window.location.search);
    var filterParam = params.get('filter');
    if (filterParam) {
      var targetBtn = document.querySelector('[data-filter="' + filterParam + '"]');
      if (targetBtn) { targetBtn.click(); return; }
    }

    applyFiltersAndSort();
  }

  // ── Active Nav Links ──────────────────────────────────────────

  function initActiveNav() {
    var currentPath = window.location.pathname.replace(/\/$/, '');
    document.querySelectorAll('.nav-link').forEach(function (link) {
      var href = (link.getAttribute('href') || '').replace(/\/$/, '');
      if (href && currentPath === href) {
        link.classList.add('active');
      } else if (href && href !== '' && currentPath.startsWith(href) && href.length > 1) {
        link.classList.add('active');
      }
    });
  }

  // ── Lazy Load Images ──────────────────────────────────────────

  function initLazyLoad() {
    if (!('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          if (img.getAttribute('data-src')) {
            img.src = img.getAttribute('data-src');
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '200px 0px' });

    document.querySelectorAll('img[data-src]').forEach(function (img) {
      observer.observe(img);
    });
  }

  // ── Newsletter Form ───────────────────────────────────────────

  function initNewsletter() {
    var form = document.getElementById('newsletter-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailInput = form.querySelector('input[type="email"]');
      if (!emailInput || !emailInput.value) return;
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.classList.add('loading'); btn.disabled = true; }
      // Simulate submission
      setTimeout(function () {
        if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
        showToast('Thank you for subscribing!');
        form.reset();
      }, 1000);
    });
  }

  // Contact form handled in contact.html inline script

  // ── Page View Tracking ────────────────────────────────────────

  function firePageView() {
    if (window.NRICH && window.NRICH.tracking) {
      var pt = document.body.getAttribute('data-page-type') || 'other';
      window.NRICH.tracking.pageView(pt);
    }
  }

  // ── Init All ──────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initMobileNav();
    initAnnouncementBar();
    initQuickView();
    initShopFilters();
    initActiveNav();
    initLazyLoad();
    initNewsletter();
    firePageView();

    // view_item_list on homepage / shop
    var pt = document.body.getAttribute('data-page-type');
    if ((pt === 'home' || pt === 'shop' || pt === 'category') && window.NRICH && window.NRICH.tracking) {
      var products = window.NRICH_PRODUCTS || [];
      if (products.length) window.NRICH.tracking.viewItemList(products, 'Product List');
    }
  });

})();
