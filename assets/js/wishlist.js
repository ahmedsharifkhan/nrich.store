// NRICH — Wishlist Management
// localStorage-based wishlist

(function () {
  'use strict';

  var WISHLIST_KEY = 'nrich_wishlist';

  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveWishlist(list) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
    document.dispatchEvent(new CustomEvent('wishlistUpdated'));
  }

  function isInWishlist(productId) {
    return getWishlist().some(function (p) { return p.id === productId || p.slug === productId; });
  }

  function addToWishlist(product) {
    var list = getWishlist();
    var id = product.id || product.slug;
    if (!list.some(function (p) { return (p.id || p.slug) === id; })) {
      list.push(product);
      saveWishlist(list);
      if (window.NRICH && window.NRICH.tracking) {
        window.NRICH.tracking.addToWishlist(product, '');
      }
      showToast('♥ ' + (product.name || product.title || 'Item') + ' added to wishlist');
    }
  }

  function removeFromWishlist(productId) {
    var list = getWishlist().filter(function (p) {
      return (p.id || p.slug) !== productId;
    });
    saveWishlist(list);
    if (window.NRICH && window.NRICH.tracking) {
      var product = getWishlist().find(function (p) { return (p.id || p.slug) === productId; });
      if (product) window.NRICH.tracking.removeFromWishlist(product);
    }
    showToast('Removed from wishlist');
  }

  function toggleWishlist(product) {
    var id = product.id || product.slug;
    if (isInWishlist(id)) {
      removeFromWishlist(id);
    } else {
      addToWishlist(product);
    }
    updateWishlistButtons(id);
    return isInWishlist(id);
  }

  function getCount() {
    return getWishlist().length;
  }

  function updateWishlistButtons(productId) {
    var inList = isInWishlist(productId);
    document.querySelectorAll('[data-wishlist-id="' + productId + '"]').forEach(function (btn) {
      btn.classList.toggle('active', inList);
      btn.setAttribute('aria-label', inList ? 'Remove from wishlist' : 'Add to wishlist');
    });
    // Update count badges
    document.querySelectorAll('[data-wishlist-count]').forEach(function (el) {
      var c = getCount();
      el.textContent = c;
      el.style.display = c > 0 ? 'flex' : 'none';
    });
  }

  function updateAllWishlistButtons() {
    var list = getWishlist();
    document.querySelectorAll('[data-wishlist-id]').forEach(function (btn) {
      var id = btn.getAttribute('data-wishlist-id');
      var inList = list.some(function (p) { return (p.id || p.slug) === id; });
      btn.classList.toggle('active', inList);
    });
    document.querySelectorAll('[data-wishlist-count]').forEach(function (el) {
      var c = getCount();
      el.textContent = c;
      el.style.display = c > 0 ? 'flex' : 'none';
    });
  }

  function showToast(msg) {
    if (window.showToast) { window.showToast(msg); return; }
    var t = document.createElement('div');
    t.className = 'nrich-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 2800);
  }

  // ── Wishlist Page Renderer ────────────────────────────────────

  function renderWishlistPage() {
    var grid = document.getElementById('wishlist-grid');
    var emptyEl = document.getElementById('wishlist-empty');
    if (!grid) return;

    var list = getWishlist();
    var cfg = window.NRICH_CONFIG || { currency: '৳' };
    var sym = cfg.currency;

    if (list.length === 0) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    grid.innerHTML = list.map(function (p) {
      var id = p.id || p.slug;
      var slug = p.slug || p.id;
      var price = parseFloat(p.sale_price) > 0 ? parseFloat(p.sale_price) : parseFloat(p.price);
      var orig = parseFloat(p.sale_price) > 0 ? parseFloat(p.price) : 0;
      var img = p.image || (p.images && p.images[0]) || '';
      return '<div class="product-card" data-product-id="' + id + '">' +
        '<div class="product-card-image-wrap">' +
          '<a href="/products/' + slug + '/">' +
            '<img src="' + img + '" alt="' + (p.name || p.title) + '" class="primary" loading="lazy">' +
          '</a>' +
          '<button class="wishlist-btn active" data-wishlist-id="' + id + '" onclick="NRICH.wishlist.remove(\'' + id + '\'); renderWishlistPage();">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="product-card-info">' +
          '<div class="product-card-category">' + (p.category_name || p.category || '') + '</div>' +
          '<h4 class="product-card-name"><a href="/products/' + slug + '/">' + (p.name || p.title) + '</a></h4>' +
          '<div class="product-card-price">' +
            (orig > 0 ? '<span class="original-price">' + sym + orig.toLocaleString() + '</span>' : '') +
            '<span class="current-price">' + sym + price.toLocaleString() + '</span>' +
          '</div>' +
          '<button class="btn btn--primary btn--full" style="margin-top:12px" onclick="NRICH.cart.add({id:\'' + id + '\',name:\'' + (p.name || p.title).replace(/'/g, "\\'") + '\',price:' + price + ',originalPrice:' + (orig || price) + ',image:\'' + img + '\',slug:\'' + slug + '\',category:\'' + (p.category || '') + '\',quantity:1}); renderWishlistPage();">Add to Cart</button>' +
        '</div>' +
      '</div>';
    }).join('');

    window.renderWishlistPage = renderWishlistPage;
  }

  window.renderWishlistPage = renderWishlistPage;

  // ── Expose ────────────────────────────────────────────────────

  window.NRICH = window.NRICH || {};
  window.NRICH.wishlist = {
    get: getWishlist,
    add: addToWishlist,
    remove: removeFromWishlist,
    toggle: toggleWishlist,
    isIn: isInWishlist,
    getCount: getCount,
    render: renderWishlistPage
  };

  // ── Init ──────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    updateAllWishlistButtons();
    renderWishlistPage();

    // Delegate wishlist button clicks on wishlist-toggle buttons
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-wishlist-id]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var id = btn.getAttribute('data-wishlist-id');
      var productEl = btn.closest('[data-product]');
      var product = null;

      if (productEl) {
        try { product = JSON.parse(productEl.getAttribute('data-product')); } catch (err) {}
      }

      // Try current product on product page
      if (!product && window.CURRENT_PRODUCT) {
        product = window.CURRENT_PRODUCT;
      }

      // Fallback: build minimal product from page data
      if (!product) {
        var products = window.NRICH_PRODUCTS || [];
        product = products.find(function (p) { return (p.id || p.slug) === id; });
      }

      if (product) {
        var isNowIn = toggleWishlist(product);
        btn.classList.toggle('active', isNowIn);
      }
    });

    document.addEventListener('wishlistUpdated', updateAllWishlistButtons);
  });

})();
