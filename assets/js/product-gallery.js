// NRICH — Product Gallery
// Thumbnail switching, zoom, mobile swipe, recently viewed

(function () {
  'use strict';

  var currentIndex = 0;
  var images = [];
  var startX = 0;
  var isDragging = false;

  // ── Gallery Init ──────────────────────────────────────────────

  function initGallery() {
    var mainImg = document.getElementById('gallery-main-img');
    var thumbs = document.querySelectorAll('.gallery-thumb');
    var prevBtn = document.getElementById('gallery-prev');
    var nextBtn = document.getElementById('gallery-next');
    var zoomBtn = document.getElementById('gallery-zoom');
    var lightbox = document.getElementById('gallery-lightbox');

    if (!mainImg) return;

    // Collect image sources from thumbnails
    images = [];
    thumbs.forEach(function (thumb) {
      var src = thumb.getAttribute('data-src') || thumb.querySelector('img').src;
      images.push(src);
    });
    if (!images.length) {
      images.push(mainImg.src);
    }

    // Thumb click
    thumbs.forEach(function (thumb, i) {
      thumb.addEventListener('click', function () {
        setActiveImage(i);
      });
    });

    // Prev / Next
    if (prevBtn) prevBtn.addEventListener('click', function () { setActiveImage(currentIndex - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { setActiveImage(currentIndex + 1); });

    // Zoom / Lightbox
    if (zoomBtn && lightbox) {
      zoomBtn.addEventListener('click', openLightbox);
    }
    if (lightbox) {
      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) closeLightbox();
      });
      var lightboxClose = document.getElementById('lightbox-close');
      if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    }

    // Desktop hover zoom
    var mainWrap = document.querySelector('.gallery-main-wrap');
    if (mainWrap) {
      mainWrap.addEventListener('mousemove', onZoomMove);
      mainWrap.addEventListener('mouseleave', onZoomLeave);
    }

    // Mobile swipe
    if (mainImg) {
      mainImg.addEventListener('touchstart', function (e) {
        startX = e.touches[0].clientX;
        isDragging = true;
      }, { passive: true });

      mainImg.addEventListener('touchend', function (e) {
        if (!isDragging) return;
        var dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) {
          setActiveImage(dx < 0 ? currentIndex + 1 : currentIndex - 1);
        }
        isDragging = false;
      });
    }

    // Keyboard arrow navigation
    document.addEventListener('keydown', function (e) {
      var lb = document.getElementById('gallery-lightbox');
      if (lb && lb.classList.contains('open')) {
        if (e.key === 'ArrowLeft') setActiveImage(currentIndex - 1);
        if (e.key === 'ArrowRight') setActiveImage(currentIndex + 1);
        if (e.key === 'Escape') closeLightbox();
      }
    });
  }

  function setActiveImage(index) {
    if (images.length === 0) return;
    currentIndex = (index + images.length) % images.length;
    var mainImg = document.getElementById('gallery-main-img');
    var lightboxImg = document.getElementById('lightbox-img');
    if (mainImg) { mainImg.src = images[currentIndex]; }
    if (lightboxImg) { lightboxImg.src = images[currentIndex]; }

    // Update thumbs
    document.querySelectorAll('.gallery-thumb').forEach(function (thumb, i) {
      thumb.classList.toggle('active', i === currentIndex);
    });
  }

  function onZoomMove(e) {
    var mainImg = document.getElementById('gallery-main-img');
    if (!mainImg) return;
    var rect = e.currentTarget.getBoundingClientRect();
    var x = ((e.clientX - rect.left) / rect.width * 100).toFixed(2);
    var y = ((e.clientY - rect.top) / rect.height * 100).toFixed(2);
    mainImg.style.transformOrigin = x + '% ' + y + '%';
    mainImg.style.transform = 'scale(1.6)';
    mainImg.style.cursor = 'zoom-out';
  }

  function onZoomLeave() {
    var mainImg = document.getElementById('gallery-main-img');
    if (!mainImg) return;
    mainImg.style.transform = 'scale(1)';
    mainImg.style.transformOrigin = 'center center';
    mainImg.style.cursor = 'zoom-in';
  }

  function openLightbox() {
    var lightbox = document.getElementById('gallery-lightbox');
    var lightboxImg = document.getElementById('lightbox-img');
    if (!lightbox) return;
    if (lightboxImg) lightboxImg.src = images[currentIndex] || '';
    lightbox.classList.add('open');
    document.body.classList.add('modal-open');
  }

  function closeLightbox() {
    var lightbox = document.getElementById('gallery-lightbox');
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  // ── Color / Size Variant Selection ────────────────────────────

  function initVariants() {
    // Color swatches
    document.querySelectorAll('.color-swatch').forEach(function (swatch) {
      swatch.addEventListener('click', function () {
        document.querySelectorAll('.color-swatch').forEach(function (s) { s.classList.remove('active'); });
        swatch.classList.add('active');

        // Update main image if color has image
        var colorImg = swatch.getAttribute('data-image');
        if (colorImg) {
          var idx = images.indexOf(colorImg);
          if (idx >= 0) setActiveImage(idx);
          else {
            var mainImg = document.getElementById('gallery-main-img');
            if (mainImg) mainImg.src = colorImg;
          }
        }

        // Update selected color display
        var colorName = swatch.getAttribute('data-color-name') || swatch.getAttribute('title') || '';
        var selectedColor = document.getElementById('selected-color');
        if (selectedColor) selectedColor.textContent = colorName;

        updateAddToCartData();
      });
    });

    // Size buttons
    document.querySelectorAll('.size-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.size-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var selectedSize = document.getElementById('selected-size');
        if (selectedSize) selectedSize.textContent = btn.textContent;
        updateAddToCartData();
      });
    });

    // Quantity controls
    var qtyMinus = document.getElementById('qty-minus');
    var qtyPlus = document.getElementById('qty-plus');
    var qtyVal = document.getElementById('qty-value');

    if (qtyMinus && qtyPlus && qtyVal) {
      qtyMinus.addEventListener('click', function () {
        var v = parseInt(qtyVal.textContent, 10) || 1;
        if (v > 1) qtyVal.textContent = v - 1;
      });
      qtyPlus.addEventListener('click', function () {
        var v = parseInt(qtyVal.textContent, 10) || 1;
        qtyVal.textContent = v + 1;
      });
    }
  }

  function updateAddToCartData() {
    // This updates the add to cart button with current selections
    var activeColor = document.querySelector('.color-swatch.active');
    var activeSize = document.querySelector('.size-btn.active');
    var addBtn = document.getElementById('add-to-cart-btn');
    if (addBtn) {
      addBtn.setAttribute('data-selected-color', activeColor ? activeColor.getAttribute('data-color-name') : '');
      addBtn.setAttribute('data-selected-size', activeSize ? activeSize.textContent : '');
    }
  }

  // ── Add To Cart from Product Page ─────────────────────────────

  function initProductPage() {
    var addBtn = document.getElementById('add-to-cart-btn');
    var buyBtn = document.getElementById('buy-now-btn');
    var product = window.CURRENT_PRODUCT;

    if (!product || !addBtn) return;

    addBtn.addEventListener('click', function () {
      var activeColor = document.querySelector('.color-swatch.active');
      var activeSize = document.querySelector('.size-btn.active');
      var qtyVal = document.getElementById('qty-value');
      var qty = parseInt(qtyVal ? qtyVal.textContent : '1', 10) || 1;

      var sizes = product.sizes || [];
      if (sizes.length > 1 && !activeSize) {
        showToast('Please select a size');
        return;
      }

      var price = parseFloat(product.sale_price) > 0 ? parseFloat(product.sale_price) : parseFloat(product.price);
      var img = (activeColor && activeColor.getAttribute('data-image')) || (product.images && product.images[0]) || product.image || '';
      var colorName = activeColor ? activeColor.getAttribute('data-color-name') : '';
      var colorValue = activeColor ? activeColor.getAttribute('data-color-value') : '';
      var sizeName = activeSize ? activeSize.textContent.trim() : (sizes.length === 1 ? sizes[0] : '');

      var cartItem = {
        id: product.id || product.slug,
        name: product.name || product.title,
        price: price,
        originalPrice: parseFloat(product.price) || price,
        image: img,
        color: colorName,
        colorValue: colorValue,
        size: sizeName,
        slug: product.slug || product.id,
        category: product.category || product.category_slug || '',
        quantity: qty
      };

      if (window.NRICH && window.NRICH.cart) {
        window.NRICH.cart.add(cartItem);
      }
    });

    if (buyBtn) {
      buyBtn.addEventListener('click', function () {
        addBtn.click();
        setTimeout(function () { window.location.href = '/checkout/'; }, 300);
      });
    }

    // Wishlist toggle on product page
    var wishlistBtn = document.getElementById('product-wishlist-btn');
    if (wishlistBtn && product) {
      var id = product.id || product.slug;
      wishlistBtn.setAttribute('data-wishlist-id', id);
      if (window.NRICH && window.NRICH.wishlist) {
        wishlistBtn.classList.toggle('active', window.NRICH.wishlist.isIn(id));
      }
    }
  }

  // ── Recently Viewed ───────────────────────────────────────────

  function trackRecentlyViewed() {
    if (!window.CURRENT_PRODUCT) return;
    var RV_KEY = 'nrich_recently_viewed';
    var product = window.CURRENT_PRODUCT;
    var id = product.id || product.slug;

    try {
      var viewed = JSON.parse(localStorage.getItem(RV_KEY)) || [];
      viewed = viewed.filter(function (p) { return (p.id || p.slug) !== id; });
      viewed.unshift(product);
      viewed = viewed.slice(0, 10);
      localStorage.setItem(RV_KEY, JSON.stringify(viewed));
    } catch (e) {}
  }

  function renderRecentlyViewed() {
    var container = document.getElementById('recently-viewed-grid');
    if (!container) return;

    var RV_KEY = 'nrich_recently_viewed';
    var currentId = window.CURRENT_PRODUCT ? (window.CURRENT_PRODUCT.id || window.CURRENT_PRODUCT.slug) : null;

    try {
      var viewed = JSON.parse(localStorage.getItem(RV_KEY)) || [];
      viewed = viewed.filter(function (p) { return (p.id || p.slug) !== currentId; }).slice(0, 4);
      if (!viewed.length) {
        var section = document.getElementById('recently-viewed-section');
        if (section) section.style.display = 'none';
        return;
      }

      var cfg = window.NRICH_CONFIG || { currency: '৳' };
      var sym = cfg.currency;

      container.innerHTML = viewed.map(function (p) {
        var slug = p.slug || p.id;
        var img = p.image || (p.images && p.images[0]) || '';
        var price = parseFloat(p.sale_price) > 0 ? parseFloat(p.sale_price) : parseFloat(p.price);
        return '<a href="/products/' + slug + '/" class="recently-viewed-item">' +
          '<div class="recently-viewed-img"><img src="' + img + '" alt="' + (p.name || p.title) + '" loading="lazy"></div>' +
          '<div class="recently-viewed-name">' + (p.name || p.title) + '</div>' +
          '<div class="recently-viewed-price">' + sym + price.toLocaleString() + '</div>' +
        '</a>';
      }).join('');
    } catch (e) {}
  }

  // ── Tab Switching ─────────────────────────────────────────────

  function initTabs() {
    var tabs = document.querySelectorAll('[data-tab]');
    var contents = document.querySelectorAll('[data-tab-content]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-tab');
        tabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === target); });
        contents.forEach(function (c) { c.classList.toggle('active', c.getAttribute('data-tab-content') === target); });
      });
    });
  }

  // ── Sticky Mobile Add to Cart ─────────────────────────────────

  function initStickyBar() {
    var stickyBar = document.getElementById('sticky-add-to-cart');
    if (!stickyBar) return;
    var productInfo = document.querySelector('.product-info');
    if (!productInfo) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        stickyBar.classList.toggle('visible', !entry.isIntersecting);
      });
    }, { threshold: 0, rootMargin: '-80px 0px 0px 0px' });

    observer.observe(productInfo);

    var stickyBtn = stickyBar.querySelector('.sticky-add-to-cart-btn');
    if (stickyBtn) {
      stickyBtn.addEventListener('click', function () {
        var mainBtn = document.getElementById('add-to-cart-btn');
        if (mainBtn) mainBtn.click();
      });
    }
  }

  function showToast(msg) {
    if (window.showToast) { window.showToast(msg); return; }
    alert(msg);
  }

  // ── Init ──────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    initGallery();
    initVariants();
    initProductPage();
    initTabs();
    initStickyBar();
    trackRecentlyViewed();
    renderRecentlyViewed();

    // view_item tracking
    if (window.CURRENT_PRODUCT && window.NRICH && window.NRICH.tracking) {
      var activeColor = document.querySelector('.color-swatch.active');
      var variant = activeColor ? activeColor.getAttribute('data-color-name') : '';
      window.NRICH.tracking.viewItem(window.CURRENT_PRODUCT, variant);
    }
  });

  window.NRICH = window.NRICH || {};
  window.NRICH.gallery = { setImage: setActiveImage, open: openLightbox, close: closeLightbox };

})();
