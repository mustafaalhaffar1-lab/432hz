// =====================================================================
// 432Hz — zero-dependency e-commerce server
// Static hosting + JSON-backed REST API + admin auth + image upload.
// =====================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const UPLOADS = path.join(ROOT, 'assets', 'img', 'uploads');
const PORT = process.env.PORT || 8099;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme432'; // DEMO ONLY — override via env
const MAX_BODY = 12 * 1024 * 1024; // 12MB (covers base64 image uploads)

// ---------- ensure folders ----------
[DATA, UPLOADS].forEach((d) => fs.mkdirSync(d, { recursive: true }));

// ---------- file helpers ----------
const file = (name) => path.join(DATA, name);
const readJSON = (name, fallback) => {
  try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); }
  catch { return fallback; }
};
const writeJSON = (name, obj) => fs.writeFileSync(file(name), JSON.stringify(obj, null, 2));

// ---------- seed catalog (runs once) ----------
function seed() {
  if (fs.existsSync(file('products.json'))) return;
  const img = (f) => Array.isArray(f) ? f.map((x) => 'assets/img/' + x) : (f ? ['assets/img/' + f] : []);
  const P = (name, category, price, compareAt, f, stock, badge, rating, reviews, description) => ({
    id: 'p_' + crypto.randomBytes(5).toString('hex'),
    name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    category, price, compareAt: compareAt || null, images: img(f), stock,
    badge: badge || '', rating, reviews, status: 'active',
    description: description || '', createdAt: Date.now(),
  });
  const products = [
    P('The Protection Ritual', 'Intention Kits', 349, 420, ['protection.jpg', 'protection-2.jpg', 'protection-3.jpg', 'protection-4.jpg', 'protection-5.jpg', 'protection-6.jpg', 'protection-7.jpg'], 12, 'Bestseller', 4.9, 128, 'A ritual set created to ground, cleanse, and protect your energy.'),
    P('The Abundance Ritual', 'Intention Kits', 349, 420, ['abundance.webp', 'abundance-2.jpg', 'abundance-3.jpg', 'abundance-4.jpg', 'abundance-5.jpg', 'abundance-6.jpg', 'abundance-7.jpg'], 8, 'Bestseller', 5.0, 94, 'A ritual set designed to create space for growth and possibility.'),
    P('The Love Ritual', 'Intention Kits', 386, null, ['love.webp', 'love-2.jpg', 'love-3.jpg', 'love-4.jpg', 'love-5.jpg', 'love-6.jpg', 'love-7.jpg'], 5, 'Limited', 4.8, 76, 'A ritual set designed to soften your space and open your heart.'),
    P('The Ritual Library', 'Intention Kits', 949, 1158, 'abundance.webp', 20, 'Bundle', 5.0, 37, 'All four signature rituals, together. Save 18%.'),
    P('Oud Incense Box', 'Luxury Scents', 80, null, ['oud-incense.jpg', 'oud-incense-2.jpg'], 40, 'New', 4.9, 203, 'Handcrafted Oud Incense Box featuring premium oud chips.'),
    P('Sacred Oud Sticks', 'Luxury Scents', 95, null, '', 30, '', 4.9, 87, 'An ancient scent of warmth and depth — sacred oud, hand-rolled.'),
    P('Amethyst Cluster', 'Healing Crystals', 145, null, '', 18, '', 4.9, 61, 'For clarity, calm, and intuition. Natural, one of a kind.'),
    P('Citrine Abundance Stone', 'Healing Crystals', 120, null, '', 24, '', 5.0, 44, 'The crystal of abundance and optimism.'),
    P('Selenite Cleansing Wand', 'Healing Crystals', 65, null, '', 33, '', 4.8, 52, 'Cleanse and charge your space and other stones.'),
    P('Brass Incense Holder', 'Accessories', 55, null, '', 50, '', 4.9, 39, 'A handcrafted brass holder for your daily ritual.'),
    P('Ceramic Ash Dish', 'Accessories', 45, null, '', 28, '', 4.7, 28, 'A minimal ceramic dish to catch the ash.'),
    P('Linen Ritual Pouch', 'Accessories', 40, null, '', 61, '', 4.9, 61, 'A linen-wrapped pouch to keep your ritual together.'),
  ];
  writeJSON('products.json', products);
  writeJSON('orders.json', []);
  writeJSON('meta.json', { orderSeq: 1001 });
  writeJSON('settings.json', {
    storeName: '432Hz', email: 'info@432hz.ae', phone: '+971 58 564 3249',
    currency: 'AED', freeShipThreshold: 100, flatShipping: 25,
  });
  console.log('Seeded data/');
}
seed();

// ---------- auth (in-memory sessions) ----------
const sessions = new Map(); // token -> expiry
const newToken = () => crypto.randomBytes(24).toString('hex');
const parseCookies = (req) => Object.fromEntries(
  (req.headers.cookie || '').split(';').map((c) => c.trim().split('=').map(decodeURIComponent)).filter((x) => x[0])
);
const isAuthed = (req) => {
  const t = parseCookies(req).hz_admin;
  if (!t || !sessions.has(t)) return false;
  if (sessions.get(t) < Date.now()) { sessions.delete(t); return false; }
  return true;
};

// ---------- http helpers ----------
const sendJSON = (res, status, obj, headers = {}) => {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(body);
};
const readBody = (req) => new Promise((resolve, reject) => {
  let data = ''; let size = 0;
  req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); } data += c; });
  req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
  req.on('error', reject);
});

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// =====================================================================
// API
// =====================================================================
async function api(req, res, url) {
  const seg = url.pathname.split('/').filter(Boolean); // ['api', 'products', ':id']
  const resource = seg[1];
  const id = seg[2];
  const method = req.method;
  const requireAuth = () => { if (!isAuthed(req)) { sendJSON(res, 401, { error: 'unauthorized' }); return false; } return true; };

  // ---- auth ----
  if (resource === 'login' && method === 'POST') {
    const { password } = await readBody(req);
    if (password !== ADMIN_PASSWORD) return sendJSON(res, 401, { error: 'Incorrect password' });
    const token = newToken();
    sessions.set(token, Date.now() + 1000 * 60 * 60 * 12); // 12h
    return sendJSON(res, 200, { ok: true }, {
      'Set-Cookie': `hz_admin=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200`,
    });
  }
  if (resource === 'logout' && method === 'POST') {
    const t = parseCookies(req).hz_admin; if (t) sessions.delete(t);
    return sendJSON(res, 200, { ok: true }, { 'Set-Cookie': 'hz_admin=; Path=/; Max-Age=0' });
  }
  if (resource === 'me') return sendJSON(res, 200, { authed: isAuthed(req) });

  // ---- products ----
  if (resource === 'products') {
    const products = readJSON('products.json', []);
    if (method === 'GET' && !id) {
      const status = url.searchParams.get('status');
      return sendJSON(res, 200, status ? products.filter((p) => p.status === status) : products);
    }
    if (method === 'GET' && id) {
      const p = products.find((x) => x.id === id);
      return p ? sendJSON(res, 200, p) : sendJSON(res, 404, { error: 'not found' });
    }
    if (method === 'POST') {
      if (!requireAuth()) return;
      const b = await readBody(req);
      const p = {
        id: 'p_' + crypto.randomBytes(5).toString('hex'),
        name: b.name || 'Untitled', slug: (b.name || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        category: b.category || 'Intention Kits', price: +b.price || 0, compareAt: b.compareAt ? +b.compareAt : null,
        images: Array.isArray(b.images) ? b.images : [], stock: +b.stock || 0, badge: b.badge || '',
        rating: b.rating ? +b.rating : 5.0, reviews: b.reviews ? +b.reviews : 0,
        status: b.status || 'active', description: b.description || '', createdAt: Date.now(),
      };
      products.unshift(p); writeJSON('products.json', products);
      return sendJSON(res, 201, p);
    }
    if (method === 'PUT' && id) {
      if (!requireAuth()) return;
      const b = await readBody(req);
      const i = products.findIndex((x) => x.id === id);
      if (i < 0) return sendJSON(res, 404, { error: 'not found' });
      const fields = ['name', 'category', 'price', 'compareAt', 'images', 'stock', 'badge', 'rating', 'reviews', 'status', 'description'];
      fields.forEach((f) => { if (b[f] !== undefined) products[i][f] = b[f]; });
      if (b.name) products[i].slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      writeJSON('products.json', products);
      return sendJSON(res, 200, products[i]);
    }
    if (method === 'DELETE' && id) {
      if (!requireAuth()) return;
      const next = products.filter((x) => x.id !== id);
      writeJSON('products.json', next);
      return sendJSON(res, 200, { ok: true });
    }
  }

  // ---- orders ----
  if (resource === 'orders') {
    const orders = readJSON('orders.json', []);
    const settings = readJSON('settings.json', {});
    if (method === 'GET') {
      if (!requireAuth()) return;
      if (id) { const o = orders.find((x) => x.id === id); return o ? sendJSON(res, 200, o) : sendJSON(res, 404, { error: 'not found' }); }
      return sendJSON(res, 200, orders);
    }
    if (method === 'POST') { // public checkout
      const b = await readBody(req);
      const items = Array.isArray(b.items) ? b.items : [];
      if (!items.length) return sendJSON(res, 400, { error: 'empty cart' });
      const subtotal = items.reduce((s, i) => s + (+i.price || 0) * (+i.qty || 1), 0);
      const shipping = subtotal >= (settings.freeShipThreshold || 100) ? 0 : (settings.flatShipping || 25);
      const meta = readJSON('meta.json', { orderSeq: 1001 });
      const order = {
        id: 'o_' + crypto.randomBytes(6).toString('hex'),
        number: '#' + meta.orderSeq,
        customer: {
          name: b.customer?.name || '', email: b.customer?.email || '',
          phone: b.customer?.phone || '', address: b.customer?.address || '',
          city: b.customer?.city || '', country: b.customer?.country || 'UAE',
          note: b.customer?.note || '',
        },
        items: items.map((i) => ({ name: i.name, price: +i.price || 0, qty: +i.qty || 1 })),
        subtotal, shipping, total: subtotal + shipping,
        status: 'pending', createdAt: Date.now(),
      };
      meta.orderSeq += 1; writeJSON('meta.json', meta);
      orders.unshift(order); writeJSON('orders.json', orders);
      // decrement stock
      const products = readJSON('products.json', []);
      order.items.forEach((it) => { const p = products.find((x) => x.name === it.name); if (p) p.stock = Math.max(0, p.stock - it.qty); });
      writeJSON('products.json', products);
      return sendJSON(res, 201, { ok: true, number: order.number, id: order.id });
    }
    if (method === 'PATCH' && id) {
      if (!requireAuth()) return;
      const b = await readBody(req);
      const i = orders.findIndex((x) => x.id === id);
      if (i < 0) return sendJSON(res, 404, { error: 'not found' });
      if (b.status) orders[i].status = b.status;
      writeJSON('orders.json', orders);
      return sendJSON(res, 200, orders[i]);
    }
  }

  // ---- upload (base64) ----
  if (resource === 'upload' && method === 'POST') {
    if (!requireAuth()) return;
    const { filename, dataUrl } = await readBody(req);
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl || '');
    if (!m) return sendJSON(res, 400, { error: 'invalid image' });
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/gif': '.gif' }[m[1]] || '.jpg';
    const safe = (filename || 'img').replace(/[^a-z0-9._-]/gi, '_').replace(/\.[^.]+$/, '');
    const out = `${Date.now().toString(36)}-${safe}${ext}`;
    fs.writeFileSync(path.join(UPLOADS, out), Buffer.from(m[2], 'base64'));
    return sendJSON(res, 201, { url: 'assets/img/uploads/' + out });
  }

  // ---- settings ----
  if (resource === 'settings') {
    if (method === 'GET') return sendJSON(res, 200, readJSON('settings.json', {}));
    if (method === 'PUT') {
      if (!requireAuth()) return;
      const b = await readBody(req);
      const s = { ...readJSON('settings.json', {}), ...b };
      writeJSON('settings.json', s);
      return sendJSON(res, 200, s);
    }
  }

  // ---- stats (dashboard) ----
  if (resource === 'stats' && method === 'GET') {
    if (!requireAuth()) return;
    const orders = readJSON('orders.json', []);
    const products = readJSON('products.json', []);
    const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
    return sendJSON(res, 200, {
      revenue, orders: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      products: products.length,
      lowStock: products.filter((p) => p.stock <= 5).length,
      recent: orders.slice(0, 6),
    });
  }

  return sendJSON(res, 404, { error: 'no route' });
}

// =====================================================================
// static
// =====================================================================
function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  if (p.endsWith('/')) p += 'index.html';
  const filePath = path.join(ROOT, path.normalize(p));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<h1>404</h1>'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    serveStatic(req, res, url);
  } catch (e) {
    sendJSON(res, 400, { error: e.message || 'bad request' });
  }
}).listen(PORT, () => console.log(`432Hz store + admin at http://localhost:${PORT}  (admin: /admin)`));
