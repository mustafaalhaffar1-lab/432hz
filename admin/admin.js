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
    settings: ['Settings', 'Store details and shipping'],
  };
  function route(view) {
    $$('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === view));
    $('#viewTitle').textContent = TITLES[view][0];
    $('#viewSub').textContent = TITLES[view][1];
    $('#topActions').innerHTML = view === 'products'
      ? '<button class="btn gold" id="addProduct">+ Add product</button>' : '';
    if (view === 'products') $('#addProduct').addEventListener('click', () => openProductEditor(null));
    $('#sidebar').classList.remove('open');
    ({ dashboard: renderDashboard, products: renderProducts, orders: renderOrders, customers: renderCustomers, settings: renderSettings }[view])();
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
