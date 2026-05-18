// NRICH — GA4 Ecommerce Data Layer (GTM)
// Full GA4 ecommerce schema: https://developers.google.com/analytics/devguides/collection/ga4/set-up-ecommerce

(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  var BRAND    = 'NRICH';
  var CURRENCY = 'BDT';

  function uid() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function pageType() {
    return (document.body && document.body.getAttribute('data-page-type')) || 'other';
  }

  // ── GA4 item object ────────────────────────────────────────────
  // Fully compliant with GA4 ecommerce schema
  function makeItem(product, variant, qty, listId, listName, index) {
    var price      = parseFloat(product.price) || 0;
    var salePrice  = parseFloat(product.sale_price) || 0;
    var finalPrice = salePrice > 0 ? salePrice : price;
    var discount   = salePrice > 0 ? Math.round((price - salePrice) * 100) / 100 : 0;

    var item = {
      item_id:       product.sku || product.id || product.slug || '',
      item_name:     product.name || product.title || '',
      item_brand:    BRAND,
      item_category: product.category || product.category_slug || '',
      item_variant:  variant || '',
      price:         finalPrice,
      quantity:      parseInt(qty, 10) || 1,
      discount:      discount,
      currency:      CURRENCY
    };

    // List attribution — required for select_item / view_item_list linkage
    if (listId)   item.item_list_id   = listId;
    if (listName) item.item_list_name = listName;
    if (typeof index !== 'undefined' && index !== null) item.index = index;

    return item;
  }

  // ── Facebook Pixel helpers ─────────────────────────────────────
  function makeFbContents(items) {
    return (items || []).map(function (item) {
      var price = parseFloat(item.sale_price) > 0
        ? parseFloat(item.sale_price)
        : parseFloat(item.price);
      return {
        id:         item.sku || item.id || item.slug || '',
        quantity:   parseInt(item.quantity, 10) || 1,
        item_price: price || 0
      };
    });
  }

  function makeFbContentIds(items) {
    return (items || []).map(function (item) {
      return item.sku || item.id || item.slug || '';
    });
  }

  // ── Core dataLayer push ────────────────────────────────────────
  function push(eventName, ga4, fb, userData) {
    var obj = {
      event:      eventName,
      event_id:   ga4.event_id || (eventName + '_' + uid()),
      timestamp:  new Date().toISOString(),
      page_type:  ga4.page_type || pageType(),
      ecommerce:  ga4.ecommerce || {},
      user_data:  userData || {}
    };

    if (fb) {
      obj.fb_event_name   = fb.event_name;
      obj.fb_content_ids  = fb.content_ids  || [];
      obj.fb_contents     = fb.contents     || [];
      obj.fb_content_type = fb.content_type || 'product';
      obj.fb_value        = fb.value        || 0;
      obj.fb_currency     = CURRENCY;
      obj.fb_num_items    = fb.num_items    || 1;
      if (fb.search_string) obj.fb_search_string = fb.search_string;
    }

    // Clear previous ecommerce object (GA4 best practice)
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push(obj);

    // Also fire directly via gtag() so GA4 receives events without GTM tag configuration
    if (typeof gtag === 'function' && ga4.ecommerce) {
      var params = Object.assign({}, ga4.ecommerce);
      if (ga4.event_id) params.event_id = ga4.event_id;
      gtag('event', eventName, params);
    }
  }

  // ── Public API ─────────────────────────────────────────────────
  window.NRICH = window.NRICH || {};
  window.NRICH.tracking = {

    push:     push,
    makeItem: makeItem,

    // ─ page_view ─────────────────────────────────────────────────
    pageView: function (pgType) {
      push('page_view',
        { page_type: pgType || pageType(), ecommerce: { currency: CURRENCY } },
        { event_name: 'PageView', content_type: 'website' }
      );
    },

    // ─ view_item_list ─────────────────────────────────────────────
    // Fires on home / shop / category pages
    viewItemList: function (products, listName, listId) {
      if (!products || !products.length) return;
      var lid  = listId  || 'product_list';
      var lname = listName || 'Product List';
      push('view_item_list',
        {
          page_type: 'listing',
          ecommerce: {
            currency:       CURRENCY,
            item_list_id:   lid,
            item_list_name: lname,
            items: products.slice(0, 30).map(function (p, i) {
              return makeItem(p, '', 1, lid, lname, i);
            })
          }
        },
        {
          event_name:   'ViewContent',
          content_ids:  makeFbContentIds(products.slice(0, 30)),
          contents:     makeFbContents(products.slice(0, 30)),
          content_type: 'product',
          value:        products[0]
            ? (parseFloat(products[0].sale_price) || parseFloat(products[0].price) || 0)
            : 0
        }
      );
    },

    // ─ select_item ────────────────────────────────────────────────
    // Fires when user clicks a product card or opens quick view
    selectItem: function (product, variant, listName, index, listId) {
      var lid   = listId  || 'product_list';
      var lname = listName || 'Product List';
      push('select_item',
        {
          page_type: pageType(),
          ecommerce: {
            currency:       CURRENCY,
            item_list_id:   lid,
            item_list_name: lname,
            items: [makeItem(product, variant || '', 1, lid, lname, index || 0)]
          }
        },
        null
      );
    },

    // ─ view_item ─────────────────────────────────────────────────
    // Fires on product detail page
    viewItem: function (product, variant) {
      var price = parseFloat(product.sale_price) > 0
        ? parseFloat(product.sale_price)
        : parseFloat(product.price);
      push('view_item',
        {
          page_type: 'product',
          ecommerce: {
            currency: CURRENCY,
            value:    price,
            items:    [makeItem(product, variant || '', 1)]
          }
        },
        {
          event_name:   'ViewContent',
          content_ids:  [product.sku || product.slug || ''],
          contents:     [{ id: product.sku || product.slug || '', quantity: 1, item_price: price }],
          content_type: 'product',
          value:        price,
          content_name: product.name || product.title || ''
        }
      );
    },

    // ─ add_to_cart ───────────────────────────────────────────────
    addToCart: function (product, variant, qty) {
      var price = parseFloat(product.sale_price) > 0
        ? parseFloat(product.sale_price)
        : parseFloat(product.price);
      var total = price * (parseInt(qty, 10) || 1);
      push('add_to_cart',
        {
          event_id:  'atc_' + (product.sku || product.slug) + '_' + uid(),
          page_type: pageType(),
          ecommerce: {
            currency: CURRENCY,
            value:    total,
            items:    [makeItem(product, variant || '', qty)]
          }
        },
        {
          event_name:   'AddToCart',
          content_ids:  [product.sku || product.slug || ''],
          contents:     [{ id: product.sku || product.slug || '', quantity: parseInt(qty,10)||1, item_price: price }],
          content_type: 'product',
          value:        total,
          num_items:    parseInt(qty, 10) || 1
        }
      );
    },

    // ─ remove_from_cart ──────────────────────────────────────────
    removeFromCart: function (product, variant, qty) {
      var price = parseFloat(product.sale_price) > 0
        ? parseFloat(product.sale_price)
        : parseFloat(product.price);
      push('remove_from_cart',
        {
          page_type: 'cart',
          ecommerce: {
            currency: CURRENCY,
            value:    price * (parseInt(qty, 10) || 1),
            items:    [makeItem(product, variant || '', qty)]
          }
        },
        null
      );
    },

    // ─ view_cart ─────────────────────────────────────────────────
    viewCart: function (cartItems, total) {
      push('view_cart',
        {
          page_type: 'cart',
          ecommerce: { currency: CURRENCY, value: total, items: cartItems }
        },
        null
      );
    },

    // ─ begin_checkout ─────────────────────────────────────────────
    beginCheckout: function (cartItems, total) {
      push('begin_checkout',
        {
          page_type: 'checkout',
          ecommerce: {
            currency: CURRENCY,
            value:    total,
            coupon:   '',
            items:    cartItems
          }
        },
        {
          event_name:   'InitiateCheckout',
          content_ids:  (cartItems || []).map(function (i) { return i.item_id || ''; }),
          contents:     (cartItems || []).map(function (i) {
            return { id: i.item_id || '', quantity: i.quantity || 1, item_price: i.price || 0 };
          }),
          content_type: 'product',
          value:        total,
          num_items:    (cartItems || []).reduce(function (s, i) { return s + (i.quantity || 1); }, 0)
        }
      );
    },

    // ─ add_shipping_info ─────────────────────────────────────────
    addShippingInfo: function (cartItems, total, shippingMethod) {
      push('add_shipping_info',
        {
          page_type: 'checkout',
          ecommerce: {
            currency:      CURRENCY,
            value:         total,
            shipping_tier: shippingMethod || 'Standard Delivery',
            items:         cartItems
          }
        },
        null
      );
    },

    // ─ add_payment_info ──────────────────────────────────────────
    addPaymentInfo: function (cartItems, total) {
      push('add_payment_info',
        {
          page_type: 'checkout',
          ecommerce: {
            currency:     CURRENCY,
            value:        total,
            payment_type: 'Cash on Delivery',
            items:        cartItems
          }
        },
        {
          event_name:   'AddPaymentInfo',
          content_ids:  (cartItems || []).map(function (i) { return i.item_id || ''; }),
          content_type: 'product',
          value:        total
        }
      );
    },

    // ─ purchase ──────────────────────────────────────────────────
    // Deduplication via localStorage (prevents double-counting on refresh)
    purchase: function (order) {
      var key = 'fired_purchase_' + order.id;
      if (localStorage.getItem(key)) return;

      var items      = order.items || [];
      var ga4Items   = items.map(function (item) {
        return makeItem(item, item.variant || '', item.quantity);
      });
      var fbContents = items.map(function (i) {
        var p = parseFloat(i.sale_price) > 0 ? parseFloat(i.sale_price) : parseFloat(i.price);
        return { id: i.sku || i.id || i.slug || '', quantity: i.quantity || 1, item_price: p };
      });

      push('purchase',
        {
          event_id:  'purchase_' + order.id,
          page_type: 'order_success',
          ecommerce: {
            transaction_id: order.id,
            currency:       CURRENCY,
            value:          order.total,
            tax:            0,
            shipping:       order.shippingCharge || order.deliveryCharge || 0,
            coupon:         order.coupon || '',
            payment_type:   'Cash on Delivery',
            items:          ga4Items
          }
        },
        {
          event_name:   'Purchase',
          content_ids:  items.map(function (i) { return i.sku || i.id || i.slug || ''; }),
          contents:     fbContents,
          content_type: 'product',
          value:        order.total,
          num_items:    items.reduce(function (s, i) { return s + (i.quantity || 1); }, 0)
        },
        {
          phone:   order.customer ? order.customer.phone   : '',
          email:   order.customer ? (order.customer.email || '') : '',
          city:    order.customer ? (order.customer.city  || '') : '',
          address: order.customer ? order.customer.address : ''
        }
      );

      localStorage.setItem(key, 'true');
    },

    // ─ search ────────────────────────────────────────────────────
    search: function (term, resultCount) {
      push('search',
        {
          event_id:  'search_' + uid(),
          page_type: 'search',
          ecommerce: { currency: CURRENCY, search_term: term, result_count: resultCount || 0 }
        },
        {
          event_name:    'Search',
          search_string: term,
          content_type:  'product'
        }
      );
    },

    // ─ add_to_wishlist ───────────────────────────────────────────
    addToWishlist: function (product, variant) {
      var price = parseFloat(product.sale_price) > 0
        ? parseFloat(product.sale_price)
        : parseFloat(product.price);
      push('add_to_wishlist',
        {
          event_id:  'wl_' + (product.sku || product.slug) + '_' + uid(),
          page_type: pageType(),
          ecommerce: { currency: CURRENCY, value: price, items: [makeItem(product, variant || '', 1)] }
        },
        {
          event_name:   'AddToWishlist',
          content_ids:  [product.sku || product.slug || ''],
          contents:     [{ id: product.sku || product.slug || '', quantity: 1, item_price: price }],
          content_type: 'product',
          value:        price
        }
      );
    },

    // ─ remove_from_wishlist ──────────────────────────────────────
    removeFromWishlist: function (product) {
      push('remove_from_wishlist',
        { page_type: 'wishlist', ecommerce: { currency: CURRENCY, items: [makeItem(product, '', 1)] } },
        null
      );
    },

    // ─ generate_lead ─────────────────────────────────────────────
    contactSubmit: function (userData) {
      push('generate_lead',
        { event_id: 'lead_' + uid(), page_type: 'contact', ecommerce: { currency: CURRENCY } },
        { event_name: 'Lead', content_type: 'website' },
        userData || {}
      );
    }
  };

})();
