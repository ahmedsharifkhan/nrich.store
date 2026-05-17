// NRICH — Full Ecommerce Tracking
// GTM / GA4 / Meta Pixel dataLayer
// 15 events with deduplication

(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  var BRAND = 'NRICH';
  var CURRENCY = 'BDT';

  function uid() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function pageType() {
    return (document.body && document.body.getAttribute('data-page-type')) || 'other';
  }

  function makeItem(product, variant, qty) {
    var price = parseFloat(product.price) || 0;
    var salePrice = parseFloat(product.sale_price) || 0;
    var finalPrice = salePrice > 0 ? salePrice : price;
    var discount = salePrice > 0 ? Math.round((price - salePrice) * 100) / 100 : 0;
    return {
      item_id: product.id || product.slug || '',
      item_name: product.name || product.title || '',
      item_brand: BRAND,
      item_category: product.category || product.category_slug || '',
      item_variant: variant || '',
      price: finalPrice,
      quantity: parseInt(qty, 10) || 1,
      discount: discount
    };
  }

  function pushDataLayer(eventName, payload) {
    window.dataLayer.push({
      event: eventName,
      event_id: payload.event_id || eventName + '_' + uid(),
      timestamp: new Date().toISOString(),
      page_type: payload.page_type || pageType(),
      ecommerce: payload.ecommerce || {},
      user_data: payload.user_data || {}
    });
  }

  window.NRICH = window.NRICH || {};
  window.NRICH.tracking = {
    pushDataLayer: pushDataLayer,
    makeItem: makeItem,

    pageView: function (pgType) {
      pushDataLayer('page_view', {
        page_type: pgType || pageType(),
        ecommerce: { currency: CURRENCY }
      });
    },

    viewItemList: function (products, listName) {
      if (!products || !products.length) return;
      pushDataLayer('view_item_list', {
        page_type: 'listing',
        ecommerce: {
          currency: CURRENCY,
          item_list_name: listName || 'Product List',
          items: products.slice(0, 30).map(function (p, i) {
            var item = makeItem(p, '', 1);
            item.index = i;
            return item;
          })
        }
      });
    },

    selectItem: function (product, variant, listName) {
      pushDataLayer('select_item', {
        page_type: 'listing',
        ecommerce: {
          currency: CURRENCY,
          item_list_name: listName || '',
          items: [makeItem(product, variant, 1)]
        }
      });
    },

    viewItem: function (product, variant) {
      var price = parseFloat(product.sale_price) > 0 ? parseFloat(product.sale_price) : parseFloat(product.price);
      pushDataLayer('view_item', {
        page_type: 'product',
        ecommerce: {
          currency: CURRENCY,
          value: price,
          items: [makeItem(product, variant, 1)]
        }
      });
    },

    addToCart: function (product, variant, qty) {
      var price = parseFloat(product.sale_price) > 0 ? parseFloat(product.sale_price) : parseFloat(product.price);
      var total = price * (parseInt(qty, 10) || 1);
      pushDataLayer('add_to_cart', {
        event_id: 'add_to_cart_' + (product.id || product.slug) + '_' + uid(),
        page_type: pageType(),
        ecommerce: {
          currency: CURRENCY,
          value: total,
          items: [makeItem(product, variant, qty)]
        }
      });
    },

    removeFromCart: function (product, variant, qty) {
      var price = parseFloat(product.sale_price) > 0 ? parseFloat(product.sale_price) : parseFloat(product.price);
      pushDataLayer('remove_from_cart', {
        page_type: 'cart',
        ecommerce: {
          currency: CURRENCY,
          value: price * (parseInt(qty, 10) || 1),
          items: [makeItem(product, variant, qty)]
        }
      });
    },

    viewCart: function (cartItems, total) {
      pushDataLayer('view_cart', {
        page_type: 'cart',
        ecommerce: {
          currency: CURRENCY,
          value: total,
          items: cartItems
        }
      });
    },

    beginCheckout: function (cartItems, total) {
      pushDataLayer('begin_checkout', {
        page_type: 'checkout',
        ecommerce: {
          currency: CURRENCY,
          value: total,
          items: cartItems
        }
      });
    },

    addShippingInfo: function (cartItems, total, shippingMethod) {
      pushDataLayer('add_shipping_info', {
        page_type: 'checkout',
        ecommerce: {
          currency: CURRENCY,
          value: total,
          shipping_tier: shippingMethod || 'Standard Delivery',
          items: cartItems
        }
      });
    },

    addPaymentInfo: function (cartItems, total) {
      pushDataLayer('add_payment_info', {
        page_type: 'checkout',
        ecommerce: {
          currency: CURRENCY,
          value: total,
          payment_type: 'Cash on Delivery',
          items: cartItems
        }
      });
    },

    purchase: function (order) {
      var key = 'fired_purchase_' + order.id;
      if (localStorage.getItem(key)) return;
      pushDataLayer('purchase', {
        event_id: 'purchase_' + order.id,
        page_type: 'order_success',
        ecommerce: {
          transaction_id: order.id,
          currency: CURRENCY,
          value: order.total,
          tax: 0,
          shipping: order.deliveryCharge || 0,
          coupon: order.coupon || '',
          payment_type: 'Cash on Delivery',
          items: (order.items || []).map(function (item) {
            return makeItem(item, item.variant || '', item.quantity);
          })
        },
        user_data: {
          phone: order.customer ? order.customer.phone : '',
          email: order.customer ? (order.customer.email || '') : '',
          city: order.customer ? order.customer.city : '',
          address: order.customer ? order.customer.address : ''
        }
      });
      localStorage.setItem(key, 'true');
    },

    search: function (term, resultCount) {
      pushDataLayer('search', {
        event_id: 'search_' + uid(),
        page_type: 'search',
        ecommerce: {
          currency: CURRENCY,
          search_term: term,
          result_count: resultCount || 0
        }
      });
    },

    addToWishlist: function (product, variant) {
      var price = parseFloat(product.sale_price) > 0 ? parseFloat(product.sale_price) : parseFloat(product.price);
      pushDataLayer('add_to_wishlist', {
        event_id: 'wishlist_add_' + (product.id || product.slug) + '_' + uid(),
        page_type: pageType(),
        ecommerce: {
          currency: CURRENCY,
          value: price,
          items: [makeItem(product, variant, 1)]
        }
      });
    },

    removeFromWishlist: function (product) {
      pushDataLayer('remove_from_wishlist', {
        page_type: 'wishlist',
        ecommerce: {
          currency: CURRENCY,
          items: [makeItem(product, '', 1)]
        }
      });
    },

    contactSubmit: function (userData) {
      pushDataLayer('generate_lead', {
        event_id: 'lead_' + uid(),
        page_type: 'contact',
        ecommerce: { currency: CURRENCY },
        user_data: userData || {}
      });
    }
  };

})();
