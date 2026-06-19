/* =====================================================================
   432Hz — interactions
   ===================================================================== */
(() => {
  'use strict';
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header state + scroll progress ---------- */
  const header = $('.site-header');
  const progress = $('.progress');
  const onScroll = () => {
    const y = window.scrollY;
    header && header.classList.toggle('scrolled', y > 60);
    if (progress) {
      const h = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal], .reveal-lines').forEach((el) => io.observe(el));

  /* ---------- Hero frequency canvas ---------- */
  const canvas = $('.hero__canvas');
  if (canvas && !reduce) {
    const ctx = canvas.getContext('2d');
    let w, h, t = 0, raf;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const resize = () => {
      w = canvas.width = innerWidth * dpr;
      h = canvas.height = innerHeight * dpr;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
    };
    resize(); addEventListener('resize', resize);
    const cx = () => w * 0.72, cy = () => h * 0.34;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // concentric breathing rings
      for (let i = 0; i < 7; i++) {
        const r = (60 + i * 70) * dpr + Math.sin(t / 60 + i) * 8 * dpr;
        ctx.beginPath();
        ctx.arc(cx(), cy(), r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(199,164,90,${0.18 - i * 0.02})`;
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      }
      // flowing sine wave
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6 * dpr) {
        const y = h * 0.78 + Math.sin(x / (120 * dpr) + t / 40) * 26 * dpr
                          + Math.sin(x / (60 * dpr) - t / 70) * 12 * dpr;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(199,164,90,0.28)';
      ctx.lineWidth = 1.4 * dpr; ctx.stroke();
      t++; raf = requestAnimationFrame(draw);
    };
    draw();
    document.addEventListener('visibilitychange', () => {
      document.hidden ? cancelAnimationFrame(raf) : (raf = requestAnimationFrame(draw));
    });
  }

  /* ---------- Parallax (hero copy + figures) ---------- */
  if (!reduce) {
    const px = $$('[data-parallax]');
    addEventListener('scroll', () => {
      const y = scrollY;
      px.forEach((el) => {
        const s = parseFloat(el.dataset.parallax) || 0.15;
        el.style.transform = `translate3d(0, ${y * s}px, 0)`;
      });
    }, { passive: true });
  }

  /* ---------- Ritual builder ---------- */
  const rituals = {
    Relaxation: { title: 'The Unwind Ritual', text: 'Soften the edges of the day. A slow descent into stillness, scented and sound-tuned to ease a busy mind.', items: ['Lavender & Oud incense', 'Selenite calming wand', 'Guided 432Hz wind-down track'], price: 'Dhs. 329' },
    Energy: { title: 'The Awaken Ritual', text: 'Rise with intention. Bright, citrus-forward notes and crystals that move stagnant energy into momentum.', items: ['Citrus & Frankincense blend', 'Carnelian vitality stone', 'Morning frequency meditation'], price: 'Dhs. 349' },
    Meditation: { title: 'The Stillness Ritual', text: 'Arrive in the present. A grounding set built for breath, presence, and the quiet between thoughts.', items: ['Sandalwood incense', 'Amethyst clarity cluster', '432Hz singing-bowl session'], price: 'Dhs. 369' },
    Sleep: { title: 'The Deep Rest Ritual', text: 'Surrender into night. Warm, sedative aromatics paired with stones that invite the body to let go.', items: ['Chamomile & Vetiver', 'Moonstone under-pillow set', 'Delta-wave 432Hz soundscape'], price: 'Dhs. 339' },
    Focus: { title: 'The Clarity Ritual', text: 'Cut through the noise. A clean, mineral profile designed to sharpen attention and steady the mind.', items: ['Rosemary & Cedar', 'Clear quartz focus point', 'Deep-work frequency loop'], price: 'Dhs. 319' },
    'Spiritual Growth': { title: 'The Ascension Ritual', text: 'Expand inward. Resinous, sacred notes and high-vibration crystals to support reflection and growth.', items: ['Palo Santo & Myrrh', 'Labradorite intuition stone', 'Chakra-tuned 432Hz journey'], price: 'Dhs. 386' },
    'Self-Care': { title: 'The Devotion Ritual', text: 'Return to yourself. A tender, rose-led ceremony of softness, warmth, and unhurried care.', items: ['Rose & Amber incense', 'Rose quartz heart stone', 'Self-compassion sound bath'], price: 'Dhs. 349' },
  };
  const intentBtns = $$('.intent');
  const panel = $('#ritualPanel');
  const setRitual = (key) => {
    const r = rituals[key]; if (!r || !panel) return;
    panel.classList.remove('show');
    setTimeout(() => {
      panel.innerHTML = `
        <span class="eyebrow" style="color:var(--gold)">Your ritual</span>
        <h3>${r.title}</h3>
        <p>${r.text}</p>
        <ul>${r.items.map((i) => `<li>${i}</li>`).join('')}</ul>
        <div style="display:flex;align-items:center;gap:1.2rem;flex-wrap:wrap">
          <button class="btn btn-light" data-add="${r.title}" data-price="${r.price}"><span>Add ritual — ${r.price}</span></button>
          <a class="link-underline" href="product.html">View details →</a>
        </div>`;
      requestAnimationFrame(() => panel.classList.add('show'));
    }, 180);
  };
  intentBtns.forEach((b) => b.addEventListener('click', () => {
    intentBtns.forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    setRitual(b.dataset.intent);
  }));
  if (intentBtns[0]) { intentBtns[0].classList.add('active'); setRitual(intentBtns[0].dataset.intent); }

  /* ---------- Testimonials slider ---------- */
  const track = $('.t-track');
  if (track) {
    const prev = $('[data-t="prev"]'), next = $('[data-t="next"]');
    const step = () => (track.firstElementChild?.getBoundingClientRect().width || 320) + 24;
    next && next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    prev && prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  }

  /* ---------- Cart (persisted to localStorage) ---------- */
  const CART_KEY = 'hz_cart';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { cart = []; }
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} };
  const overlay = $('#overlay');
  const drawer = $('#cartDrawer');
  const cartBody = $('#cartBody');
  const cartFoot = $('#cartFoot');
  const cartCount = $('#cartCount');
  const money = (s) => parseFloat(String(s).replace(/dhs\.?/i, '').replace(/[^\d.]/g, '')) || 0;

  const openCart = () => { overlay?.classList.add('open'); drawer?.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeCart = () => { overlay?.classList.remove('open'); drawer?.classList.remove('open'); document.body.style.overflow = ''; };

  const renderCart = () => {
    saveCart();
    if (!cartBody) return;
    const qty = cart.reduce((n, i) => n + i.qty, 0);
    if (cartCount) { cartCount.textContent = qty; cartCount.style.display = qty ? 'grid' : 'none'; }
    if (!cart.length) {
      cartBody.innerHTML = `<p class="cart-empty">Your ritual basket is empty.<br>Begin with an intention.</p>`;
      if (cartFoot) cartFoot.style.display = 'none';
      return;
    }
    if (cartFoot) cartFoot.style.display = 'block';
    cartBody.innerHTML = cart.map((i, idx) => `
      <div class="cart-line">
        <div class="thumb">${i.image ? `<img src="${i.image}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px">` : ''}</div>
        <div>
          <b>${i.name}</b>
          <div class="qty">
            <button data-dec="${idx}" aria-label="decrease">−</button>
            <span>${i.qty}</span>
            <button data-inc="${idx}" aria-label="increase">+</button>
          </div>
        </div>
        <div style="font-family:var(--display)">Dhs. ${(money(i.price) * i.qty).toFixed(0)}</div>
      </div>`).join('');
    const total = cart.reduce((s, i) => s + money(i.price) * i.qty, 0);
    const totalEl = $('#cartTotal'); if (totalEl) totalEl.textContent = 'Dhs. ' + total.toFixed(0);
  };

  const addToCart = (name, price, n = 1, image = '') => {
    const ex = cart.find((i) => i.name === name);
    if (ex) { ex.qty += n; if (image && !ex.image) ex.image = image; }
    else cart.push({ name, price, qty: n, image });
    renderCart(); toast(`${name} added to your ritual`); openCart();
  };

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      e.preventDefault();
      const card = add.closest('.prod-card, .bundle-item, .rec-card, .gallery, article');
      const image = add.dataset.image || card?.querySelector('img')?.getAttribute('src') || '';
      addToCart(add.dataset.add, add.dataset.price || 'Dhs. 0', Math.max(1, parseInt(add.dataset.qty) || 1), image);
      return;
    }
    // Wishlist heart — don't let it navigate the card
    if (e.target.closest('.prod-fav')) { e.preventDefault(); toast('Saved to your wishlist'); return; }
    // Click anywhere on a product card → its product page
    const pcard = e.target.closest('.prod-card[data-slug]');
    if (pcard && !e.target.closest('button, a')) { location.href = 'product.html?slug=' + pcard.dataset.slug; return; }
    if (e.target.closest('[data-open-cart]')) { openCart(); return; }
    if (e.target.closest('[data-close-cart]') || e.target === overlay) { closeCart(); }
    const inc = e.target.closest('[data-inc]'); if (inc) { cart[+inc.dataset.inc].qty++; renderCart(); }
    const dec = e.target.closest('[data-dec]'); if (dec) { const i = +dec.dataset.dec; cart[i].qty--; if (cart[i].qty <= 0) cart.splice(i, 1); renderCart(); }
  });
  renderCart();

  /* ---------- Checkout button → checkout page ---------- */
  const checkoutBtn = $('#cartFoot .btn');
  if (checkoutBtn) checkoutBtn.addEventListener('click', () => { if (cart.length) location.href = 'checkout.html'; });

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    let el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.innerHTML = '<span class="dot">✦</span><span class="msg"></span>'; document.body.appendChild(el); }
    el.querySelector('.msg').textContent = msg;
    el.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ---------- Mobile nav ---------- */
  const burger = $('#burger'), mnav = $('#mobileNav');
  burger && burger.addEventListener('click', () => {
    const open = mnav.classList.toggle('open');
    burger.classList.toggle('x', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#mobileNav a').forEach((a) => a.addEventListener('click', () => {
    mnav.classList.remove('open'); document.body.style.overflow = '';
  }));

  /* ---------- Newsletter + escape ---------- */
  $('#nlForm')?.addEventListener('submit', (e) => { e.preventDefault(); e.target.reset(); toast('Welcome to the frequency — check your inbox for 10% off'); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });

  /* ---------- 432Hz ambient tone (Web Audio, synthesized live) ---------- */
  const soundBtn = $('#soundToggle');
  if (soundBtn && (window.AudioContext || window.webkitAudioContext)) {
    let actx = null, master = null, nodes = [], playing = false;
    const stateEl = $('.state', soundBtn);
    const start = () => {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended' && actx.resume) actx.resume();
      master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination);
      // consonant drone tuned to 432Hz: octave (216) · fourth (324) · root (432)
      [[216, 0.5], [324, 0.32], [432, 0.4]].forEach(([f, g]) => {
        const osc = actx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f;
        const gain = actx.createGain(); gain.gain.value = g;
        osc.connect(gain); gain.connect(master); osc.start(); nodes.push(osc);
      });
      // slow "breathing" via LFO on master gain
      const lfo = actx.createOscillator(); lfo.frequency.value = 0.09;
      const lfoGain = actx.createGain(); lfoGain.gain.value = 0.03;
      lfo.connect(lfoGain); lfoGain.connect(master.gain); lfo.start(); nodes.push(lfo);
      master.gain.setTargetAtTime(0.10, actx.currentTime, 1.6); // gentle fade-in
      playing = true; soundBtn.classList.add('on'); if (stateEl) stateEl.textContent = 'on';
    };
    const stop = () => {
      if (!actx) return;
      master.gain.setTargetAtTime(0, actx.currentTime, 0.5);
      const ctx = actx; setTimeout(() => { try { nodes.forEach((n) => n.stop && n.stop()); ctx.close(); } catch {} }, 900);
      actx = null; nodes = []; playing = false; soundBtn.classList.remove('on'); if (stateEl) stateEl.textContent = 'off';
    };
    soundBtn.addEventListener('click', () => (playing ? stop() : start()));
  }

  /* ---------- Year ---------- */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();
