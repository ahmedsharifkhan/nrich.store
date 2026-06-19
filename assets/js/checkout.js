// NRICH — Cash on Delivery Checkout
// Form validation, order generation, webhook submission

(function () {
  'use strict';

  // ── Order ID Generator ────────────────────────────────────────

  function generateOrderId() {
    var ts = Date.now().toString(36).toUpperCase();
    var rand = Math.random().toString(36).substr(2, 5).toUpperCase();
    return 'NRICH-' + ts + '-' + rand;
  }

  // ── Get selected shipping charge ──────────────────────────────

  function getShippingCharge() {
    var zone = document.querySelector('input[name="shipping_zone"]:checked');
    if (zone) return parseInt(zone.value, 10) || 120;
    return window.NRICH_SHIPPING_CHARGE || 120;
  }

  // ── Validation ────────────────────────────────────────────────

  function validateField(el) {
    var val = el.value.trim();
    var isRequired = el.hasAttribute('required');
    var errorEl = document.getElementById(el.id + '-error');
    var ok = true;

    if (isRequired && !val) {
      showError(el, errorEl, 'This field is required');
      ok = false;
    } else if (el.id === 'checkout-phone') {
      if (!/^(\+?880|0)1[3-9]\d{8}$/.test(val.replace(/\s/g, ''))) {
        showError(el, errorEl, 'Enter a valid Bangladesh phone number (01XXXXXXXXX)');
        ok = false;
      } else {
        clearError(el, errorEl);
      }
    } else {
      clearError(el, errorEl);
    }
    return ok;
  }

  function showError(el, errorEl, msg) {
    el.classList.add('co-input--error');
    if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
  }

  function clearError(el, errorEl) {
    el.classList.remove('co-input--error');
    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }
  }

  function validateForm() {
    var fields = document.querySelectorAll('#checkout-form .co-input[required], #checkout-form #checkout-phone');
    var valid = true;
    fields.forEach(function (f) { if (!validateField(f)) valid = false; });
    return valid;
  }

  // ── Checkout Page Renderer ────────────────────────────────────

  function renderOrderSummary() {
    var summaryEl = document.getElementById('checkout-summary-items');
    if (!summaryEl) return;

    var cart = window.NRICH && window.NRICH.cart ? window.NRICH.cart.get() : [];
    var cfg = window.NRICH_CONFIG || { currency: '৳' };
    var sym = cfg.currency;

    var subtotalEl = document.getElementById('checkout-subtotal');
    var totalEl    = document.getElementById('checkout-total');

    if (cart.length === 0) {
      summaryEl.innerHTML = '<p class="co-summary-row" style="color:var(--gray-500)">Your cart is empty.</p>';
      if (subtotalEl) { subtotalEl.textContent = sym + '0'; subtotalEl.dataset.raw = '0'; }
      return;
    }

    var sub = window.NRICH.cart.getSubtotal();

    summaryEl.innerHTML = cart.map(function (item) {
      var variantText = [item.color, item.size].filter(Boolean).join(' / ');
      return '<div class="co-item-row">' +
        '<div class="co-item-thumb">' +
          (item.image ? '<img src="' + item.image + '" alt="' + item.name + '" loading="lazy">' : '') +
          '<span class="co-item-qty-badge">' + item.quantity + '</span>' +
        '</div>' +
        '<div class="co-item-details">' +
          '<span class="co-summary-item-name">' + item.name + (variantText ? '<br><small>' + variantText + '</small>' : '') + '</span>' +
        '</div>' +
        '<span class="co-summary-item-price">' + sym + (item.price * item.quantity).toLocaleString() + '</span>' +
      '</div>';
    }).join('');

    // Set subtotal — also set dataset.raw so the inline shipping-zone JS can read it
    if (subtotalEl) {
      subtotalEl.textContent = sym + sub.toLocaleString();
      subtotalEl.dataset.raw = sub;
    }

    // Let the inline MutationObserver in checkout.html handle the total update
    // (it fires automatically when subtotalEl changes)
    // But also set it here as a fallback
    var ship = getShippingCharge();
    if (totalEl) totalEl.textContent = sym + (sub + ship).toLocaleString();
    window.NRICH_SHIPPING_CHARGE = ship;
  }

  // ── Submit Order ──────────────────────────────────────────────

  function submitOrder(e) {
    e.preventDefault();
    if (!validateForm()) {
      var firstError = document.querySelector('#checkout-form .co-input--error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var cart = window.NRICH && window.NRICH.cart ? window.NRICH.cart.get() : [];
    if (cart.length === 0) {
      if (window.showToast) {
        window.showToast('Your cart is empty. Please add products first.');
      } else {
        alert('Your cart is empty. Please add products before checkout.');
      }
      setTimeout(function () { window.location.href = (window.NRICH_BASEURL || '') + '/shop/'; }, 1500);
      return;
    }

    var cfg = window.NRICH_CONFIG || { currency: '৳', orderEndpoint: '' };
    var sub      = window.NRICH.cart.getSubtotal();
    var shipping = getShippingCharge();
    var total    = sub + shipping;

    // Collect selected shipping zone label
    var zoneEl = document.querySelector('input[name="shipping_zone"]:checked');
    var zoneLabel = zoneEl ? (zoneEl.nextElementSibling ? zoneEl.nextElementSibling.textContent.trim() : '') : 'Outside Dhaka';

    var customer = {
      name:    document.getElementById('checkout-name').value.trim(),
      phone:   document.getElementById('checkout-phone').value.trim(),
      address: document.getElementById('checkout-address').value.trim(),
      zone:    zoneLabel,
      note:    document.getElementById('checkout-note') ? document.getElementById('checkout-note').value.trim() : ''
    };

    var orderId = generateOrderId();

    var order = {
      id: orderId,
      customer: customer,
      items: cart,
      subtotal: sub,
      shippingCharge: shipping,
      shippingZone: zoneLabel,
      total: total,
      paymentMethod: 'Cash on Delivery',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Fire tracking events
    if (window.NRICH && window.NRICH.tracking) {
      var trackingItems = window.NRICH.cart.getCartForTracking();
      window.NRICH.tracking.addShippingInfo(trackingItems, total, zoneLabel);
      window.NRICH.tracking.addPaymentInfo(trackingItems, total);
    }

    // Show loading state
    var submitBtn = document.getElementById('place-order-btn');
    if (submitBtn) {
      submitBtn.textContent = 'Processing...';
      submitBtn.disabled = true;
    }

    // Save order locally
    localStorage.setItem('nrich_last_order', JSON.stringify(order));

    var endpoint = cfg.orderEndpoint || '';

    function onSuccess() {
      window.NRICH.cart.clear();
      window.location.href = (window.NRICH_BASEURL || '') + '/order-success/?order_id=' + orderId;
    }

    function onError() {
      if (submitBtn) { submitBtn.textContent = 'Place Order'; submitBtn.disabled = false; }
      // Still proceed — order saved locally
      window.NRICH.cart.clear();
      window.location.href = (window.NRICH_BASEURL || '') + '/order-success/?order_id=' + orderId;
    }

    if (endpoint && endpoint.indexOf('YOUR_FORM_ID') === -1) {
      var formData = new URLSearchParams();
      formData.append('order_id',         order.id);
      formData.append('customer_name',    customer.name);
      formData.append('customer_phone',   customer.phone);
      formData.append('customer_address', customer.address);
      formData.append('customer_zone',    customer.zone);
      formData.append('customer_note',    customer.note);
      formData.append('subtotal',         sub);
      formData.append('shipping_charge',  shipping);
      formData.append('shipping_zone',    zoneLabel);
      formData.append('total',            total);
      formData.append('payment_method',   'Cash on Delivery');
      formData.append('items',            JSON.stringify(cart));
      formData.append('order_json',       JSON.stringify(order));

      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, formData);
        onSuccess();
      } else {
        fetch(endpoint, { method: 'POST', body: formData, mode: 'no-cors' }).then(onSuccess).catch(onError);
      }
    } else {
      setTimeout(onSuccess, 800);
    }
  }

  // ── Init Checkout Page ────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('checkout-form');
    if (!form) return;

    renderOrderSummary();
    form.addEventListener('submit', submitOrder);

    // Real-time validation on blur / input
    form.querySelectorAll('.co-input').forEach(function (f) {
      f.addEventListener('blur', function () { validateField(f); });
      f.addEventListener('input', function () {
        if (f.classList.contains('co-input--error')) validateField(f);
      });
    });

    // begin_checkout tracking — fires once on load, re-fires when zone changes
    var beginCheckoutFired = false;
    function fireBeginCheckout() {
      if (!window.NRICH || !window.NRICH.tracking || !window.NRICH.cart) return;
      var trackingItems = window.NRICH.cart.getCartForTracking();
      var sub      = window.NRICH.cart.getSubtotal();
      var discount = window.NRICH.cart.getDiscount ? window.NRICH.cart.getDiscount() : 0;
      var shipping = getShippingCharge();
      var total    = Math.max(0, sub - discount + shipping);
      window.NRICH.tracking.beginCheckout(trackingItems, total, shipping);
      beginCheckoutFired = true;
    }

    // Fire immediately after render (zone already pre-selected)
    fireBeginCheckout();

    // Re-fire when user changes shipping zone
    document.querySelectorAll('input[name="shipping_zone"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        // Small delay to let total display update before tracking
        setTimeout(fireBeginCheckout, 50);
      });
    });
  });

  // ── Order Success Page ─────────────────────────────────────────

  function renderOrderSuccess() {
    var params = new URLSearchParams(window.location.search);
    var orderId = params.get('order_id');

    if (!orderId) {
      var noOrder = document.getElementById('order-not-found');
      if (noOrder) noOrder.style.display = 'block';
      return;
    }

    var order = null;
    try { order = JSON.parse(localStorage.getItem('nrich_last_order')); } catch (e) {}

    var orderIdEl = document.getElementById('order-id-display');
    if (orderIdEl) orderIdEl.textContent = orderId;

    if (!order || order.id !== orderId) return;

    var cfg = window.NRICH_CONFIG || { currency: '৳' };
    var sym = cfg.currency;

    var customerEl = document.getElementById('order-customer-info');
    if (customerEl) {
      customerEl.innerHTML =
        '<p><strong>Name:</strong> ' + order.customer.name + '</p>' +
        '<p><strong>Phone:</strong> ' + order.customer.phone + '</p>' +
        '<p><strong>Address:</strong> ' + order.customer.address + '</p>' +
        '<p><strong>Shipping Zone:</strong> ' + (order.customer.zone || order.shippingZone || '') + '</p>' +
        (order.customer.note ? '<p><strong>Note:</strong> ' + order.customer.note + '</p>' : '');
    }

    var itemsEl = document.getElementById('order-items-list');
    if (itemsEl) {
      itemsEl.innerHTML = (order.items || []).map(function (item) {
        var variantText = [item.color, item.size].filter(Boolean).join(' / ');
        return '<div class="os-item-row">' +
          '<div class="os-item-img"><img src="' + item.image + '" alt="' + item.name + '" loading="lazy"></div>' +
          '<div class="os-item-info">' +
            '<div class="os-item-name">' + item.name + '</div>' +
            (variantText ? '<div class="os-item-meta">' + variantText + '</div>' : '') +
            '<div class="os-item-meta">Qty: ' + item.quantity + '</div>' +
          '</div>' +
          '<div class="os-item-price">' + sym + (item.price * item.quantity).toLocaleString() + '</div>' +
        '</div>';
      }).join('');
    }

    var subtotalEl = document.getElementById('order-subtotal');
    var shippingEl = document.getElementById('order-delivery');
    var totalEl    = document.getElementById('order-total');
    if (subtotalEl) subtotalEl.textContent = sym + (order.subtotal || 0).toLocaleString();
    if (shippingEl) shippingEl.textContent = sym + (order.shippingCharge || order.deliveryCharge || 0).toLocaleString();
    if (totalEl)    totalEl.textContent    = sym + (order.total || 0).toLocaleString();

    if (window.NRICH && window.NRICH.tracking) {
      window.NRICH.tracking.purchase(order);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('order-success-page')) {
      renderOrderSuccess();
    }
  });

  window.NRICH = window.NRICH || {};
  window.NRICH.checkout = { renderOrderSuccess: renderOrderSuccess };

})();
