/* =====================================================================
   432Hz Healing — booking page logic
   ===================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (d) => { const [y, m, dd] = d.split('-').map(Number); const dt = new Date(y, m - 1, dd); return `${DOW[dt.getDay()]}, ${dd} ${MON[m - 1]}`; };
  const fmtLong = (d) => { const [y, m, dd] = d.split('-').map(Number); const dt = new Date(y, m - 1, dd); return `${DOW[dt.getDay()]}, ${dd} ${MON[m - 1]} ${y}`; };
  const fmtTime = (t) => { let [h, mi] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}${mi ? ':' + pad(mi) : ''} ${ap}`; };
  const durMin = (s) => { const m = /(\d+)/.exec(s || ''); return m ? +m[1] : 60; };
  const catGrad = (c) => ({
    'Sound Healing': 'linear-gradient(150deg,#4a5d6b,#1c272e)', 'Breathwork': 'linear-gradient(150deg,#3a4a3e,#1d261f)',
    'Nervous System Regulation': 'linear-gradient(150deg,#6e5235,#2a2018)', 'Guided Meditation': 'linear-gradient(150deg,#7d6a44,#2c2616)',
    'Emotional Release': 'linear-gradient(150deg,#7a4a4a,#2a1818)', 'Stress Recovery': 'linear-gradient(150deg,#4a6b5d,#182a24)',
    'Group Healing': 'linear-gradient(150deg,#5a4a6b,#1e1828)', 'Deep Healing Sessions': 'linear-gradient(150deg,#3a4a3e,#1d261f)',
  }[c] || 'linear-gradient(150deg,#3a4a3e,#1d261f)');
  const ringSvg = '<svg width="40%" viewBox="0 0 100 100" fill="none" stroke="rgba(223,199,142,.6)" stroke-width="1.4"><circle cx="50" cy="50" r="14"/><circle cx="50" cy="50" r="26" opacity=".6"/><circle cx="50" cy="50" r="38" opacity=".3"/></svg>';

  let sessions = [], filter = { cat: 'all', instructor: '', avail: '' }, view = 'list', current = null;

  /* ---------- hero canvas ---------- */
  (() => {
    const cv = $('#heroCanvas'); if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = cv.getContext('2d'); let w, h, t = 0; const dpr = Math.min(devicePixelRatio || 1, 2);
    const rs = () => { w = cv.width = innerWidth * dpr; h = cv.height = cv.offsetHeight * dpr; };
    rs(); addEventListener('resize', rs);
    (function loop() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) { const r = (80 + i * 90) * dpr + Math.sin(t / 70 + i) * 10 * dpr; ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, 7); ctx.strokeStyle = `rgba(199,164,90,${0.14 - i * 0.018})`; ctx.lineWidth = dpr; ctx.stroke(); }
      t++; requestAnimationFrame(loop);
    })();
  })();

  /* ---------- load ---------- */
  fetch('/api/sessions').then((r) => r.json()).then((data) => {
    sessions = Array.isArray(data) ? data : [];
    buildFilters(); render(); startCountdown();
  }).catch(() => { $('#sessGrid').innerHTML = '<p style="color:var(--muted)">Could not load sessions. Is the server running?</p>'; });

  function buildFilters() {
    const cats = [...new Set(sessions.map((s) => s.category))];
    $('#catChips').innerHTML = `<button class="chip active" data-cat="all">All sessions</button>` + cats.map((c) => `<button class="chip" data-cat="${c}">${c}</button>`).join('');
    $$('#catChips .chip').forEach((b) => b.addEventListener('click', () => { $$('#catChips .chip').forEach((x) => x.classList.remove('active')); b.classList.add('active'); filter.cat = b.dataset.cat; render(); }));
    const insts = [...new Set(sessions.map((s) => s.instructor))];
    $('#fInstructor').innerHTML = `<option value="">All instructors</option>` + insts.map((i) => `<option>${i}</option>`).join('');
    $('#fInstructor').addEventListener('change', (e) => { filter.instructor = e.target.value; render(); });
    $('#fAvail').addEventListener('change', (e) => { filter.avail = e.target.value; render(); });
    $$('.view-toggle button').forEach((b) => b.addEventListener('click', () => { $$('.view-toggle button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); view = b.dataset.view; render(); }));
  }

  const filtered = () => sessions.filter((s) =>
    (filter.cat === 'all' || s.category === filter.cat) &&
    (!filter.instructor || s.instructor === filter.instructor) &&
    (filter.avail !== 'open' || s.remaining > 0));

  function render() {
    const grid = $('#sessGrid'), cal = $('#calView');
    const list = filtered();
    if (view === 'list') {
      grid.style.display = ''; cal.style.display = 'none';
      grid.innerHTML = list.length ? list.map(card).join('') : '<p style="color:var(--muted)">No sessions match your filters.</p>';
    } else {
      grid.style.display = 'none'; cal.style.display = 'block';
      const days = {}; list.forEach((s) => { (days[s.date] = days[s.date] || []).push(s); });
      cal.innerHTML = Object.keys(days).sort().map((d) => `<div class="cal-day"><h4>${fmtLong(d)}</h4>${days[d].map((s) => `
        <div class="cal-row" data-book="${s.id}"><div class="t">${fmtTime(s.time)}</div><div class="info"><b>${s.title}</b><span>${s.category} · ${s.instructor} · ${s.duration}</span></div>
        <div style="text-align:right"><div class="sess-price">AED ${s.price}</div><div class="seat-txt ${s.remaining <= 3 ? 'low' : ''}" style="margin:0">${s.soldOut ? 'Sold out' : s.remaining + ' seats left'}</div></div></div>`).join('')}</div>`).join('') || '<p style="color:var(--muted)">No sessions match your filters.</p>';
    }
    $$('[data-book]').forEach((el) => el.addEventListener('click', () => openBooking(el.dataset.book)));
  }

  function card(s) {
    const pct = Math.round((s.booked / s.maxSeats) * 100);
    const low = s.remaining <= 3 && s.remaining > 0;
    const cover = s.coverImage ? `<img src="${s.coverImage}" alt="">` : `<div style="position:absolute;inset:0;background:${catGrad(s.category)};display:grid;place-items:center">${ringSvg}</div>`;
    return `<article class="sess-card">
      <div class="sess-cover" style="background:${catGrad(s.category)}">${cover}<span class="cat">${s.category}</span>${s.featured ? '<span class="feat">Featured</span>' : ''}</div>
      <div class="sess-body">
        <div class="sess-when"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> ${fmtDate(s.date)} · ${fmtTime(s.time)}</div>
        <h3>${s.title}</h3>
        <p class="desc">${s.description || ''}</p>
        <div class="sess-meta">
          <span><svg width="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> ${s.duration}</span>
          <span><svg width="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg> ${s.instructor}</span>
          ${s.difficulty ? `<span><svg width="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg> ${s.difficulty}</span>` : ''}
        </div>
        <div class="seatbar"><i style="width:${pct}%"></i></div>
        <div class="seat-txt ${low ? 'low' : ''}">${s.soldOut ? 'Sold out — join the waiting list' : (low ? `Only ${s.remaining} seats left` : `${s.remaining} of ${s.maxSeats} seats available`)}</div>
        <div class="sess-foot">
          <div class="sess-price">AED ${s.price} <small>/ person</small></div>
          <button class="btn ${s.soldOut ? 'btn-ghost' : ''}" data-book="${s.id}"><span>${s.soldOut ? 'Waiting list' : 'Reserve'}</span></button>
        </div>
      </div>
    </article>`;
  }

  /* ---------- countdown ---------- */
  function startCountdown() {
    const up = sessions.filter((s) => new Date(`${s.date}T${s.time}`) > new Date()).sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))[0];
    if (!up) return;
    const cd = $('#countdown'); cd.style.display = 'inline-flex';
    const target = new Date(`${up.date}T${up.time}`);
    const tick = () => {
      let diff = Math.max(0, target - new Date()); const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5; const m = Math.floor(diff / 6e4); const s = Math.floor((diff - m * 6e4) / 1000);
      $('#cd-d').textContent = d; $('#cd-h').textContent = pad(h); $('#cd-m').textContent = pad(m); $('#cd-s').textContent = pad(s);
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- testimonials ---------- */
  fetch('/api/session-reviews').then((r) => r.json()).then((rev) => {
    const track = $('#revTrack'); if (!track) return;
    const items = (rev && rev.length) ? rev : [
      { name: 'Hana', rating: 5, text: 'I left the sound bath feeling like months of tension had melted away.' },
      { name: 'Yousef', rating: 5, text: 'The breathwork moved something I did not know I was holding. Profound.' },
      { name: 'Reem', rating: 5, text: 'The calmest, most beautifully held space in the city.' },
    ];
    track.innerHTML = items.map((r) => `<div class="t-card"><span class="stars">${'★'.repeat(r.rating)}</span><blockquote>"${r.text}"</blockquote><div class="who"><span class="av">${(r.name || '?')[0]}</span><div><b>${r.name}</b><span>Verified attendee</span></div></div></div>`).join('');
  }).catch(() => {});

  /* ---------- FAQ ---------- */
  $$('.fq button').forEach((b) => b.addEventListener('click', () => { const it = b.parentElement, a = it.querySelector('.a'); const o = it.classList.toggle('open'); a.style.maxHeight = o ? a.scrollHeight + 'px' : 0; }));

  /* ---------- booking modal ---------- */
  const modal = $('#modal'), mBody = $('#mBody'), mTitle = $('#mTitle');
  const openModal = () => { modal.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeModal = () => { modal.classList.remove('open'); document.body.style.overflow = ''; };
  $('#mClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  const money = (n) => 'AED ' + Math.round(n);
  const sessMini = (s) => `<div class="m-sess"><div class="mc" style="background:${catGrad(s.category)}">${ringSvg}</div><div><b>${s.title}</b><span>${fmtDate(s.date)} · ${fmtTime(s.time)} · ${s.duration}</span><span>${s.instructor} · ${s.location}</span></div></div>`;

  window.openBooking = (id) => {
    current = sessions.find((s) => s.id === id); if (!current) return;
    current.soldOut ? waitlistStep() : bookingStep();
    openModal();
  };

  function bookingStep() {
    const s = current; let qty = 1, discount = 0, code = '';
    mTitle.textContent = 'Reserve your spot';
    const totalsHTML = () => `<div class="totals"><div><span>${money(s.price)} × <span id="qn">${qty}</span></span><span id="sub">${money(s.price * qty)}</span></div>${discount ? `<div style="color:var(--clay)"><span>Discount (${code})</span><span>−${money(discount)}</span></div>` : ''}<div class="g"><span>Total</span><span id="tot">${money(s.price * qty - discount)}</span></div></div>`;
    const rebuildTotals = () => { $('#totalsWrap').innerHTML = totalsHTML(); };
    mBody.innerHTML = `
      ${sessMini(s)}
      <div class="qtybox"><span>Tickets</span><div class="q"><button id="qMinus">−</button><b id="qVal">1</b><button id="qPlus">+</button></div></div>
      <div class="field"><label>Full name</label><input id="bName" placeholder="Your name" required></div>
      <div class="frow"><div class="field"><label>Email</label><input id="bEmail" type="email" placeholder="you@email.com" required></div><div class="field"><label>Phone</label><input id="bPhone" placeholder="+971 ..." required></div></div>
      <div class="field"><label>Discount code (optional)</label><div class="disc"><input id="bCode" placeholder="CALM10"><button class="btn btn-ghost" id="applyCode" style="padding:.6em 1.2em"><span>Apply</span></button></div></div>
      <div id="totalsWrap">${totalsHTML()}</div>
      <div class="pay-methods"><div class="pm">💳 Card</div><div class="pm"> Apple Pay</div><div class="pm">G Pay</div></div>
      <button class="btn" id="payBtn" style="width:100%;justify-content:center"><span>Pay &amp; reserve — <span id="payAmt">${money(s.price)}</span></span></button>
      <p class="pay-note">Demo checkout — no card is charged. In production this connects to Stripe (cards, Apple Pay &amp; Google Pay).</p>`;
    const sync = () => { $('#qVal').textContent = qty; $('#qMinus').disabled = qty <= 1; $('#qPlus').disabled = qty >= s.remaining; rebuildTotals(); $('#payAmt').textContent = money(s.price * qty - discount); };
    $('#qPlus').onclick = () => { if (qty < s.remaining) { qty++; if (discount && code) reapply(); sync(); } };
    $('#qMinus').onclick = () => { if (qty > 1) { qty--; if (discount && code) reapply(); sync(); } };
    async function reapply() { try { const r = await fetch('/api/discounts/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, subtotal: s.price * qty }) }); const d = await r.json(); discount = r.ok ? d.discount : 0; } catch { discount = 0; } }
    $('#applyCode').onclick = async () => {
      const c = $('#bCode').value.trim(); if (!c) return;
      const r = await fetch('/api/discounts/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c, subtotal: s.price * qty }) });
      const d = await r.json();
      if (r.ok) { discount = d.discount; code = d.code; $('#applyCode').innerHTML = '<span>✓ Applied</span>'; } else { discount = 0; code = ''; $('#applyCode').innerHTML = '<span>Invalid</span>'; }
      sync();
    };
    $('#payBtn').onclick = async () => {
      const name = $('#bName').value.trim(), email = $('#bEmail').value.trim(), phone = $('#bPhone').value.trim();
      if (!name || !email || !phone) { alert('Please complete your details.'); return; }
      const btn = $('#payBtn'); btn.disabled = true; btn.querySelector('span').textContent = 'Reserving…';
      try {
        const r = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: s.id, quantity: qty, discountCode: code, customer: { name, email, phone } }) });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Booking failed');
        try { const em = JSON.parse(localStorage.getItem('hz_emails') || '[]'); if (!em.includes(email)) { em.push(email); localStorage.setItem('hz_emails', JSON.stringify(em)); } localStorage.setItem('hz_last_email', email); } catch {}
        confirmStep(data.booking);
      } catch (err) { btn.disabled = false; btn.querySelector('span').textContent = 'Try again'; alert(err.message); }
    };
    sync();
  }

  function confirmStep(b) {
    mTitle.textContent = 'You\'re booked';
    const url = `${location.origin}/ticket.html?id=${b.id}`;
    let qr = ''; try { qr = QR.svg(url, { scale: 5, margin: 2, dark: '#14181A' }); } catch { qr = '<div style="padding:2rem;color:var(--muted)">' + b.number + '</div>'; }
    mBody.innerHTML = `<div class="confirm-box">
      <div class="ring"><svg width="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="m7 12 3.5 3.5L17 9"/></svg></div>
      <h3>Your place is saved.</h3>
      <p style="color:var(--muted)">A confirmation and ticket have been recorded for <b>${b.customer.email}</b>.</p>
      <div class="num">Booking ${b.number}</div>
      <div class="qr">${qr}</div>
      <p style="font-size:.82rem;color:var(--muted)">${b.sessionTitle} · ${fmtDate(b.date)} at ${fmtTime(b.time)}</p>
      <div class="cal-btns">
        <a href="${gcalLink(b)}" target="_blank" rel="noopener">＋ Google Calendar</a>
        <button id="icsBtn">＋ Apple / Outlook</button>
      </div>
      <a class="btn" href="ticket.html?id=${b.id}" style="width:100%;justify-content:center;margin-bottom:.7rem"><span>View &amp; download ticket</span></a>
      <button class="btn btn-ghost" id="doneBtn" style="width:100%;justify-content:center"><span>Done</span></button>
      <p class="pay-note">A confirmation email &amp; reminders would be sent here once an email service is connected.</p>
    </div>`;
    $('#icsBtn').onclick = () => { const blob = new Blob([icsFor(b)], { type: 'text/calendar' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${b.number}.ics`; a.click(); };
    $('#doneBtn').onclick = () => { closeModal(); fetch('/api/sessions').then((r) => r.json()).then((d) => { sessions = d; render(); }); };
  }

  function waitlistStep() {
    const s = current; mTitle.textContent = 'Join the waiting list';
    mBody.innerHTML = `${sessMini(s)}
      <p style="color:var(--muted);margin-bottom:1.2rem">This session is full. Leave your details and we'll move you in the moment a place opens.</p>
      <div class="field"><label>Full name</label><input id="wName" required></div>
      <div class="frow"><div class="field"><label>Email</label><input id="wEmail" type="email" required></div><div class="field"><label>Phone</label><input id="wPhone" required></div></div>
      <button class="btn" id="wlBtn" style="width:100%;justify-content:center"><span>Join waiting list</span></button>`;
    $('#wlBtn').onclick = async () => {
      const name = $('#wName').value.trim(), email = $('#wEmail').value.trim(), phone = $('#wPhone').value.trim();
      if (!name || !email || !phone) { alert('Please complete your details.'); return; }
      await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: s.id, name, email, phone }) });
      mBody.innerHTML = `<div class="confirm-box"><div class="ring"><svg width="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="m7 12 3.5 3.5L17 9"/></svg></div><h3>You're on the list.</h3><p style="color:var(--muted)">We'll be in touch if a place opens for ${s.title}.</p><button class="btn" id="doneBtn2" style="margin-top:1.4rem"><span>Close</span></button></div>`;
      $('#doneBtn2').onclick = closeModal;
    };
  }

  /* ---------- calendar helpers ---------- */
  function icsFor(b) {
    const [y, mo, d] = b.date.split('-').map(Number); const [h, mi] = b.time.split(':').map(Number);
    const start = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(mi)}00`;
    const e = new Date(y, mo - 1, d, h, mi + durMin(b.duration));
    const end = `${e.getFullYear()}${pad(e.getMonth() + 1)}${pad(e.getDate())}T${pad(e.getHours())}${pad(e.getMinutes())}00`;
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//432Hz//Healing//EN', 'BEGIN:VEVENT', `UID:${b.id}@432hz.ae`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${b.sessionTitle}`, `LOCATION:${b.location}`, `DESCRIPTION:432Hz Healing Session — booking ${b.number}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function gcalLink(b) {
    const [y, mo, d] = b.date.split('-').map(Number); const [h, mi] = b.time.split(':').map(Number);
    const start = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(mi)}00`;
    const e = new Date(y, mo - 1, d, h, mi + durMin(b.duration));
    const end = `${e.getFullYear()}${pad(e.getMonth() + 1)}${pad(e.getDate())}T${pad(e.getHours())}${pad(e.getMinutes())}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(b.sessionTitle)}&dates=${start}/${end}&location=${encodeURIComponent(b.location)}&details=${encodeURIComponent('432Hz Healing — booking ' + b.number)}`;
  }
})();
