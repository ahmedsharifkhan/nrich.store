// NRICH — Cart Management
// localStorage-based cart with drawer UI

(function () {
  'use strict';

  var CART_KEY    = 'nrich_cart';
  var COUPON_KEY  = 'nrich_coupon';
  var LOCK_KEY    = 'nrich_coupon_lock';
  var MAX_ATTEMPTS = 3;
  var LOCK_MS     = 15 * 60 * 1000; // 15 min

  // ── Coupon definitions (codes stored as hashes — not plain text) ──
  // Hash algo: djb2-like, 31-multiply, 31-bit mask → hex
  // To add a new coupon: compute hash with hashCode(CODE.toUpperCase().trim())
  // NRICH100  → 18be0b87  (৳100 off, no minimum)
  var COUPONS = [
    { h: '18be0b87', code: 'NRICH100', type: 'fixed', amount: 100, min: 0, label: '৳100 off' }
  ];

  function hashCode(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = ((h * 31 + s.charCodeAt(i)) & 0x7fffffff);
    }
    return h.toString(16);
  }

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
    return Math.max(0, getSubtotal() - getDiscount() + getDeliveryCharge());
  }

  function getCoupon() {
    try { return JSON.parse(localStorage.getItem(COUPON_KEY)) || null; }
    catch (e) { return null; }
  }

  function saveCoupon(obj) {
    localStorage.setItem(COUPON_KEY, JSON.stringify(obj));
  }

  function getDiscount() {
    var coupon = getCoupon();
    if (!coupon) return 0;
    var sub = getSubtotal();
    if (coupon.type === 'fixed')   return Math.min(coupon.amount, sub);
    if (coupon.type === 'percent') return Math.round(sub * coupon.percent / 100);
    return 0;
  }

  // ── Rate limiting ─────────────────────────────────────────────
  function getLockData() {
    try { return JSON.parse(sessionStorage.getItem(LOCK_KEY)) || { count: 0 }; }
    catch (e) { return { count: 0 }; }
  }

  function isLocked() {
    var d = getLockData();
    if (d.until && Date.now() < d.until) return true;
    if (d.until && Date.now() >= d.until) { sessionStorage.removeItem(LOCK_KEY); }
    return false;
  }

  function recordFailedAttempt() {
    var d = getLockData();
    d.count = (d.count || 0) + 1;
    if (d.count >= MAX_ATTEMPTS) d.until = Date.now() + LOCK_MS;
    sessionStorage.setItem(LOCK_KEY, JSON.stringify(d));
  }

  function resetLock() { sessionStorage.removeItem(LOCK_KEY); }

  // ── Apply / Remove coupon ─────────────────────────────────────
  function applyCoupon() {
    var input = document.getElementById('coupon-input');
    var msgEl = document.getElementById('coupon-msg');

    if (isLocked()) {
      setCouponMsg('Too many wrong attempts. Try again in 15 minutes.', 'error');
      return;
    }

    var code = input ? input.value.toUpperCase().trim() : '';
    if (!code) { setCouponMsg('Please enter a coupon code.', 'error'); return; }

    var h = hashCode(code);
    var match = COUPONS.find(function (c) { return c.h === h; });

    if (!match) {
      recordFailedAttempt();
      var d = getLockData();
      var left = MAX_ATTEMPTS - d.count;
      setCouponMsg(left > 0
        ? 'Invalid coupon code. ' + left + ' attempt(s) remaining.'
        : 'Too many wrong attempts. Try again in 15 minutes.', 'error');
      return;
    }

    var sub = getSubtotal();
    if (sub < match.min) {
      setCouponMsg('Minimum order ৳' + match.min + ' required for this coupon.', 'error');
      return;
    }

    saveCoupon({ code: match.code, type: match.type, amount: match.amount, percent: match.percent, label: match.label });
    resetLock();
    if (input) input.value = '';
    setCouponMsg('', '');
    renderCartDrawer();
    showToast('Coupon applied — ' + match.label + '!');
  }

  function removeCoupon() {
    localStorage.removeItem(COUPON_KEY);
    setCouponMsg('', '');
    renderCartDrawer();
  }

  function setCouponMsg(msg, type) {
    var el = document.getElementById('coupon-msg');
    if (!el) return;
    el.textContent = msg;
    el.className = 'coupon-msg' + (type ? ' coupon-msg--' + type : '');
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
        '<div class="cart-item-image"><a href="' + (window.NRICH_BASEURL||'') + '/products/' + item.slug + '/"><img src="' + item.image + '" alt="' + item.name + '" loading="lazy"></a></div>' +
        '<div class="cart-item-info">' +
          '<div class="item-name"><a href="' + (window.NRICH_BASEURL||'') + '/products/' + item.slug + '/">' + item.name + '</a></div>' +
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
    var discount = getDiscount();
    var total    = Math.max(0, sub - discount + delivery);

    var subtotalEl  = document.getElementById('cart-subtotal');
    var deliveryEl  = document.getElementById('cart-delivery');
    var totalEl     = document.getElementById('cart-total');
    var discountRow = document.getElementById('cart-discount-row');
    var discountEl  = document.getElementById('cart-discount');
    if (subtotalEl) subtotalEl.textContent = sym + sub.toLocaleString();
    if (deliveryEl) deliveryEl.textContent = delivery === 0 ? 'FREE' : sym + delivery;
    if (totalEl)    totalEl.textContent    = sym + total.toLocaleString();
    if (discountRow) discountRow.style.display = discount > 0 ? 'flex' : 'none';
    if (discountEl)  discountEl.textContent    = '-' + sym + discount.toLocaleString();

    // Update coupon UI state
    var coupon = getCoupon();
    var inputRow    = document.getElementById('coupon-input-row');
    var appliedRow  = document.getElementById('coupon-applied-row');
    var appliedLbl  = document.getElementById('coupon-applied-label');
    if (coupon) {
      if (inputRow)   inputRow.style.display   = 'none';
      if (appliedRow) appliedRow.style.display = 'flex';
      if (appliedLbl) appliedLbl.textContent   = coupon.code + ' — ' + coupon.label;
    } else {
      if (inputRow)   inputRow.style.display   = 'flex';
      if (appliedRow) appliedRow.style.display = 'none';
    }
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
    getDiscount: getDiscount,
    getTotal: getTotal,
    getCoupon: getCoupon,
    applyCoupon: applyCoupon,
    removeCoupon: removeCoupon,
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

    // Coupon apply button
    var applyBtn = document.getElementById('coupon-apply-btn');
    if (applyBtn) applyBtn.addEventListener('click', applyCoupon);

    // Coupon input Enter key
    var couponInput = document.getElementById('coupon-input');
    if (couponInput) {
      couponInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') applyCoupon();
      });
    }

    // Coupon remove button
    var removeBtn = document.getElementById('coupon-remove-btn');
    if (removeBtn) removeBtn.addEventListener('click', removeCoupon);
  });

})();
