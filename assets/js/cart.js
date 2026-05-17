// NRICH — Cart Management
// localStorage-based cart with drawer UI

(function () {
  'use strict';

  var CART_KEY = 'nrich_cart';
  var COUPON_KEY = 'nrich_coupon';

  // ── Helpers ──────────────────────────────────────────────────

  function getConfig() {
    return window.NRICH_CONFIG || { currency: '৳', deliveryCharge: 80, freeDeliveryAbove: 2000 };
  }

  function dispatchUpdate() {
    document.dispatchEvent(new CustomEvent('cartUpdated'));
  }

  // ── Core cart operations ──────────────────────────────────────

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    dispatchUpdate();
  }

  function addToCart(item) {
    // item: { id, name, price, originalPrice, image, color, colorValue, size, slug, category, quantity }
    var cart = getCart();
    var key = item.id + '_' + (item.color || '') + '_' + (item.size || '');
    var existing = cart.find(function (c) { return c._key === key; });
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      item._key = key;
      item.quantity = item.quantity || 1;
      cart.push(item);
    }
    saveCart(cart);
    if (window.NRICH && window.NRICH.tracking) {
      window.NRICH.tracking.addToCart(item, (item.color || '') + (item.size ? ' / ' + item.size : ''), item.quantity);
    }
    openCartDrawer();
    showToast('✔ ' + (item.name || 'Item') + ' added to cart');
  }

  function removeFromCart(key) {
    var cart = getCart();
    var removed = cart.find(function (c) { return c._key === key; });
    saveCart(cart.filter(function (c) { return c._key !== key; }));
    if (removed && window.NRICH && window.NRICH.tracking) {
      window.NRICH.tracking.removeFromCart(removed, removed.color || '', removed.quantity);
    }
  }

  function updateQuantity(key, qty) {
    var cart = getCart();
    var item = cart.find(function (c) { return c._key === key; });
    if (item) {
      item.quantity = Math.max(1, parseInt(qty, 10) || 1);
      saveCart(cart);
    }
  }

  function clearCart() {
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(COUPON_KEY);
    dispatchUpdate();
  }

  function getCount() {
    return getCart().reduce(function (s, i) { return s + i.quantity; }, 0);
  }

  function getSubtotal() {
    return getCart().reduce(function (s, i) { return s + i.price * i.quantity; }, 0);
  }

  function getDeliveryCharge() {
    var cfg = getConfig();
    var sub = getSubtotal();
    return sub > 0 && sub >= cfg.freeDeliveryAbove ? 0 : cfg.deliveryCharge;
  }

  function getTotal() {
    return getSubtotal() + getDeliveryCharge();
  }

  function getCoupon() {
    try { return JSON.parse(localStorage.getItem(COUPON_KEY)) || null; }
    catch (e) { return null; }
  }

  function getCartForTracking() {
    var t = window.NRICH && window.NRICH.tracking;
    return getCart().map(function (item) {
      return t ? t.makeItem(item, (item.color || '') + (item.size ? ' / ' + item.size : ''), item.quantity) : item;
    });
  }

  // ── Drawer ───────────────────────────────────────────────────

  function openCartDrawer() {
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('overlay');
    if (drawer) { drawer.classList.add('open'); document.body.classList.add('drawer-open'); }
    if (overlay) { overlay.classList.add('visible'); overlay.setAttribute('data-for', 'cart'); }
    renderCartDrawer();
  }

  function closeCartDrawer() {
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('overlay');
    if (drawer) { drawer.classList.remove('open'); document.body.classList.remove('drawer-open'); }
    if (overlay && overlay.getAttribute('data-for') === 'cart') { overlay.classList.remove('visible'); overlay.removeAttribute('data-for'); }
  }

  function renderCartDrawer() {
    var cart = getCart();
    var cfg = getConfig();
    var sym = cfg.currency;

    var itemsEl = document.getElementById('cart-drawer-items');
    var emptyEl = document.getElementById('cart-drawer-empty');
    var footerEl = document.getElementById('cart-drawer-footer');
    var countEl = document.querySelector('.cart-count-label');

    if (countEl) { countEl.textContent = cart.length > 0 ? '(' + getCount() + ')' : ''; }

    // Update header count badges
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      var c = getCount();
      el.textContent = c;
      el.style.display = c > 0 ? 'flex' : 'none';
    });

    if (!itemsEl) return;

    if (cart.length === 0) {
      itemsEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'block';

    var sub = getSubtotal();
    var delivery = getDeliveryCharge();
    var total = sub + delivery;

    itemsEl.innerHTML = cart.map(function (item) {
      var variantText = [item.color, item.size].filter(Boolean).join(' / ');
      return '<div class="cart-drawer-item">' +
        '<div class="cart-item-image"><a href="/products/' + item.slug + '/"><img src="' + item.image + '" alt="' + item.name + '" loading="lazy"></a></div>' +
        '<div class="cart-item-info">' +
          '<div class="item-name"><a href="/products/' + item.slug + '/">' + item.name + '</a></div>' +
          (variantText ? '<div class="item-variant">' + variantText + '</div>' : '') +
          '<div class="cart-item-controls">' +
            '<div class="qty-control">' +
              '<button class="qty-btn" onclick="NRICH.cart.changeQty(\'' + item._key + '\', ' + (item.quantity - 1) + ')">&#8722;</button>' +
              '<span class="qty-value">' + item.quantity + '</span>' +
              '<button class="qty-btn" onclick="NRICH.cart.changeQty(\'' + item._key + '\', ' + (item.quantity + 1) + ')">+</button>' +
            '</div>' +
            '<div class="item-price">' + sym + (item.price * item.quantity).toLocaleString() + '</div>' +
            '<button class="cart-item-remove" onclick="NRICH.cart.remove(\'' + item._key + '\')" title="Remove">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    // Update footer totals
    var subtotalEl = document.getElementById('cart-subtotal');
    var deliveryEl = document.getElementById('cart-delivery');
    var totalEl = document.getElementById('cart-total');
    if (subtotalEl) subtotalEl.textContent = sym + sub.toLocaleString();
    if (deliveryEl) deliveryEl.textContent = delivery === 0 ? 'FREE' : sym + delivery;
    if (totalEl) totalEl.textContent = sym + total.toLocaleString();
  }

  // ── Toast ─────────────────────────────────────────────────────

  function showToast(msg) {
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

  window.showToast = showToast;

  // ── Expose ────────────────────────────────────────────────────

  window.NRICH = window.NRICH || {};
  window.NRICH.cart = {
    get: getCart,
    add: addToCart,
    remove: removeFromCart,
    changeQty: function (key, qty) {
      if (qty < 1) { removeFromCart(key); }
      else { updateQuantity(key, qty); renderCartDrawer(); }
    },
    updateQuantity: updateQuantity,
    clear: clearCart,
    getCount: getCount,
    getSubtotal: getSubtotal,
    getDeliveryCharge: getDeliveryCharge,
    getTotal: getTotal,
    getCoupon: getCoupon,
    getCartForTracking: getCartForTracking,
    openDrawer: openCartDrawer,
    closeDrawer: closeCartDrawer,
    render: renderCartDrawer,
    showToast: showToast
  };

  // ── Init ──────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    renderCartDrawer();

    // Cart icon button
    var cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
      cartBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openCartDrawer();
      });
    }

    // Close drawer button
    var closeBtn = document.getElementById('cart-drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeCartDrawer);
    }

    // Overlay click closes drawer
    var overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.addEventListener('click', function () {
        if (overlay.getAttribute('data-for') === 'cart') closeCartDrawer();
      });
    }

    // Re-render on cart update
    document.addEventListener('cartUpdated', renderCartDrawer);
  });

})();
