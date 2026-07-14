/* =====================================================================
   432Hz — shared booking modal (used by session detail page)
   Requires: #modal, #mBody, #mTitle, #mClose in the DOM; qrcode.js loaded.
   Exposes: window.BookingModal.open(session, { onClose })
   ===================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, '0');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fmtDate = (d) => { const [y, m, dd] = d.split('-').map(Number); const dt = new Date(y, m - 1, dd); return `${DOW[dt.getDay()]}, ${dd} ${MON[m - 1]}`; };
  const fmtTime = (t) => { let [h, mi] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}${mi ? ':' + pad(mi) : ''} ${ap}`; };
  const durMin = (s) => { const m = /(\d+)/.exec(s || ''); return m ? +m[1] : 60; };
  const catGrad = (c) => ({
    'Sound Healing': 'linear-gradient(150deg,#4a5d6b,#1c272e)', 'Breathwork': 'linear-gradient(150deg,#3a4a3e,#1d261f)',
    'Nervous System Regulation': 'linear-gradient(150deg,#6e5235,#2a2018)', 'Guided Meditation': 'linear-gradient(150deg,#7d6a44,#2c2616)',
    'Emotional Release': 'linear-gradient(150deg,#7a4a4a,#2a1818)', 'Stress Recovery': 'linear-gradient(150deg,#4a6b5d,#182a24)',
    'Group Healing': 'linear-gradient(150deg,#5a4a6b,#1e1828)', 'Deep Healing Sessions': 'linear-gradient(150deg,#3a4a3e,#1d261f)',
  }[c] || 'linear-gradient(150deg,#3a4a3e,#1d261f)');
  const ring = '<svg width="40%" viewBox="0 0 100 100" fill="none" stroke="rgba(223,199,142,.6)" stroke-width="1.4"><circle cx="50" cy="50" r="14"/><circle cx="50" cy="50" r="26" opacity=".6"/><circle cx="50" cy="50" r="38" opacity=".3"/></svg>';
  const money = (n) => 'AED ' + Math.round(n);

  const modal = $('#modal'), mBody = $('#mBody'), mTitle = $('#mTitle');
  let onCloseCb = null;
  let stripeEnabled = false;
  fetch('/api/stripe/config').then((r) => r.json()).then((c) => { stripeEnabled = !!c.enabled; }).catch(() => {});
  const open = () => { modal.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const close = () => { modal.classList.remove('open'); document.body.style.overflow = ''; if (onCloseCb) onCloseCb(); };
  if ($('#mClose')) $('#mClose').addEventListener('click', close);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });

  const sessMini = (s) => `<div class="m-sess"><div class="mc" style="background:${catGrad(s.category)}">${ring}</div><div><b>${s.title}</b><span>${fmtDate(s.date)} · ${fmtTime(s.time)} · ${s.duration}</span><span>${s.instructor} · ${s.location}</span></div></div>`;

  function bookingStep(s) {
    let qty = 1, discount = 0, code = '';
    mTitle.textContent = 'Reserve your spot';
    const totalsHTML = () => `<div class="totals"><div><span>${money(s.price)} × <span>${qty}</span></span><span>${money(s.price * qty)}</span></div>${discount ? `<div style="color:var(--clay)"><span>Discount (${code})</span><span>−${money(discount)}</span></div>` : ''}<div class="g"><span>Total</span><span>${money(s.price * qty - discount)}</span></div></div>`;
    mBody.innerHTML = `
      ${sessMini(s)}
      <div class="qtybox"><span>Tickets</span><div class="q"><button id="qMinus">−</button><b id="qVal">1</b><button id="qPlus">+</button></div></div>
      <div class="field"><label>Full name</label><input id="bName" placeholder="Your name" required></div>
      <div class="frow"><div class="field"><label>Email</label><input id="bEmail" type="email" placeholder="you@email.com" required></div><div class="field"><label>Phone</label><input id="bPhone" placeholder="+971 ..." required></div></div>
      <div class="field"><label>Discount code (optional)</label><div class="disc"><input id="bCode" placeholder="CALM10"><button class="btn btn-ghost" id="applyCode" style="padding:.6em 1.2em"><span>Apply</span></button></div></div>
      <div id="totalsWrap">${totalsHTML()}</div>
      <div class="pay-methods"><div class="pm">💳 Card</div><div class="pm"> Apple Pay</div><div class="pm">G Pay</div></div>
      <button class="btn" id="payBtn" style="width:100%;justify-content:center"><span>Pay &amp; reserve — <span id="payAmt">${money(s.price)}</span></span></button>
      <p class="pay-note">${stripeEnabled ? 'Secure payment by Stripe — cards, Apple Pay &amp; Google Pay.' : 'Demo checkout — no card is charged.'}</p>`;
    const rebuild = () => { $('#totalsWrap').innerHTML = totalsHTML(); $('#payAmt').textContent = money(s.price * qty - discount); };
    const sync = () => { $('#qVal').textContent = qty; $('#qMinus').disabled = qty <= 1; $('#qPlus').disabled = qty >= s.remaining; rebuild(); };
    async function reapply() { try { const r = await fetch('/api/discounts/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, subtotal: s.price * qty }) }); const d = await r.json(); discount = r.ok ? d.discount : 0; } catch { discount = 0; } }
    $('#qPlus').onclick = async () => { if (qty < s.remaining) { qty++; if (code) await reapply(); sync(); } };
    $('#qMinus').onclick = async () => { if (qty > 1) { qty--; if (code) await reapply(); sync(); } };
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
      const btn = $('#payBtn'); btn.disabled = true;
      btn.querySelector('span').textContent = stripeEnabled ? 'Redirecting to secure payment…' : 'Reserving…';
      try { localStorage.setItem('hz_last_email', email); } catch {}
      try {
        if (stripeEnabled) {
          const r = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'booking', payload: { sessionId: s.id, quantity: qty, discountCode: code, customer: { name, email, phone } }, cancelUrl: location.href.split('?')[0] + (location.search ? location.search : '') }) });
          const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Payment setup failed');
          location.href = data.url;
          return;
        }
        const r = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: s.id, quantity: qty, discountCode: code, customer: { name, email, phone } }) });
        const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Booking failed');
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
      <div class="cal-btns"><a href="${gcal(b)}" target="_blank" rel="noopener">＋ Google Calendar</a><button id="icsBtn">＋ Apple / Outlook</button></div>
      <a class="btn" href="ticket.html?id=${b.id}" style="width:100%;justify-content:center;margin-bottom:.7rem"><span>View &amp; download ticket</span></a>
      <button class="btn btn-ghost" id="doneBtn" style="width:100%;justify-content:center"><span>Done</span></button>
      <p class="pay-note">A confirmation email &amp; reminders would be sent here once an email service is connected.</p>
    </div>`;
    $('#icsBtn').onclick = () => { const blob = new Blob([ics(b)], { type: 'text/calendar' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${b.number}.ics`; a.click(); };
    $('#doneBtn').onclick = close;
  }

  function waitlistStep(s) {
    mTitle.textContent = 'Join the waiting list';
    mBody.innerHTML = `${sessMini(s)}
      <p style="color:var(--muted);margin-bottom:1.2rem">This session is full. Leave your details and we'll move you in the moment a place opens.</p>
      <div class="field"><label>Full name</label><input id="wName" required></div>
      <div class="frow"><div class="field"><label>Email</label><input id="wEmail" type="email" required></div><div class="field"><label>Phone</label><input id="wPhone" required></div></div>
      <button class="btn" id="wlBtn" style="width:100%;justify-content:center"><span>Join waiting list</span></button>`;
    $('#wlBtn').onclick = async () => {
      const name = $('#wName').value.trim(), email = $('#wEmail').value.trim(), phone = $('#wPhone').value.trim();
      if (!name || !email || !phone) { alert('Please complete your details.'); return; }
      await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: s.id, name, email, phone }) });
      mBody.innerHTML = `<div class="confirm-box"><div class="ring"><svg width="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10" opacity=".3"/><path d="m7 12 3.5 3.5L17 9"/></svg></div><h3>You're on the list.</h3><p style="color:var(--muted)">We'll be in touch if a place opens.</p><button class="btn" id="doneBtn2" style="margin-top:1.4rem"><span>Close</span></button></div>`;
      $('#doneBtn2').onclick = close;
    };
  }

  function ics(b) { const [y, mo, d] = b.date.split('-').map(Number); const [h, mi] = b.time.split(':').map(Number); const start = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(mi)}00`; const e = new Date(y, mo - 1, d, h, mi + durMin(b.duration)); const end = `${e.getFullYear()}${pad(e.getMonth() + 1)}${pad(e.getDate())}T${pad(e.getHours())}${pad(e.getMinutes())}00`; return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//432Hz//Healing//EN', 'BEGIN:VEVENT', `UID:${b.id}@432hz.ae`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${b.sessionTitle}`, `LOCATION:${b.location}`, `DESCRIPTION:432Hz Healing — ${b.number}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'); }
  function gcal(b) { const [y, mo, d] = b.date.split('-').map(Number); const [h, mi] = b.time.split(':').map(Number); const start = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(mi)}00`; const e = new Date(y, mo - 1, d, h, mi + durMin(b.duration)); const end = `${e.getFullYear()}${pad(e.getMonth() + 1)}${pad(e.getDate())}T${pad(e.getHours())}${pad(e.getMinutes())}00`; return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(b.sessionTitle)}&dates=${start}/${end}&location=${encodeURIComponent(b.location)}`; }

  window.BookingModal = {
    open(session, opts) { onCloseCb = (opts && opts.onClose) || null; (session.soldOut ? waitlistStep : bookingStep)(session); open(); },
  };
})();
