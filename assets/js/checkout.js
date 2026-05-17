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
        showError(el, errorEl, 'Enter a valid Bangladesh phone number');
        ok = false;
      }
    } else if (el.id === 'checkout-email' && val) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        showError(el, errorEl, 'Enter a valid email address');
        ok = false;
      }
    } else {
      clearError(el, errorEl);
    }
    return ok;
  }

  function showError(el, errorEl, msg) {
    el.classList.add('error');
    if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
  }

  function clearError(el, errorEl) {
    el.classList.remove('error');
    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }
  }

  function validateForm() {
    var fields = document.querySelectorAll('#checkout-form [required], #checkout-phone, #checkout-email');
    var valid = true;
    fields.forEach(function (f) { if (!validateField(f)) valid = false; });
    return valid;
  }

  // ── Checkout Page Renderer ────────────────────────────────────

  function renderOrderSummary() {
    var summaryEl = document.getElementById('checkout-summary-items');
    if (!summaryEl) return;

    var cart = window.NRICH && window.NRICH.cart ? window.NRICH.cart.get() : [];
    var cfg = window.NRICH_CONFIG || { currency: '৳', deliveryCharge: 80, freeDeliveryAbove: 2000 };
    var sym = cfg.currency;

    if (cart.length === 0) {
      summaryEl.innerHTML = '<p style="color:var(--gray-500)">Your cart is empty.</p>';
      return;
    }

    var sub = window.NRICH.cart.getSubtotal();
    var delivery = window.NRICH.cart.getDeliveryCharge();
    var total = sub + delivery;

    summaryEl.innerHTML = cart.map(function (item) {
      var variantText = [item.color, item.size].filter(Boolean).join(' / ');
      return '<div class="checkout-summary-item">' +
        '<div class="checkout-item-img"><img src="' + item.image + '" alt="' + item.name + '" loading="lazy"></div>' +
        '<div class="checkout-item-details">' +
          '<div class="checkout-item-name">' + item.name + (variantText ? ' <span class="checkout-item-variant">(' + variantText + ')</span>' : '') + '</div>' +
          '<div class="checkout-item-qty">Qty: ' + item.quantity + '</div>' +
        '</div>' +
        '<div class="checkout-item-price">' + sym + (item.price * item.quantity).toLocaleString() + '</div>' +
      '</div>';
    }).join('');

    var subtotalEl = document.getElementById('checkout-subtotal');
    var deliveryEl = document.getElementById('checkout-delivery');
    var totalEl = document.getElementById('checkout-total');
    if (subtotalEl) subtotalEl.textContent = sym + sub.toLocaleString();
    if (deliveryEl) deliveryEl.textContent = delivery === 0 ? 'FREE' : sym + delivery;
    if (totalEl) totalEl.textContent = sym + total.toLocaleString();

    // Update totals display
    var totalDisplayEls = document.querySelectorAll('[data-checkout-total]');
    totalDisplayEls.forEach(function (el) { el.textContent = sym + total.toLocaleString(); });
  }

  // ── Submit Order ──────────────────────────────────────────────

  function submitOrder(e) {
    e.preventDefault();
    if (!validateForm()) {
      var firstError = document.querySelector('.form-control.error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var cart = window.NRICH && window.NRICH.cart ? window.NRICH.cart.get() : [];
    if (cart.length === 0) {
      alert('Your cart is empty. Please add products before checkout.');
      return;
    }

    var cfg = window.NRICH_CONFIG || { currency: '৳', deliveryCharge: 80, freeDeliveryAbove: 2000, orderEndpoint: '' };
    var sub = window.NRICH.cart.getSubtotal();
    var delivery = window.NRICH.cart.getDeliveryCharge();
    var total = sub + delivery;

    var customer = {
      name: document.getElementById('checkout-name').value.trim(),
      phone: document.getElementById('checkout-phone').value.trim(),
      email: (document.getElementById('checkout-email') || {}).value ? document.getElementById('checkout-email').value.trim() : '',
      address: document.getElementById('checkout-address').value.trim(),
      city: document.getElementById('checkout-city').value.trim(),
      area: (document.getElementById('checkout-area') || {}).value ? document.getElementById('checkout-area').value.trim() : '',
      note: (document.getElementById('checkout-note') || {}).value ? document.getElementById('checkout-note').value.trim() : ''
    };

    var orderId = generateOrderId();

    var order = {
      id: orderId,
      customer: customer,
      items: cart,
      subtotal: sub,
      deliveryCharge: delivery,
      total: total,
      coupon: '',
      discount: 0,
      paymentMethod: 'Cash on Delivery',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Fire tracking events
    if (window.NRICH && window.NRICH.tracking) {
      var trackingItems = window.NRICH.cart.getCartForTracking();
      window.NRICH.tracking.addShippingInfo(trackingItems, total, 'Standard Delivery');
      window.NRICH.tracking.addPaymentInfo(trackingItems, total);
    }

    // Show loading
    var submitBtn = document.getElementById('place-order-btn');
    if (submitBtn) { submitBtn.classList.add('loading'); submitBtn.disabled = true; }

    // Save order locally first
    localStorage.setItem('nrich_last_order', JSON.stringify(order));

    // POST to webhook endpoint
    var endpoint = cfg.orderEndpoint || '';

    function onSuccess() {
      window.NRICH.cart.clear();
      window.location.href = '/order-success/?order_id=' + orderId;
    }

    function onError() {
      if (submitBtn) { submitBtn.classList.remove('loading'); submitBtn.disabled = false; }
      // Still redirect - order was saved locally
      window.NRICH.cart.clear();
      window.location.href = '/order-success/?order_id=' + orderId;
    }

    if (endpoint && endpoint.indexOf('YOUR_FORM_ID') === -1) {
      // Send order to webhook
      var formData = new FormData();
      formData.append('order_id', order.id);
      formData.append('customer_name', customer.name);
      formData.append('customer_phone', customer.phone);
      formData.append('customer_email', customer.email);
      formData.append('customer_address', customer.address);
      formData.append('customer_city', customer.city);
      formData.append('customer_area', customer.area);
      formData.append('customer_note', customer.note);
      formData.append('subtotal', sub);
      formData.append('delivery_charge', delivery);
      formData.append('total', total);
      formData.append('payment_method', 'Cash on Delivery');
      formData.append('items', JSON.stringify(cart));
      formData.append('order_json', JSON.stringify(order));

      fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      }).then(function (res) {
        if (res.ok || res.status === 200 || res.status === 302) onSuccess();
        else onError();
      }).catch(onError);
    } else {
      // No real endpoint configured — still proceed
      setTimeout(onSuccess, 800);
    }
  }

  // ── Init ──────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('checkout-form');
    if (form) {
      renderOrderSummary();
      form.addEventListener('submit', submitOrder);

      // Real-time validation
      form.querySelectorAll('.form-control').forEach(function (f) {
        f.addEventListener('blur', function () { validateField(f); });
        f.addEventListener('input', function () {
          if (f.classList.contains('error')) validateField(f);
        });
      });

      // Fire begin_checkout tracking
      if (window.NRICH && window.NRICH.tracking && window.NRICH.cart) {
        var trackingItems = window.NRICH.cart.getCartForTracking();
        var total = window.NRICH.cart.getTotal();
        window.NRICH.tracking.beginCheckout(trackingItems, total);
      }
    }
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

    if (!order || order.id !== orderId) {
      // Order data not found — just show the ID
      return;
    }

    var cfg = window.NRICH_CONFIG || { currency: '৳' };
    var sym = cfg.currency;

    // Customer info
    var customerEl = document.getElementById('order-customer-info');
    if (customerEl) {
      customerEl.innerHTML =
        '<p><strong>Name:</strong> ' + order.customer.name + '</p>' +
        '<p><strong>Phone:</strong> ' + order.customer.phone + '</p>' +
        (order.customer.email ? '<p><strong>Email:</strong> ' + order.customer.email + '</p>' : '') +
        '<p><strong>Address:</strong> ' + order.customer.address + (order.customer.area ? ', ' + order.customer.area : '') + ', ' + order.customer.city + '</p>' +
        (order.customer.note ? '<p><strong>Note:</strong> ' + order.customer.note + '</p>' : '');
    }

    // Items
    var itemsEl = document.getElementById('order-items-list');
    if (itemsEl) {
      itemsEl.innerHTML = (order.items || []).map(function (item) {
        var variantText = [item.color, item.size].filter(Boolean).join(' / ');
        return '<div class="order-item">' +
          '<div class="order-item-img"><img src="' + item.image + '" alt="' + item.name + '" loading="lazy"></div>' +
          '<div class="order-item-info">' +
            '<div class="order-item-name">' + item.name + '</div>' +
            (variantText ? '<div class="order-item-variant">' + variantText + '</div>' : '') +
            '<div class="order-item-qty">Qty: ' + item.quantity + '</div>' +
          '</div>' +
          '<div class="order-item-price">' + sym + (item.price * item.quantity).toLocaleString() + '</div>' +
        '</div>';
      }).join('');
    }

    // Totals
    ['subtotal', 'delivery', 'total'].forEach(function (key) {
      var el = document.getElementById('order-' + key);
      if (el) {
        var val = order[key === 'delivery' ? 'deliveryCharge' : key];
        el.textContent = val === 0 && key === 'delivery' ? 'FREE' : sym + (val || 0).toLocaleString();
      }
    });

    // Fire purchase event (once)
    if (window.NRICH && window.NRICH.tracking) {
      window.NRICH.tracking.purchase(order);
    }
  }

  // Auto-run on order success page
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('order-success-page')) {
      renderOrderSuccess();
    }
  });

  window.NRICH = window.NRICH || {};
  window.NRICH.checkout = { renderOrderSuccess: renderOrderSuccess };

})();
