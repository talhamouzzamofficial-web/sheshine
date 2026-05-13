/**
 * SheShine theme — vanilla JS (no dependencies)
 */
(function () {
  'use strict';

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  /* Hero slider */
  function initHeroSliders() {
    document.querySelectorAll('[data-sheshine-hero]').forEach(function (root) {
      var slides = root.querySelectorAll('[data-hero-slide]');
      var dots = root.querySelectorAll('[data-hero-dot]');
      var prev = root.querySelector('[data-hero-prev]');
      var next = root.querySelector('[data-hero-next]');
      var intervalMs = parseInt(root.getAttribute('data-autoplay-interval') || '5000', 10);
      var index = 0;
      var timer = null;

      if (!slides.length) return;

      function show(i) {
        index = (i + slides.length) % slides.length;
        slides.forEach(function (el, j) {
          el.classList.toggle('is-active', j === index);
        });
        dots.forEach(function (el, j) {
          el.classList.toggle('is-active', j === index);
        });
      }

      function nextSlide() {
        show(index + 1);
      }

      function startTimer() {
        stopTimer();
        if (intervalMs > 0) {
          timer = setInterval(nextSlide, intervalMs);
        }
      }

      function stopTimer() {
        if (timer) clearInterval(timer);
        timer = null;
      }

      show(0);
      startTimer();

      if (prev) {
        prev.addEventListener('click', function () {
          stopTimer();
          show(index - 1);
          startTimer();
        });
      }
      if (next) {
        next.addEventListener('click', function () {
          stopTimer();
          show(index + 1);
          startTimer();
        });
      }
      dots.forEach(function (dot, j) {
        dot.addEventListener('click', function () {
          stopTimer();
          show(j);
          startTimer();
        });
      });
      root.addEventListener('mouseenter', stopTimer);
      root.addEventListener('mouseleave', startTimer);
    });
  }

  /* Product gallery thumbnails */
  function initProductGallery() {
    document.querySelectorAll('[data-sheshine-gallery]').forEach(function (gallery) {
      var main = gallery.querySelector('[data-gallery-main]');
      if (!main) return;
      var mainImg = main.querySelector('img');
      gallery.querySelectorAll('[data-gallery-thumb]').forEach(function (thumb) {
        thumb.addEventListener('click', function () {
          var full = thumb.getAttribute('data-full-src');
          var alt = thumb.getAttribute('data-alt') || '';
          if (full && mainImg) {
            mainImg.src = full;
            mainImg.srcset = '';
            mainImg.sizes = '';
            mainImg.alt = alt;
          }
          gallery.querySelectorAll('[data-gallery-thumb]').forEach(function (t) {
            t.classList.toggle('is-active', t === thumb);
          });
        });
      });
    });
  }

  /* Parse JSON script */
  function safeJson(id) {
    var el = document.getElementById(id);
    if (!el || !el.textContent) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      return null;
    }
  }

  /* Product variants */
  function initProductVariants() {
    document.querySelectorAll('[data-sheshine-product]').forEach(function (wrap) {
      var sectionId = wrap.getAttribute('data-section-id');
      var variants = safeJson('SheshineVariants-' + sectionId);
      if (!variants) return;

      var idInput = wrap.querySelector('.sheshine-variant-id-input');
      var priceEl = wrap.querySelector('[data-sheshine-price]');
      var compareEl = wrap.querySelector('[data-sheshine-compare-wrap]');
      var compareAmount = wrap.querySelector('[data-sheshine-compare]');
      var saveBadge = wrap.querySelector('[data-sheshine-save]');
      var optionGroups = wrap.querySelectorAll('[data-option-index]');

      function findVariant(selected) {
        return variants.find(function (v) {
          return v.options.every(function (opt, i) {
            return opt === selected[i];
          });
        });
      }

      function getSelected() {
        var out = [];
        optionGroups.forEach(function (group) {
          var idx = parseInt(group.getAttribute('data-option-index'), 10);
          var pill = group.querySelector('.sheshine-variant-pill.is-selected');
          out[idx] = pill ? pill.getAttribute('data-option-value') : '';
        });
        return out;
      }

      function formatMoney(cents) {
        if (typeof cents !== 'number') return '';
        if (typeof window.Shopify !== 'undefined' && typeof window.Shopify.formatMoney === 'function') {
          var fmt = window.sheshineMoneyFormat || '{{amount}}';
          return window.Shopify.formatMoney(cents, fmt);
        }
        var amount = (cents / 100).toFixed(2);
        return '£' + amount;
      }

      function updateUrl(variantId) {
        if (!variantId) return;
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variantId);
        window.history.replaceState({}, '', url.toString());
      }

      function applyVariant(variant) {
        if (!variant || !idInput) return;
        idInput.value = variant.id;
        idInput.disabled = !variant.available;
        if (priceEl) priceEl.textContent = formatMoney(variant.price);
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          if (compareEl) compareEl.hidden = false;
          if (compareAmount) compareAmount.textContent = formatMoney(variant.compare_at_price);
          if (saveBadge) {
            var pct = Math.round(
              ((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100
            );
            saveBadge.textContent = 'You save ' + pct + '%';
            saveBadge.hidden = false;
          }
        } else {
          if (compareEl) compareEl.hidden = true;
          if (saveBadge) saveBadge.hidden = true;
        }
        updateUrl(variant.id);
      }

      optionGroups.forEach(function (group) {
        group.querySelectorAll('.sheshine-variant-pill').forEach(function (pill) {
          pill.addEventListener('click', function () {
            group.querySelectorAll('.sheshine-variant-pill').forEach(function (p) {
              p.classList.remove('is-selected');
            });
            pill.classList.add('is-selected');
            var selected = getSelected();
            var v = findVariant(selected);
            if (v) applyVariant(v);
          });
        });
      });
    });
  }

  function initQty() {
    document.querySelectorAll('[data-sheshine-qty]').forEach(function (wrap) {
      var input = wrap.querySelector('input[type="number"]');
      var minus = wrap.querySelector('[data-qty-minus]');
      var plus = wrap.querySelector('[data-qty-plus]');
      if (!input) return;
      function clamp() {
        var v = parseInt(input.value, 10) || 1;
        var min = parseInt(input.min, 10) || 1;
        var max = parseInt(input.max, 10) || 999;
        v = Math.max(min, Math.min(max, v));
        input.value = v;
      }
      if (minus) {
        minus.addEventListener('click', function () {
          input.value = parseInt(input.value, 10) - 1;
          clamp();
        });
      }
      if (plus) {
        plus.addEventListener('click', function () {
          input.value = parseInt(input.value, 10) + 1;
          clamp();
        });
      }
      input.addEventListener('change', clamp);
    });
  }

  function initAccordions() {
    document.querySelectorAll('[data-sheshine-acc-trigger]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('aria-controls');
        var panel = id && document.getElementById(id);
        if (!panel) return;
        var open = panel.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  function initMarqueeFallback() {
    if (!window.CSS || !CSS.supports('animation', 'name')) {
      var tracks = document.querySelectorAll('.sheshine-press__track');
      tracks.forEach(function (track) {
        track.style.animation = 'none';
        track.style.display = 'flex';
      });
    }
  }

  function initCartShipping() {
    document.querySelectorAll('[data-sheshine-free-shipping]').forEach(function (el) {
      var threshold = parseInt(el.getAttribute('data-threshold') || '2500', 10);
      var total = parseInt(el.getAttribute('data-cart-total') || '0', 10);
      var fill = el.querySelector('[data-sheshine-shipping-fill]');
      var msg = el.querySelector('[data-sheshine-shipping-msg]');
      if (!msg) return;
      var remain = Math.max(0, threshold - total);
      var pct = threshold <= 0 ? 100 : Math.min(100, (total / threshold) * 100);
      if (fill) fill.style.width = pct + '%';
      if (remain === 0) {
        msg.textContent = el.getAttribute('data-msg-complete') || '';
      } else {
        var templ = el.getAttribute('data-msg-remain') || '';
        var money = (remain / 100).toFixed(2);
        msg.textContent = templ.replace('[amount]', '£' + money);
      }
    });
  }

  onReady(function () {
    initHeroSliders();
    initProductGallery();
    initProductVariants();
    initQty();
    initAccordions();
    initMarqueeFallback();
    initCartShipping();
  });
})();
