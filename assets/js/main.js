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
    /* close button injected inside right panel by openQuickView */
    modal.addEventListener('click', function(e) {
      if (e.target.closest('#qv-close-inner')) closeQuickView();
    });

    if (overlay) {
      overlay.addEventListener('click', function () {
        if (overlay.getAttribute('data-for') === 'quickview') closeQuickView();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeQuickView();
    });

    // Product card click → select_item
    document.addEventListener('click', function (e) {
      var link = e.target.closest('.product-card a');
      if (!link) return;
      var card = link.closest('.product-card');
      if (!card) return;
      try {
        var data = JSON.parse(card.getAttribute('data-product-json') || card.getAttribute('data-product') || '{}');
        if (data && (data.id || data.slug) && window.NRICH && window.NRICH.tracking) {
          var allCards  = Array.from(document.querySelectorAll('.product-card'));
          var idx       = allCards.indexOf(card);
          var listEl    = card.closest('[data-list-id]');
          var listId    = listEl ? listEl.getAttribute('data-list-id')   : 'product_list';
          var listName  = listEl ? listEl.getAttribute('data-list-name') : 'Product List';
          window.NRICH.tracking.selectItem(data, '', listName, idx, listId);
        }
      } catch (err) {}
    });

    // Quick view trigger buttons → select_item
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-quick-view]');
      if (!btn) return;
      e.preventDefault();
      var productId = btn.getAttribute('data-quick-view');
      var products  = window.NRICH_PRODUCTS || [];
      var product   = products.find(function (p) { return p.slug === productId || p.id === productId; });
      if (!product) return;
      openQuickView(product);
      if (window.NRICH && window.NRICH.tracking) {
        window.NRICH.tracking.selectItem(product, '', 'Quick View', 0, 'quick_view');
      }
    });
  }

  function openQuickView(product) {
    var modal = document.getElementById('quick-view-modal');
    var overlay = document.getElementById('overlay');
    if (!modal) return;

    var cfg     = window.NRICH_CONFIG || { currency: '৳' };
    var sym     = cfg.currency;
    var price   = parseFloat(product.sale_price) > 0 ? parseFloat(product.sale_price) : parseFloat(product.price);
    var orig    = parseFloat(product.sale_price) > 0 ? parseFloat(product.price) : 0;
    var slug    = product.slug || product.id;
    var base    = window.NRICH_BASEURL || '';
    var savePct = orig > 0 ? Math.round((1 - price / orig) * 100) : 0;
    var name    = product.name || product.title || '';
    var cat     = product.category || 'Sunglasses';
    var desc    = product.description_short || product.description || '';
    var tags    = product.tags ? (Array.isArray(product.tags) ? product.tags : [product.tags]) : [];
    var pageUrl = encodeURIComponent(base + '/products/' + slug + '/');
    var pageTxt = encodeURIComponent(name);
    var waPhone = (window.NRICH_CONFIG && window.NRICH_CONFIG.whatsapp) || '';
    var waMsg   = encodeURIComponent('Hi, I want to order: ' + name + ' (' + base + '/products/' + slug + '/)');

    /* images */
    var imgs = [];
    if (product.images && product.images.length) {
      product.images.forEach(function(src) { imgs.push(src.replace(/ /g, '%20')); });
    } else if (product.image) {
      imgs.push(product.image.replace(/ /g, '%20'));
    }
    if (!imgs.length) imgs.push('');
    var mainImg = imgs[0];

    /* thumbnail strip */
    var thumbsHtml = imgs.map(function(src, i) {
      return '<img class="qv-thumb-v' + (i === 0 ? ' active' : '') + '" src="' + src + '" alt="' + name + '"' +
        ' onclick="var m=document.getElementById(\'qv-main-img\');if(m)m.src=this.src;' +
        'var col=this.closest(\'.qv-thumb-col\');if(col){col.querySelectorAll(\'.qv-thumb-v\').forEach(function(t){t.classList.remove(\'active\');});this.classList.add(\'active\');}">';
    }).join('');

    /* rating */
    var rating    = parseFloat(product.rating) || 4.7;
    var reviews   = parseInt(product.review_count || product.reviews_count) || 5;
    var fullStars = Math.round(rating);
    var starsHtml = '';
    for (var s = 0; s < 5; s++) starsHtml += s < fullStars ? '★' : '☆';

    /* color swatches */
    var colorsHtml = '';
    if (product.colors && product.colors.length) {
      colorsHtml =
        '<div class="qv-var-group">' +
          '<div class="qv-var-label">Color: <span class="qv-var-selected" id="qv-color-name">' + product.colors[0].name + '</span></div>' +
          '<div class="qv-swatches">' +
            product.colors.map(function(c, i) {
              return '<button class="qv-swatch' + (i === 0 ? ' active' : '') + '" type="button"' +
                ' style="background:' + (c.hex || c.value || '#999') + '"' +
                ' title="' + c.name + '"' +
                ' data-color="' + c.name + '">' +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    /* size pills */
    var sizesHtml = '';
    if (product.sizes && product.sizes.length) {
      sizesHtml =
        '<div class="qv-var-group">' +
          '<div class="qv-var-label">Size: <span class="qv-var-selected" id="qv-size-name">' + product.sizes[0] + '</span></div>' +
          '<div class="qv-size-pills">' +
            product.sizes.map(function(sz, i) {
              return '<button class="qv-size-pill' + (i === 0 ? ' active' : '') + '" type="button" data-size="' + sz + '">' + sz + '</button>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    var content = modal.querySelector('.quick-view-content');
    if (!content) { modal.classList.add('open'); document.body.classList.add('modal-open'); return; }

    content.innerHTML =
      /* ── LEFT: thumbnail col + main image ── */
      '<div class="qv-left">' +
        (imgs.length > 1 ? '<div class="qv-thumb-col">' + thumbsHtml + '</div>' : '') +
        '<div class="qv-img-main"><img src="' + mainImg + '" alt="' + name + '" id="qv-main-img"></div>' +
      '</div>' +

      /* ── RIGHT: info panel ── */
      '<div class="qv-right">' +
        '<div class="qv-right-inner">' +

          /* top bar: sale pill + close button */
          '<div class="qv-top-bar">' +
            (savePct > 0 ? '<span class="qv-sale-pill">SALE ' + savePct + '% OFF</span>' : '<span></span>') +
            '<button class="qv-close-btn" id="qv-close-inner" type="button" aria-label="Close">&times;</button>' +
          '</div>' +

          /* name */
          '<h2 class="qv-name">' + name + '</h2>' +

          /* rating */
          '<div class="qv-rating">' +
            '<span class="qv-stars">' + starsHtml + '</span>' +
            '<span class="qv-rating-val">' + rating.toFixed(1) + ' Rating</span>' +
            '<span class="qv-rating-count">(' + reviews + ' customer reviews)</span>' +
          '</div>' +

          /* description */
          (desc ? '<p class="qv-desc">' + desc + '</p>' : '') +

          /* color + size variations */
          (colorsHtml || sizesHtml ?
            '<div class="qv-variations">' + colorsHtml + sizesHtml + '</div>'
          : '') +

          /* price + quantity grid */
          '<div class="qv-price-qty-grid">' +
            '<div>' +
              '<div class="qv-label">Price</div>' +
              '<div class="qv-price-row">' +
                '<span class="qv-sale-price">' + sym + price.toLocaleString() + '</span>' +
                (orig > 0 ? '<span class="qv-orig">' + sym + orig.toLocaleString() + '</span>' : '') +
              '</div>' +
            '</div>' +
            '<div>' +
              '<div class="qv-label">Quantity</div>' +
              '<div class="qv-qty-row">' +
                '<button class="qv-qty-btn" id="qv-qty-minus" type="button">&#8722;</button>' +
                '<span class="qv-qty-val" id="qv-qty-val">1</span>' +
                '<button class="qv-qty-btn" id="qv-qty-plus" type="button">&#43;</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          /* ADD TO CART + Wishlist side by side */
          '<div class="qv-actions">' +
            '<button class="qv-atc-btn" id="qv-atc" type="button">ADD TO CART</button>' +
            '<a href="' + base + '/products/' + slug + '/" class="qv-order-btn">Order Now</a>' +
          '</div>' +

          /* meta: SKU / Category / Tags */
          '<div class="qv-meta">' +
            '<div class="qv-meta-row"><span class="qv-meta-label">SKU:</span> <span>' + slug.toUpperCase().replace(/-/g, '') + '</span></div>' +
            '<div class="qv-meta-row"><span class="qv-meta-label">Category:</span> <span>' + cat + '</span></div>' +
            (tags.length ? '<div class="qv-meta-row"><span class="qv-meta-label">Tags:</span> <span>' + tags.join(', ') + '</span></div>' : '') +
          '</div>' +

          /* social share */
          '<div class="qv-social">' +
            '<a class="qv-social-icon qv-social-icon--fb" href="https://www.facebook.com/sharer/sharer.php?u=' + pageUrl + '" target="_blank" rel="noopener" aria-label="Share on Facebook">' +
              '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>' +
            '</a>' +
            '<a class="qv-social-icon qv-social-icon--x" href="https://twitter.com/intent/tweet?url=' + pageUrl + '&text=' + pageTxt + '" target="_blank" rel="noopener" aria-label="Share on X">' +
              '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' +
            '</a>' +
            '<a class="qv-social-icon qv-social-icon--wa" href="https://api.whatsapp.com/send?text=' + pageTxt + '%20' + pageUrl + '" target="_blank" rel="noopener" aria-label="Share on WhatsApp">' +
              '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>' +
            '</a>' +
            '<a class="qv-social-icon qv-social-icon--ig" href="https://www.instagram.com/nrichbd.store" target="_blank" rel="noopener" aria-label="Instagram">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>' +
            '</a>' +
          '</div>' +

        '</div>' +
      '</div>';

    /* quantity stepper */
    var qvQty   = 1;
    var qtyVal  = modal.querySelector('#qv-qty-val');
    var qtyMinus = modal.querySelector('#qv-qty-minus');
    var qtyPlus  = modal.querySelector('#qv-qty-plus');
    if (qtyMinus) qtyMinus.addEventListener('click', function() {
      if (qvQty > 1) { qvQty--; if (qtyVal) qtyVal.textContent = qvQty; }
    });
    if (qtyPlus) qtyPlus.addEventListener('click', function() {
      qvQty++; if (qtyVal) qtyVal.textContent = qvQty;
    });

    /* color swatch selection */
    var selectedColor = product.colors && product.colors.length ? product.colors[0].name : '';
    modal.querySelectorAll('.qv-swatch').forEach(function(sw) {
      sw.addEventListener('click', function() {
        modal.querySelectorAll('.qv-swatch').forEach(function(s) { s.classList.remove('active'); });
        this.classList.add('active');
        selectedColor = this.getAttribute('data-color');
        var lbl = modal.querySelector('#qv-color-name');
        if (lbl) lbl.textContent = selectedColor;
      });
    });

    /* size pill selection */
    var selectedSize = product.sizes && product.sizes.length ? product.sizes[0] : '';
    modal.querySelectorAll('.qv-size-pill').forEach(function(pill) {
      pill.addEventListener('click', function() {
        modal.querySelectorAll('.qv-size-pill').forEach(function(p) { p.classList.remove('active'); });
        this.classList.add('active');
        selectedSize = this.getAttribute('data-size');
        var lbl = modal.querySelector('#qv-size-name');
        if (lbl) lbl.textContent = selectedSize;
      });
    });

    /* add to cart */
    var atcBtn = modal.querySelector('#qv-atc');
    if (atcBtn) atcBtn.addEventListener('click', function() {
      var variantName = name + (selectedColor ? ' — ' + selectedColor : '') + (selectedSize ? ' (' + selectedSize + ')' : '');
      NRICH.cart.add({ id: product.id || slug, name: variantName, price: price, originalPrice: orig || price, image: mainImg, slug: slug, category: cat, quantity: qvQty });
      closeQuickView();
    });

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

    // view_item_list on homepage / shop / category
    var pt = document.body.getAttribute('data-page-type');
    if ((pt === 'home' || pt === 'shop' || pt === 'category') && window.NRICH && window.NRICH.tracking) {
      var products = window.NRICH_PRODUCTS || [];
      var listId   = pt === 'home' ? 'homepage_featured' : (pt === 'category' ? 'category_page' : 'shop_page');
      var listName = pt === 'home' ? 'Homepage Featured' : (pt === 'category' ? 'Category Page' : 'Shop Page');
      if (products.length) window.NRICH.tracking.viewItemList(products, listName, listId);
    }
  });

})();
