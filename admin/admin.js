// =====================================================================
// 432Hz Admin — SPA logic (vanilla)
// =====================================================================
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const money = (n) => 'Dhs. ' + Math.round(+n || 0).toLocaleString();
  const since = (t) => { const d = (Date.now() - t) / 864e5; if (d < 1) return 'Today'; if (d < 2) return 'Yesterday'; return Math.floor(d) + ' days ago'; };

  // ---------- API ----------
  async function api(method, path, body) {
    const opt = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    const r = await fetch('/api/' + path, opt);
    if (r.status === 401 && path !== 'login') { showLogin(); throw new Error('unauthorized'); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ---------- toast ----------
  let tt;
  const toast = (msg) => { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2500); };

  // ---------- auth ----------
  const showLogin = () => { $('#app').classList.remove('show'); $('#loginWrap').style.display = 'grid'; };
  const showApp = () => { $('#loginWrap').style.display = 'none'; $('#app').classList.add('show'); route('dashboard'); };

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginErr').textContent = '';
    try { await api('POST', 'login', { password: $('#pw').value }); $('#pw').value = ''; showApp(); }
    catch (err) { $('#loginErr').textContent = err.message; }
  });
  $('#logoutBtn').addEventListener('click', async (e) => { e.preventDefault(); await api('POST', 'logout'); showLogin(); });

  // ---------- drawer ----------
  const drawer = $('#drawer'), dOverlay = $('#drawerOverlay');
  const openDrawer = (title, bodyHTML, footHTML) => {
    $('#drawerTitle').textContent = title; $('#drawerBody').innerHTML = bodyHTML; $('#drawerFoot').innerHTML = footHTML || '';
    drawer.classList.add('open'); dOverlay.classList.add('open');
  };
  const closeDrawer = () => { drawer.classList.remove('open'); dOverlay.classList.remove('open'); };
  $('#drawerClose').addEventListener('click', closeDrawer);
  dOverlay.addEventListener('click', closeDrawer);

  // ---------- mobile sidebar ----------
  $('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

  // ---------- router ----------
  const TITLES = {
    dashboard: ['Dashboard', 'An overview of your store'],
    products: ['Products', 'Create, edit and organise your catalogue'],
    orders: ['Orders', 'Track and fulfil customer orders'],
    customers: ['Customers', 'Everyone who has ordered from you'],
    sessions: ['Healing Sessions', 'Create sessions and manage seats & waitlists'],
    bookings: ['Session Bookings', 'Tickets, check-in, attendance & refunds'],
    insights: ['Analytics', 'Tickets, revenue, occupancy & attendance'],
    settings: ['Settings', 'Store details and shipping'],
  };
  function route(view) {
    $$('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === view));
    $('#viewTitle').textContent = TITLES[view][0];
    $('#viewSub').textContent = TITLES[view][1];
    $('#topActions').innerHTML = view === 'products'
      ? '<button class="btn gold" id="addProduct">+ Add product</button>'
      : view === 'sessions' ? '<button class="btn gold" id="addSession">+ New session</button>' : '';
    if (view === 'products') $('#addProduct').addEventListener('click', () => openProductEditor(null));
    if (view === 'sessions') $('#addSession').addEventListener('click', () => openSessionEditor(null));
    $('#sidebar').classList.remove('open');
    ({ dashboard: renderDashboard, products: renderProducts, orders: renderOrders, customers: renderCustomers, sessions: renderSessions, bookings: renderBookings, insights: renderInsights, settings: renderSettings }[view])();
  }
  $$('.nav-item').forEach((n) => n.addEventListener('click', () => route(n.dataset.view)));

  // ================= DASHBOARD =================
  async function renderDashboard() {
    const v = $('#view'); v.innerHTML = '<div class="empty">Loading…</div>';
    const s = await api('GET', 'stats');
    const card = (ic, lbl, num) => `<div class="stat-card"><div class="ic">${ic}</div><div class="lbl">${lbl}</div><div class="num">${num}</div></div>`;
    v.innerHTML = `
      <div class="stat-grid">
        ${card('<svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', 'Revenue', money(s.revenue))}
        ${card('<svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2h9l4 4v16H6z"/><path d="M9 7h6M9 11h6"/></svg>', 'Orders', s.orders)}
        ${card('<svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>', 'Pending', s.pending)}
        ${card('<svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8 12 3l9 5-9 5-9-5Z"/><path d="m3 8 0 8 9 5 9-5V8"/></svg>', 'Products', s.products)}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Recent orders</h2><button class="btn ghost sm" id="goOrders">View all</button></div>
        <div class="table-wrap">
          <table class="table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th class="right">Total</th><th>Status</th></tr></thead>
          <tbody>${s.recent.length ? s.recent.map((o) => `
            <tr class="row-click" data-order="${o.id}"><td><b>${o.number}</b></td><td>${esc(o.customer.name) || '<span class="muted">—</span>'}</td><td class="muted">${since(o.createdAt)}</td><td class="right">${money(o.total)}</td><td>${statusBadge(o.status)}</td></tr>`).join('')
            : '<tr><td colspan="5" class="empty">No orders yet. They\'ll appear here after checkout.</td></tr>'}</tbody></table>
        </div>
      </div>${s.lowStock ? `<p class="muted" style="margin-top:1rem">⚠ ${s.lowStock} product${s.lowStock > 1 ? 's' : ''} low on stock (≤5).</p>` : ''}`;
    $('#goOrders').addEventListener('click', () => route('orders'));
    $$('[data-order]', v).forEach((r) => r.addEventListener('click', () => openOrder(r.dataset.order)));
  }

  // ================= PRODUCTS =================
  let products = [];
  async function renderProducts() {
    const v = $('#view'); v.innerHTML = '<div class="empty">Loading…</div>';
    products = await api('GET', 'products');
    v.innerHTML = `<div class="panel"><div class="table-wrap"><table class="table">
      <thead><tr><th>Product</th><th>Category</th><th class="right">Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
      <tbody>${products.map(productRow).join('')}</tbody></table></div></div>`;
    $$('[data-edit]', v).forEach((b) => b.addEventListener('click', () => openProductEditor(products.find((p) => p.id === b.dataset.edit))));
    $$('[data-del]', v).forEach((b) => b.addEventListener('click', () => deleteProduct(b.dataset.del)));
  }
  function productRow(p) {
    const img = p.images && p.images[0];
    const low = p.stock <= 5;
    return `<tr>
      <td><div class="cell-prod"><div class="thumb">${img ? `<img src="../${img}" alt="">` : ''}</div><div><b>${esc(p.name)}</b><small>${p.reviews} reviews · ${p.rating}★</small></div></div></td>
      <td class="muted">${esc(p.category)}</td>
      <td class="right">${money(p.price)}</td>
      <td><span class="stock-pill ${low ? 'low' : ''}">${p.stock}</span></td>
      <td><span class="badge b-${p.status}">${p.status}</span></td>
      <td class="right" style="white-space:nowrap"><button class="btn ghost sm" data-edit="${p.id}">Edit</button> <button class="btn danger sm" data-del="${p.id}">Delete</button></td>
    </tr>`;
  }
  async function deleteProduct(id) {
    const p = products.find((x) => x.id === id);
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await api('DELETE', 'products/' + id); toast('Product deleted'); renderProducts();
  }

  let editImages = [];
  function openProductEditor(p) {
    const isNew = !p;
    editImages = p ? [...(p.images || [])] : [];
    const cats = ['Intention Kits', 'Luxury Scents', 'Healing Crystals', 'Accessories'];
    const body = `
      <div class="field"><label>Product name</label><input id="f-name" value="${esc(p?.name || '')}" placeholder="The Abundance Ritual"></div>
      <div class="field"><label>Description</label><textarea id="f-desc" rows="3" placeholder="A ritual set designed to…">${esc(p?.description || '')}</textarea></div>
      <div class="field-row">
        <div class="field"><label>Category</label><select id="f-cat">${cats.map((c) => `<option ${p?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><select id="f-status"><option value="active" ${p?.status !== 'draft' ? 'selected' : ''}>Active</option><option value="draft" ${p?.status === 'draft' ? 'selected' : ''}>Draft</option></select></div>
      </div>
      <div class="field-row-3">
        <div class="field"><label>Price (AED)</label><input id="f-price" type="number" value="${p?.price ?? ''}" placeholder="349"></div>
        <div class="field"><label>Compare-at</label><input id="f-compare" type="number" value="${p?.compareAt ?? ''}" placeholder="420"></div>
        <div class="field"><label>Stock</label><input id="f-stock" type="number" value="${p?.stock ?? ''}" placeholder="12"></div>
      </div>
      <div class="field-row-3">
        <div class="field"><label>Badge</label><input id="f-badge" value="${esc(p?.badge || '')}" placeholder="Bestseller"></div>
        <div class="field"><label>Rating</label><input id="f-rating" type="number" step="0.1" value="${p?.rating ?? '5.0'}"></div>
        <div class="field"><label>Reviews</label><input id="f-reviews" type="number" value="${p?.reviews ?? '0'}"></div>
      </div>
      <div class="field"><label>Images</label><div id="imgGrid"></div>
        <input type="file" id="fileInput" accept="image/*" multiple hidden>
        <div class="dropzone" id="dropzone">＋ Click to upload images (JPG, PNG, WEBP)</div>
      </div>`;
    const foot = `<button class="btn ghost" id="cancelEdit">Cancel</button><button class="btn gold" id="saveProduct">${isNew ? 'Create product' : 'Save changes'}</button>`;
    openDrawer(isNew ? 'New product' : 'Edit product', body, foot);
    renderEditImages();
    $('#dropzone').addEventListener('click', () => $('#fileInput').click());
    $('#fileInput').addEventListener('change', handleFiles);
    $('#cancelEdit').addEventListener('click', closeDrawer);
    $('#saveProduct').addEventListener('click', () => saveProduct(p?.id));
  }
  function renderEditImages() {
    const g = $('#imgGrid'); if (!g) return;
    g.className = 'img-grid';
    g.innerHTML = editImages.map((url, i) => `<div class="img-cell"><img src="../${url}" alt=""><button class="del" data-i="${i}">✕</button></div>`).join('') || '';
    $$('.del', g).forEach((b) => b.addEventListener('click', () => { editImages.splice(+b.dataset.i, 1); renderEditImages(); }));
  }
  async function handleFiles(e) {
    const files = [...e.target.files];
    for (const f of files) {
      try {
        const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(f); });
        const { url } = await api('POST', 'upload', { filename: f.name, dataUrl });
        editImages.push(url); renderEditImages();
      } catch (err) { toast('Upload failed: ' + err.message); }
    }
    e.target.value = '';
  }
  async function saveProduct(id) {
    const payload = {
      name: $('#f-name').value.trim(), description: $('#f-desc').value.trim(),
      category: $('#f-cat').value, status: $('#f-status').value,
      price: +$('#f-price').value || 0, compareAt: $('#f-compare').value ? +$('#f-compare').value : null,
      stock: +$('#f-stock').value || 0, badge: $('#f-badge').value.trim(),
      rating: +$('#f-rating').value || 5, reviews: +$('#f-reviews').value || 0, images: editImages,
    };
    if (!payload.name) return toast('Name is required');
    try {
      if (id) await api('PUT', 'products/' + id, payload);
      else await api('POST', 'products', payload);
      toast(id ? 'Product saved' : 'Product created'); closeDrawer(); renderProducts();
    } catch (err) { toast(err.message); }
  }

  // ================= ORDERS =================
  const ORDER_STATUSES = ['pending', 'paid', 'fulfilled', 'cancelled'];
  function statusBadge(s) { return `<span class="badge b-${s}">${s}</span>`; }
  async function renderOrders() {
    const v = $('#view'); v.innerHTML = '<div class="empty">Loading…</div>';
    const orders = await api('GET', 'orders');
    v.innerHTML = orders.length ? `<div class="panel"><div class="table-wrap"><table class="table">
      <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Date</th><th class="right">Total</th><th>Status</th></tr></thead>
      <tbody>${orders.map((o) => `<tr class="row-click" data-order="${o.id}">
        <td><b>${o.number}</b></td>
        <td>${esc(o.customer.name) || '<span class="muted">—</span>'}<br><small class="muted">${esc(o.customer.email)}</small></td>
        <td class="muted">${o.items.reduce((n, i) => n + i.qty, 0)} item${o.items.length > 1 ? 's' : ''}</td>
        <td class="muted">${since(o.createdAt)}</td>
        <td class="right">${money(o.total)}</td>
        <td>${statusBadge(o.status)}</td></tr>`).join('')}</tbody></table></div></div>`
      : '<div class="panel"><div class="empty">No orders yet.<br>When a customer checks out on the storefront, the order appears here.</div></div>';
    $$('[data-order]', v).forEach((r) => r.addEventListener('click', () => openOrder(r.dataset.order)));
  }
  async function openOrder(id) {
    const o = await api('GET', 'orders/' + id);
    const body = `
      <div class="od-section"><h3>Status</h3>
        <select id="od-status" class="field" style="width:100%;padding:.8rem .95rem;border:1px solid var(--line);border-radius:10px;background:#fff">
          ${ORDER_STATUSES.map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
        </select></div>
      <div class="od-section"><h3>Items</h3>
        ${o.items.map((i) => `<div class="od-line"><span>${esc(i.name)} <span class="muted">× ${i.qty}</span></span><span>${money(i.price * i.qty)}</span></div>`).join('')}
        <div class="od-totals" style="margin-top:.8rem">
          <div><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
          <div><span>Shipping</span><span>${o.shipping === 0 ? 'Free' : money(o.shipping)}</span></div>
          <div class="grand"><span>Total</span><span>${money(o.total)}</span></div>
        </div></div>
      <div class="od-section od-cust"><h3>Customer</h3>
        <p><strong>${esc(o.customer.name) || '—'}</strong></p>
        <p class="muted">${esc(o.customer.email)} · ${esc(o.customer.phone)}</p>
        <p class="muted">${esc(o.customer.address)}, ${esc(o.customer.city)}, ${esc(o.customer.country)}</p>
        ${o.customer.note ? `<p class="muted">Note: ${esc(o.customer.note)}</p>` : ''}
      </div>`;
    openDrawer('Order ' + o.number, body, '<button class="btn ghost" id="odCancel">Close</button><button class="btn gold" id="odSave">Update status</button>');
    $('#odCancel').addEventListener('click', closeDrawer);
    $('#odSave').addEventListener('click', async () => {
      await api('PATCH', 'orders/' + id, { status: $('#od-status').value });
      toast('Order updated'); closeDrawer(); route('orders');
    });
  }

  // ================= CUSTOMERS =================
  let customerCache = [];
  function buildCustomers(orders) {
    const map = new Map();
    orders.forEach((o) => {
      const key = (o.customer.email || o.customer.name || 'unknown').toLowerCase();
      if (!map.has(key)) map.set(key, { name: o.customer.name, email: o.customer.email, phone: o.customer.phone, city: o.customer.city, country: o.customer.country, orders: [], spent: 0, last: 0 });
      const c = map.get(key);
      c.orders.push(o);
      if (o.status !== 'cancelled') c.spent += o.total;
      c.last = Math.max(c.last, o.createdAt);
      if (!c.name && o.customer.name) c.name = o.customer.name;
      if (!c.phone && o.customer.phone) c.phone = o.customer.phone;
    });
    return [...map.values()].sort((a, b) => b.last - a.last);
  }
  async function renderCustomers() {
    const v = $('#view'); v.innerHTML = '<div class="empty">Loading…</div>';
    const orders = await api('GET', 'orders');
    customerCache = buildCustomers(orders);
    if (!customerCache.length) { v.innerHTML = '<div class="panel"><div class="empty">No customers yet.<br>They\'ll appear here automatically after their first order.</div></div>'; return; }
    v.innerHTML = `<div class="panel"><div class="table-wrap"><table class="table">
      <thead><tr><th>Customer</th><th>Location</th><th>Orders</th><th class="right">Total spent</th><th>Last order</th></tr></thead>
      <tbody>${customerCache.map((c, i) => `<tr class="row-click" data-cust="${i}">
        <td><div class="cell-prod"><div class="thumb" style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--clay));color:var(--pine);font-family:var(--display);font-weight:600;display:grid;place-items:center">${esc((c.name || '?')[0].toUpperCase())}</div><div><b>${esc(c.name) || '<span class="muted">Guest</span>'}</b><small>${esc(c.email)}</small></div></div></td>
        <td class="muted">${esc([c.city, c.country].filter(Boolean).join(', ')) || '—'}</td>
        <td>${c.orders.length}</td>
        <td class="right">${money(c.spent)}</td>
        <td class="muted">${since(c.last)}</td></tr>`).join('')}</tbody></table></div></div>`;
    $$('[data-cust]', v).forEach((r) => r.addEventListener('click', () => openCustomer(+r.dataset.cust)));
  }
  function openCustomer(i) {
    const c = customerCache[i]; if (!c) return;
    const body = `
      <div class="od-section od-cust"><h3>Contact</h3>
        <p><strong>${esc(c.name) || 'Guest'}</strong></p>
        <p class="muted">${esc(c.email) || '—'}${c.phone ? ' · ' + esc(c.phone) : ''}</p>
        <p class="muted">${esc([c.city, c.country].filter(Boolean).join(', ')) || ''}</p>
      </div>
      <div class="od-section"><h3>Lifetime</h3>
        <div class="od-totals">
          <div><span>Orders</span><span>${c.orders.length}</span></div>
          <div class="grand"><span>Total spent</span><span>${money(c.spent)}</span></div>
        </div></div>
      <div class="od-section"><h3>Order history</h3>
        ${c.orders.map((o) => `<div class="od-line"><span><b>${o.number}</b> <span class="muted">· ${since(o.createdAt)}</span></span><span>${money(o.total)} ${statusBadge(o.status)}</span></div>`).join('')}
      </div>`;
    openDrawer(c.name || 'Customer', body, '<button class="btn ghost" id="custClose">Close</button>' + (c.email ? `<a class="btn gold" href="mailto:${esc(c.email)}">Email customer</a>` : ''));
    const cc = $('#custClose'); if (cc) cc.addEventListener('click', closeDrawer);
  }

  // ================= HEALING SESSIONS =================
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtD = (d) => { if (!d) return '—'; const [y, m, dd] = d.split('-').map(Number); return `${dd} ${MON[m - 1]} ${y}`; };
  const fmtT = (t) => { if (!t) return ''; let [h, mi] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}${mi ? ':' + String(mi).padStart(2, '0') : ''} ${ap}`; };
  const CATS = ['Nervous System Regulation', 'Deep Healing Sessions', 'Guided Meditation', 'Breathwork', 'Emotional Release', 'Stress Recovery', 'Group Healing', 'Sound Healing'];
  let sessionCache = [];

  async function renderSessions() {
    const v = $('#view'); v.innerHTML = '<div class="empty">Loading…</div>';
    sessionCache = await api('GET', 'sessions');
    v.innerHTML = `<div class="panel"><div class="table-wrap"><table class="table">
      <thead><tr><th>Session</th><th>When</th><th>Seats</th><th>Status</th><th></th></tr></thead>
      <tbody>${sessionCache.map(sessionRow).join('')}</tbody></table></div></div>`;
    $$('[data-edit-s]', v).forEach((b) => b.addEventListener('click', () => openSessionEditor(sessionCache.find((s) => s.id === b.dataset.editS))));
    $$('[data-dup]', v).forEach((b) => b.addEventListener('click', async () => { await api('POST', 'sessions/' + b.dataset.dup + '/duplicate'); toast('Session duplicated'); renderSessions(); }));
    $$('[data-pub]', v).forEach((b) => b.addEventListener('click', async () => { const s = sessionCache.find((x) => x.id === b.dataset.pub); await api('PUT', 'sessions/' + s.id, { status: s.status === 'published' ? 'draft' : 'published' }); renderSessions(); }));
    $$('[data-del-s]', v).forEach((b) => b.addEventListener('click', async () => { if (confirm('Delete this session?')) { await api('DELETE', 'sessions/' + b.dataset.delS); toast('Deleted'); renderSessions(); } }));
    $$('[data-csv]', v).forEach((b) => b.addEventListener('click', () => csvDownload(b.dataset.csv)));
  }
  function sessionRow(s) {
    const pct = Math.round(s.booked / s.maxSeats * 100);
    return `<tr>
      <td><b>${esc(s.title)}</b>${s.featured ? ' <span class="badge b-paid" style="margin-left:.3rem">Featured</span>' : ''}<small class="muted" style="display:block">${esc(s.category)} · ${esc(s.instructor)}</small></td>
      <td class="muted">${fmtD(s.date)}<br><small>${fmtT(s.time)} · ${esc(s.duration)}</small></td>
      <td><b>${s.booked}/${s.maxSeats}</b><div style="height:4px;background:var(--bone-deep);border-radius:4px;margin-top:4px;width:80px"><div style="height:100%;width:${pct}%;background:${s.soldOut ? 'var(--bad)' : 'var(--sage)'};border-radius:4px"></div></div></td>
      <td><span class="badge b-${s.status === 'published' ? 'active' : 'draft'}">${s.status}</span></td>
      <td class="right" style="white-space:nowrap">
        <button class="btn ghost sm" data-edit-s="${s.id}">Edit</button>
        <button class="btn ghost sm" data-pub="${s.id}">${s.status === 'published' ? 'Unpublish' : 'Publish'}</button>
        <button class="btn ghost sm" data-dup="${s.id}">Duplicate</button>
        <button class="btn ghost sm" data-csv="${s.id}">CSV</button>
        <button class="btn danger sm" data-del-s="${s.id}">Delete</button>
      </td></tr>`;
  }
  async function csvDownload(id) {
    const r = await fetch('/api/sessions/' + id + '/attendees', { credentials: 'same-origin' });
    const blob = await r.blob(); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'attendees.csv'; a.click();
  }
  function openSessionEditor(s) {
    const isNew = !s;
    const body = `
      <div class="field"><label>Title</label><input id="s-title" value="${esc(s?.title || '')}"></div>
      <div class="field"><label>Description</label><textarea id="s-desc" rows="2">${esc(s?.description || '')}</textarea></div>
      <div class="field-row"><div class="field"><label>Category</label><select id="s-cat">${CATS.map((c) => `<option ${s?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="field"><label>Instructor</label><input id="s-inst" value="${esc(s?.instructor || '')}"></div></div>
      <div class="field-row-3"><div class="field"><label>Date</label><input id="s-date" type="date" value="${s?.date || ''}"></div><div class="field"><label>Time</label><input id="s-time" type="time" value="${s?.time || ''}"></div><div class="field"><label>Duration</label><input id="s-dur" value="${esc(s?.duration || '')}" placeholder="60 min"></div></div>
      <div class="field-row-3"><div class="field"><label>Price (AED)</label><input id="s-price" type="number" value="${s?.price ?? ''}"></div><div class="field"><label>Max seats</label><input id="s-seats" type="number" value="${s?.maxSeats ?? ''}"></div><div class="field"><label>Difficulty</label><input id="s-diff" value="${esc(s?.difficulty || '')}" placeholder="All levels"></div></div>
      <div class="field"><label>Location</label><input id="s-loc" value="${esc(s?.location || '432Hz Studio, Dubai')}"></div>
      <div class="field-row"><div class="field"><label>What to bring</label><textarea id="s-bring" rows="2">${esc(s?.whatToBring || '')}</textarea></div><div class="field"><label>What to expect</label><textarea id="s-expect" rows="2">${esc(s?.whatToExpect || '')}</textarea></div></div>
      <div class="field-row"><div class="field"><label>Status</label><select id="s-status"><option value="published" ${s?.status !== 'draft' ? 'selected' : ''}>Published</option><option value="draft" ${s?.status === 'draft' ? 'selected' : ''}>Draft</option></select></div><div class="field"><label>Featured</label><select id="s-feat"><option value="no" ${!s?.featured ? 'selected' : ''}>No</option><option value="yes" ${s?.featured ? 'selected' : ''}>Yes</option></select></div></div>`;
    openDrawer(isNew ? 'New session' : 'Edit session', body, '<button class="btn ghost" id="sCancel">Cancel</button><button class="btn gold" id="sSave">' + (isNew ? 'Create' : 'Save') + '</button>');
    $('#sCancel').addEventListener('click', closeDrawer);
    $('#sSave').addEventListener('click', async () => {
      const payload = { title: $('#s-title').value.trim(), description: $('#s-desc').value.trim(), category: $('#s-cat').value, instructor: $('#s-inst').value.trim(), date: $('#s-date').value, time: $('#s-time').value, duration: $('#s-dur').value.trim(), price: +$('#s-price').value || 0, maxSeats: +$('#s-seats').value || 0, difficulty: $('#s-diff').value.trim(), location: $('#s-loc').value.trim(), whatToBring: $('#s-bring').value.trim(), whatToExpect: $('#s-expect').value.trim(), status: $('#s-status').value, featured: $('#s-feat').value === 'yes' };
      if (!payload.title) return toast('Title required');
      if (s) await api('PUT', 'sessions/' + s.id, payload); else await api('POST', 'sessions', payload);
      toast(s ? 'Saved' : 'Session created'); closeDrawer(); renderSessions();
    });
  }

  // ================= SESSION BOOKINGS =================
  let bkCache = [], wlCache = [];
  async function renderBookings() {
    const v = $('#view'); v.innerHTML = '<div class="empty">Loading…</div>';
    bkCache = await api('GET', 'bookings');
    wlCache = await api('GET', 'waitlist').catch(() => []);
    const sessOpts = [...new Set(bkCache.map((b) => b.sessionTitle))];
    const wlHTML = wlCache.length ? `<div class="panel" style="margin-bottom:1.4rem"><div class="panel-head"><h2>Waiting list (${wlCache.length})</h2></div><div class="table-wrap"><table class="table"><tbody>${wlCache.map((w) => { const s = sessionCache.find((x) => x.id === w.sessionId); return `<tr><td><b>${esc(w.name)}</b><small class="muted" style="display:block">${esc(w.email)} · ${esc(w.phone)}</small></td><td class="muted">${esc(s ? s.title : 'Session')}</td><td class="right"><button class="btn ghost sm" data-promote="${w.id}">Move to booking</button> <button class="btn danger sm" data-wldel="${w.id}">Remove</button></td></tr>`; }).join('')}</tbody></table></div></div>` : '';
    v.innerHTML = wlHTML + `
      <div style="display:flex;gap:.8rem;margin-bottom:1.2rem;flex-wrap:wrap">
        <input id="bkSearch" placeholder="Search name, email, or booking #" style="flex:1;min-width:200px;padding:.7rem 1rem;border:1px solid var(--line);border-radius:100px">
        <select id="bkSession" style="padding:.7rem 1rem;border:1px solid var(--line);border-radius:100px"><option value="">All sessions</option>${sessOpts.map((t) => `<option>${esc(t)}</option>`).join('')}</select>
        <select id="bkStatus" style="padding:.7rem 1rem;border:1px solid var(--line);border-radius:100px"><option value="">Any status</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option><option value="checked-in">Checked-in</option></select>
      </div>
      <div class="panel"><div class="table-wrap"><table class="table">
      <thead><tr><th>Booking</th><th>Session</th><th>Customer</th><th>Tickets</th><th>Paid</th><th>Status</th></tr></thead>
      <tbody id="bkBody"></tbody></table></div></div>`;
    const draw = () => {
      const q = $('#bkSearch').value.toLowerCase(), sf = $('#bkSession').value, st = $('#bkStatus').value;
      const rows = bkCache.filter((b) => {
        const match = !q || (b.customer.name + b.customer.email + b.number).toLowerCase().includes(q);
        const sm = !sf || b.sessionTitle === sf;
        const stm = !st || (st === 'checked-in' ? b.attendance === 'checked-in' : b.status === st);
        return match && sm && stm;
      });
      $('#bkBody').innerHTML = rows.length ? rows.map(bkRow).join('') : '<tr><td colspan="6" class="empty">No bookings.</td></tr>';
      $$('[data-bk]').forEach((r) => r.addEventListener('click', () => openBookingDetail(r.dataset.bk)));
    };
    $('#bkSearch').addEventListener('input', draw); $('#bkSession').addEventListener('change', draw); $('#bkStatus').addEventListener('change', draw);
    $$('[data-promote]', v).forEach((b) => b.addEventListener('click', async () => { try { const r = await api('POST', 'waitlist/' + b.dataset.promote + '/promote'); toast('Moved in as ' + r.number); renderBookings(); } catch (e) { toast(e.message); } }));
    $$('[data-wldel]', v).forEach((b) => b.addEventListener('click', async () => { await api('DELETE', 'waitlist/' + b.dataset.wldel); renderBookings(); }));
    draw();
  }
  function bkRow(b) {
    const st = b.status === 'cancelled' ? 'cancelled' : (b.attendance === 'checked-in' ? 'fulfilled' : 'active');
    const stTxt = b.status === 'cancelled' ? 'Cancelled' : (b.attendance === 'checked-in' ? 'Checked-in' : 'Confirmed');
    return `<tr class="row-click" data-bk="${b.id}"><td><b>${b.number}</b><small class="muted" style="display:block">${fmtD(b.date)}</small></td><td>${esc(b.sessionTitle)}</td><td>${esc(b.customer.name)}<small class="muted" style="display:block">${esc(b.customer.email)}</small></td><td>${b.quantity}</td><td>AED ${b.total} <span class="badge b-${b.paymentStatus === 'refunded' ? 'cancelled' : 'paid'}" style="margin-left:.2rem">${b.paymentStatus}</span></td><td><span class="badge b-${st}">${stTxt}</span></td></tr>`;
  }
  async function openBookingDetail(id) {
    const b = bkCache.find((x) => x.id === id); if (!b) return;
    const body = `
      <div class="od-section"><h3>${b.number} · ${esc(b.sessionTitle)}</h3><p class="muted">${fmtD(b.date)} at ${fmtT(b.time)} · ${esc(b.instructor)} · ${esc(b.location)}</p></div>
      <div class="od-section od-cust"><h3>Customer</h3><p><strong>${esc(b.customer.name)}</strong></p><p class="muted">${esc(b.customer.email)} · ${esc(b.customer.phone)}</p><p class="muted">${b.quantity} ticket(s) · Paid AED ${b.total}${b.discount ? ' (−' + b.discount + ' ' + esc(b.discountCode) + ')' : ''}</p></div>
      <div class="od-section"><h3>Attendance</h3>
        <select id="bd-att" class="field" style="width:100%;padding:.7rem;border:1px solid var(--line);border-radius:10px;background:#fff">
          ${['booked', 'checked-in', 'no-show'].map((a) => `<option value="${a}" ${b.attendance === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select></div>
      <div class="od-section"><h3>Booking status</h3>
        <select id="bd-status" class="field" style="width:100%;padding:.7rem;border:1px solid var(--line);border-radius:10px;background:#fff">
          ${['confirmed', 'cancelled'].map((a) => `<option value="${a}" ${b.status === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select></div>
      <div class="od-section"><h3>Payment</h3>
        <select id="bd-pay" class="field" style="width:100%;padding:.7rem;border:1px solid var(--line);border-radius:10px;background:#fff">
          ${['paid', 'pending', 'refunded'].map((a) => `<option value="${a}" ${b.paymentStatus === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select></div>`;
    openDrawer('Booking ' + b.number, body, `<button class="btn ghost" id="bdCheck">✓ Check in</button><button class="btn gold" id="bdSave">Save</button>`);
    $('#bdCheck').addEventListener('click', async () => { await api('PATCH', 'bookings/' + id, { attendance: 'checked-in' }); toast('Checked in'); closeDrawer(); renderBookings(); });
    $('#bdSave').addEventListener('click', async () => { await api('PATCH', 'bookings/' + id, { attendance: $('#bd-att').value, status: $('#bd-status').value, paymentStatus: $('#bd-pay').value }); toast('Updated'); closeDrawer(); renderBookings(); });
  }

  // ================= HEALING ANALYTICS =================
  async function renderInsights() {
    const v = $('#view'); v.innerHTML = '<div class="empty">Loading…</div>';
    const s = await api('GET', 'booking-stats');
    const card = (ic, lbl, num) => `<div class="stat-card"><div class="ic">${ic}</div><div class="lbl">${lbl}</div><div class="num">${num}</div></div>`;
    v.innerHTML = `
      <div class="stat-grid">
        ${card('<svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8a2 2 0 0 0 2-2V5h12v1a2 2 0 0 0 4 0M4 8v8a2 2 0 0 0 2 2v1h12v-1a2 2 0 0 0 2-2V8"/></svg>', 'Tickets sold', s.ticketsSold)}
        ${card('<svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', 'Revenue', 'AED ' + s.revenue.toLocaleString())}
        ${card('<svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18"/></svg>', 'Occupancy (upcoming)', s.occupancy + '%')}
        ${card('<svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>', 'Attendance rate', s.attendanceRate + '%')}
      </div>
      <div class="stat-grid">
        ${card('<svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', 'Upcoming revenue', 'AED ' + s.upcomingRevenue.toLocaleString())}
        ${card('<svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>', 'Repeat customers', s.repeatCustomers)}
        ${card('<svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>', 'Upcoming sessions', s.upcomingSessions)}
        ${card('<svg width="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 6 9 17l-5-5"/></svg>', 'Bookings', s.bookingsCount)}
      </div>
      <div class="panel"><div class="panel-head"><h2>Most popular sessions</h2></div><div class="table-wrap"><table class="table"><tbody>
        ${s.popular.length ? s.popular.map((p, i) => `<tr><td style="width:40px" class="muted">${i + 1}</td><td><b>${esc(p.title)}</b></td><td class="right">${p.tickets} tickets</td></tr>`).join('') : '<tr><td class="empty">No bookings yet.</td></tr>'}
      </tbody></table></div></div>`;
  }

  // ================= SETTINGS =================
  async function renderSettings() {
    const v = $('#view'); v.innerHTML = '<div class="empty">Loading…</div>';
    const s = await api('GET', 'settings');
    v.innerHTML = `<div class="panel" style="max-width:640px"><div style="padding:1.6rem">
      <div class="field"><label>Store name</label><input id="s-name" value="${esc(s.storeName || '')}"></div>
      <div class="field-row">
        <div class="field"><label>Contact email</label><input id="s-email" value="${esc(s.email || '')}"></div>
        <div class="field"><label>Phone</label><input id="s-phone" value="${esc(s.phone || '')}"></div>
      </div>
      <div class="field-row-3">
        <div class="field"><label>Currency</label><input id="s-currency" value="${esc(s.currency || 'AED')}"></div>
        <div class="field"><label>Free shipping over</label><input id="s-free" type="number" value="${s.freeShipThreshold ?? 100}"></div>
        <div class="field"><label>Flat shipping</label><input id="s-flat" type="number" value="${s.flatShipping ?? 25}"></div>
      </div>
      <button class="btn gold" id="saveSettings">Save settings</button>
    </div></div>`;
    $('#saveSettings').addEventListener('click', async () => {
      await api('PUT', 'settings', {
        storeName: $('#s-name').value, email: $('#s-email').value, phone: $('#s-phone').value,
        currency: $('#s-currency').value, freeShipThreshold: +$('#s-free').value || 0, flatShipping: +$('#s-flat').value || 0,
      });
      toast('Settings saved');
    });
  }

  // ---------- boot ----------
  api('GET', 'me').then((r) => r.authed ? showApp() : showLogin()).catch(showLogin);
})();
