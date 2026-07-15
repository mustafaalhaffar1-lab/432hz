// =====================================================================
// 432Hz — zero-dependency e-commerce server
// Static hosting + JSON-backed REST API + admin auth + image upload.
// =====================================================================
const http = require('http');
const https = require('https');
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
  const P = (name, category, price, compareAt, f, stock, badge, rating, reviews, description, includes) => ({
    id: 'p_' + crypto.randomBytes(5).toString('hex'),
    name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    category, price, compareAt: compareAt || null, images: img(f), stock,
    badge: badge || '', rating, reviews, status: 'active',
    description: description || '', includes: includes || [], createdAt: Date.now(),
  });
  const products = [
    P('The Protection Ritual', 'Intention Kits', 349, 420, ['protection.jpg', 'protection-2.jpg', 'protection-3.jpg', 'protection-4.jpg', 'protection-5.jpg', 'protection-6.jpg', 'protection-7.jpg'], 12, 'Bestseller', 4.9, 128,
      "A ritual set created to ground, cleanse, and protect your energy. The Protection Ritual is curated to help you feel centered and safe within your space — each element chosen to clear negativity, strengthen your energy, and create a sense of calm stability. Use it to reset after heavy days, anchor yourself in moments of stress, or simply maintain a protective shield around your environment. More than a ritual, it's your sanctuary — designed to protect what matters most: your calm.",
      ["Crystals for protection & strength: Black Tourmaline, Tiger's Eye, Selenite", "Sacred sage bundle to sweep away unwanted energy", "Oud incense with a wooden holder — a grounding ritual of smoke and scent", "Crystal-infused roller with Tiger's Eye, blended with vanilla, tonka & amber woods", "Light catcher to transform light into clarity and balance"]),
    P('The Abundance Ritual', 'Intention Kits', 349, 420, ['abundance.webp', 'abundance-2.jpg', 'abundance-3.jpg', 'abundance-4.jpg', 'abundance-5.jpg', 'abundance-6.jpg', 'abundance-7.jpg'], 8, 'Bestseller', 5.0, 94,
      "A ritual set designed to create space for growth and possibility. The Abundance Ritual is curated to help you align with prosperity and expansion — each element chosen to clear away stagnant energy, open your surroundings, and invite in opportunities. Use it to set intentions, ground your energy, or simply shift your space into one that feels expansive and full of potential. More than a ritual, it's a way to attune your space — and yourself — to the frequency of abundance.",
      ["Crystals for prosperity & growth: Citrine, Pyrite, Green Aventurine", "Sacred sage bundle to clear and refresh your environment", "Oud incense with a wooden holder — a grounding scent to carry intentions skyward", "Crystal-infused roller with Citrine, blended with vanilla, tonka & amber woods", "Light catcher to reflect light and flow, a symbol of expansion"]),
    P('The Love Ritual', 'Intention Kits', 386, null, ['love.webp', 'love-2.jpg', 'love-3.jpg', 'love-4.jpg', 'love-5.jpg', 'love-6.jpg', 'love-7.jpg'], 5, 'Limited', 4.8, 76,
      "A ritual set designed to soften your space and open your heart. The Love Ritual is a curated collection for renewal, connection, and balance — each element chosen with intention to clear away heaviness, welcome harmony, and invite love in all its forms. Whether you're nurturing self-love, deepening relationships, or creating a more peaceful atmosphere, this set is your companion. More than a ritual, it's an atmosphere — a way to align your surroundings with the frequency of love.",
      ["Crystals for love & balance: Rose Quartz, Rhodonite, Green Aventurine", "Sacred sage bundle to cleanse and refresh your energy", "Oud incense with a Selenite holder — ancient scent meets purifying stone", "Crystal-infused roller with Amethyst, blended with vanilla, tonka & amber woods", "Light catcher to fill your space with shifting reflections of harmony"]),
    P('Oud Incense Box', 'Luxury Scents', 80, null, ['oud-incense.jpg', 'oud-incense-2.jpg'], 40, 'New', 4.9, 203,
      "Elevate your space with our handcrafted Oud Incense Box — featuring premium oud chips sourced from the finest regions. Encased in elegant packaging, it delivers a rich, long-lasting aroma perfect for relaxing, meditating, or gifting. A timeless blend of tradition and sophistication."),
  ];
  writeJSON('products.json', products);
  writeJSON('orders.json', []);
  writeJSON('meta.json', { orderSeq: 1001 });
  writeJSON('settings.json', {
    storeName: '432Hz', email: 'info@432hz.ae', phone: '+971 58 564 3249',
    currency: 'AED', freeShipThreshold: 100, flatShipping: 25,
  });

  // ---- healing sessions seed ----
  const pad = (n) => String(n).padStart(2, '0');
  const dstr = (offsetDays) => { const d = new Date(Date.now() + offsetDays * 86400000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  writeJSON('sessions.json', [{
    id: 's_' + crypto.randomBytes(5).toString('hex'),
    title: 'Nervous System Reset', slug: 'nervous-system-reset',
    category: 'Nervous System Regulation', price: 180, maxSeats: 12,
    date: dstr(6), time: '18:30', duration: '75 minutes',
    instructor: 'Hajar Bourri', location: '432Hz Studio, Dubai', difficulty: 'All levels — no experience needed',
    description: "A deeply grounding evening of breath, guided meditation, calming sound, and intentional ritual with clear quartz. Together, we'll create space to slow down, reconnect with the body, and support the nervous system through simple, evidence-informed practices.",
    about: "Our nervous system is constantly responding to the world around us. Through slow breathing, focused attention, and intentional pauses, we can create conditions that support the body's natural relaxation response. Today's meditation is simply an invitation to slow down and reconnect.\n\nGuided by Hajar Bourri, this is a deeply grounding evening of breath, guided meditation, calming sound, and intentional ritual with clear quartz. There is nothing to perform and nothing to get right — you'll be gently led, step by step, from a busy mind toward a place of calm and presence.\n\nYou'll be held in a candle-lit room with a small circle of others — a welcoming, judgement-free space with no previous meditation experience required. Come as you are; the practices are simple, gentle, and designed for real life.",
    whatToBring: 'Comfortable clothing you can lie down in, and a water bottle. Mats, bolsters, blankets, eye pillows and a clear quartz crystal are all provided — just bring yourself.',
    whatToExpect: "A warm welcome and herbal tea as you arrive. Guided breathing and meditation to gently release the day. We'll be accompanied by music tuned to 432 Hz — many people find this type of soundscape relaxing, although individual experiences vary. Throughout the meditation, you'll hold a clear quartz crystal as a physical reminder to return to your breath and your intention. A slow, quiet return, with space to integrate before you step back into the world.",
    benefits: [
      'A greater sense of calm and presence',
      'Support for your nervous system through guided breathing and meditation',
      'Gentle softening of physical tension in the jaw, shoulders and chest',
      'More space between you and racing thoughts',
      'Practical tools you can return to in everyday moments of stress',
      'A welcoming, judgement-free space — no previous meditation experience required',
    ],
    journey: [
      ['Arrival', 'Herbal tea, a warm welcome, and a few quiet moments to settle in and let the day go.'],
      ['Breath', "Slow, guided breathing to gently invite the body's natural relaxation response."],
      ['Body awareness', 'A soft, guided scan through the body, easing tension you may be holding.'],
      ['Safe place visualization', 'A gentle guided visualization to a place of ease and safety, letting the mind rest.'],
      ['Intention with quartz', 'Holding your clear quartz, we set a simple intention to carry with you.'],
      ['Closing', 'A slow, gentle return, with space to integrate before you step back into the world.'],
    ],
    gallery: ['assets/img/session/reset-hero.webp', 'assets/img/session/reset-bowl.webp', 'assets/img/session/reset-rest.webp', 'assets/img/session/reset-bowls.webp', 'assets/img/session/reset-detail.webp'],
    coverImage: 'assets/img/session/reset-hero.webp',
    status: 'published', featured: true,
    cancelPolicy: 'Free cancellation up to 24 hours before the session. Life happens — just let us know.',
    createdAt: Date.now(),
  }]);
  writeJSON('bookings.json', []);
  writeJSON('waitlist.json', []);
  writeJSON('session_reviews.json', []);
  writeJSON('discounts.json', [
    { code: 'CALM10', type: 'percent', value: 10, active: true, note: '10% off any session' },
    { code: 'EARLYBIRD', type: 'percent', value: 15, active: true, note: 'Early-bird 15% off' },
  ]);
  writeJSON('booking_meta.json', { seq: 1001 });
  writeJSON('users.json', []);

  console.log('Seeded data/');
}
seed();

// ---------- auth (in-memory sessions) ----------
const sessions = new Map(); // token -> { exp, role, userId, name, instructorName }
const newToken = () => crypto.randomBytes(24).toString('hex');
const parseCookies = (req) => Object.fromEntries(
  (req.headers.cookie || '').split(';').map((c) => c.trim().split('=').map(decodeURIComponent)).filter((x) => x[0])
);
// returns the session object (truthy) or null
const isAuthed = (req) => {
  const t = parseCookies(req).hz_admin;
  if (!t || !sessions.has(t)) return null;
  const s = sessions.get(t);
  if (s.exp < Date.now()) { sessions.delete(t); return null; }
  return s;
};
const isAdmin = (req) => { const s = isAuthed(req); return !!s && s.role === 'admin'; };

// ---------- password hashing (scrypt) ----------
const hashPw = (pw) => { const salt = crypto.randomBytes(16).toString('hex'); const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex'); return { salt, hash }; };
const verifyPw = (pw, salt, hash) => { try { const h = crypto.scryptSync(String(pw), salt, 64); return crypto.timingSafeEqual(h, Buffer.from(hash, 'hex')); } catch { return false; } };
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, instructorName: u.instructorName || '', createdAt: u.createdAt });

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
// Stripe (zero-dependency REST client) — activates when
// STRIPE_SECRET_KEY is set in the environment.
// =====================================================================
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
function stripeCall(method, apiPath, params) {
  return new Promise((resolve, reject) => {
    const body = params ? Object.entries(params).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&') : '';
    const req = https.request({
      hostname: 'api.stripe.com', path: apiPath, method,
      headers: {
        Authorization: 'Bearer ' + STRIPE_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(j.error?.message || 'Stripe error ' + res.statusCode));
          else resolve(j);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}
const siteOrigin = (req) => {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${proto.split(',')[0]}://${host.split(',')[0]}`;
};

// ---------- shared creation logic (used by demo checkout AND Stripe verify) ----------
function placeOrder(b, opts = {}) {
  const orders = readJSON('orders.json', []);
  const settings = readJSON('settings.json', {});
  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) throw new Error('empty cart');
  const subtotal = items.reduce((s, i) => s + (+i.price || 0) * (+i.qty || 1), 0);
  const shipping = subtotal >= (settings.freeShipThreshold || 100) ? 0 : (settings.flatShipping || 25);
  const meta = readJSON('meta.json', { orderSeq: 1001 });
  const order = {
    id: 'o_' + crypto.randomBytes(6).toString('hex'), number: '#' + meta.orderSeq,
    customer: {
      name: b.customer?.name || '', email: b.customer?.email || '', phone: b.customer?.phone || '',
      address: b.customer?.address || '', city: b.customer?.city || '', country: b.customer?.country || 'UAE',
      note: b.customer?.note || '',
    },
    items: items.map((i) => ({ name: i.name, price: +i.price || 0, qty: +i.qty || 1 })),
    subtotal, shipping, total: subtotal + shipping,
    status: 'pending', paymentStatus: opts.paymentStatus || 'pending',
    stripeSessionId: opts.stripeSessionId || '', createdAt: Date.now(),
  };
  meta.orderSeq += 1; writeJSON('meta.json', meta);
  orders.unshift(order); writeJSON('orders.json', orders);
  const products = readJSON('products.json', []);
  order.items.forEach((it) => { const p = products.find((x) => x.name === it.name); if (p) p.stock = Math.max(0, p.stock - it.qty); });
  writeJSON('products.json', products);
  return order;
}
function placeBooking(b, opts = {}) {
  const bookings = readJSON('bookings.json', []);
  const all = readJSON('sessions.json', []);
  const s = all.find((x) => x.id === b.sessionId);
  if (!s || s.status !== 'published') throw new Error('Session unavailable');
  const qty = Math.max(1, parseInt(b.quantity) || 1);
  const booked = bookings.filter((x) => x.sessionId === s.id && x.status === 'confirmed').reduce((n, x) => n + x.quantity, 0);
  if (!opts.allowOverbook && s.maxSeats - booked < qty) { const e = new Error('Not enough seats'); e.remaining = s.maxSeats - booked; throw e; }
  const subtotal = s.price * qty;
  let discount = 0, code = '';
  if (b.discountCode) {
    const d = readJSON('discounts.json', []).find((x) => x.active && x.code.toLowerCase() === String(b.discountCode).toLowerCase());
    if (d) { discount = d.type === 'percent' ? Math.round(subtotal * d.value / 100) : Math.min(subtotal, d.value); code = d.code; }
  }
  const meta = readJSON('booking_meta.json', { seq: 1001 });
  const booking = {
    id: 'bk_' + crypto.randomBytes(7).toString('hex'), number: 'HS-' + meta.seq,
    sessionId: s.id, sessionTitle: s.title, category: s.category, date: s.date, time: s.time,
    duration: s.duration, location: s.location, instructor: s.instructor,
    customer: { name: b.customer?.name || '', email: b.customer?.email || '', phone: b.customer?.phone || '' },
    attendees: Array.isArray(b.attendees) ? b.attendees : [], quantity: qty,
    subtotal, discountCode: code, discount, total: subtotal - discount,
    paymentStatus: opts.paymentStatus || 'paid', status: 'confirmed', attendance: 'booked',
    stripeSessionId: opts.stripeSessionId || '', createdAt: Date.now(),
  };
  meta.seq += 1; writeJSON('booking_meta.json', meta);
  bookings.unshift(booking); writeJSON('bookings.json', bookings);
  return booking;
}
// pending Stripe payments (payload parked until payment confirms)
function readPending() {
  const list = readJSON('pending_payments.json', []);
  const fresh = list.filter((p) => Date.now() - p.createdAt < 48 * 3600 * 1000);
  if (fresh.length !== list.length) writeJSON('pending_payments.json', fresh);
  return fresh;
}

// =====================================================================
// API
// =====================================================================
async function api(req, res, url) {
  const seg = url.pathname.split('/').filter(Boolean); // ['api', 'products', ':id']
  const resource = seg[1];
  const id = seg[2];
  const method = req.method;
  const me = isAuthed(req);
  const requireAuth = () => { if (!me) { sendJSON(res, 401, { error: 'unauthorized' }); return false; } return true; };
  const requireAdmin = () => { if (!me) { sendJSON(res, 401, { error: 'unauthorized' }); return false; } if (me.role !== 'admin') { sendJSON(res, 403, { error: 'Admins only' }); return false; } return true; };

  // ---- auth ----
  if (resource === 'login' && method === 'POST') {
    const b = await readBody(req);
    const email = (b.email || '').trim().toLowerCase();
    let sess = null;
    if (email) {
      const u = readJSON('users.json', []).find((x) => x.email.toLowerCase() === email);
      if (!u || !verifyPw(b.password, u.salt, u.hash)) return sendJSON(res, 401, { error: 'Incorrect email or password' });
      sess = { role: u.role, userId: u.id, name: u.name, instructorName: u.instructorName || u.name };
    } else {
      if (b.password !== ADMIN_PASSWORD) return sendJSON(res, 401, { error: 'Incorrect password' });
      sess = { role: 'admin', userId: 'master', name: 'Administrator', instructorName: '' };
    }
    const token = newToken();
    sessions.set(token, { exp: Date.now() + 1000 * 60 * 60 * 12, ...sess });
    return sendJSON(res, 200, { ok: true, role: sess.role, name: sess.name }, {
      'Set-Cookie': `hz_admin=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200`,
    });
  }
  if (resource === 'logout' && method === 'POST') {
    const t = parseCookies(req).hz_admin; if (t) sessions.delete(t);
    return sendJSON(res, 200, { ok: true }, { 'Set-Cookie': 'hz_admin=; Path=/; Max-Age=0' });
  }
  if (resource === 'me') return sendJSON(res, 200, me ? { authed: true, role: me.role, name: me.name, instructorName: me.instructorName || '' } : { authed: false });

  // ---- users (admin) ----
  if (resource === 'users') {
    const users = readJSON('users.json', []);
    if (method === 'GET') { if (!requireAdmin()) return; return sendJSON(res, 200, users.map(publicUser)); }
    if (method === 'POST') {
      if (!requireAdmin()) return;
      const b = await readBody(req);
      const email = (b.email || '').trim().toLowerCase();
      if (!b.name || !email || !b.password) return sendJSON(res, 400, { error: 'Name, email and password are required' });
      if (users.find((u) => u.email.toLowerCase() === email)) return sendJSON(res, 409, { error: 'A user with that email already exists' });
      const { salt, hash } = hashPw(b.password);
      const role = b.role === 'instructor' ? 'instructor' : 'admin';
      const u = { id: 'u_' + crypto.randomBytes(5).toString('hex'), name: b.name.trim(), email, role, instructorName: role === 'instructor' ? (b.instructorName || b.name).trim() : '', salt, hash, createdAt: Date.now() };
      users.push(u); writeJSON('users.json', users);
      return sendJSON(res, 201, publicUser(u));
    }
    if (method === 'PUT' && id) {
      if (!requireAdmin()) return;
      const b = await readBody(req); const i = users.findIndex((u) => u.id === id);
      if (i < 0) return sendJSON(res, 404, { error: 'not found' });
      if (b.name !== undefined) users[i].name = b.name.trim();
      if (b.role !== undefined) users[i].role = b.role === 'instructor' ? 'instructor' : 'admin';
      if (b.instructorName !== undefined) users[i].instructorName = b.instructorName.trim();
      if (users[i].role !== 'instructor') users[i].instructorName = '';
      if (b.password) { const { salt, hash } = hashPw(b.password); users[i].salt = salt; users[i].hash = hash; }
      writeJSON('users.json', users);
      return sendJSON(res, 200, publicUser(users[i]));
    }
    if (method === 'DELETE' && id) { if (!requireAdmin()) return; writeJSON('users.json', users.filter((u) => u.id !== id)); return sendJSON(res, 200, { ok: true }); }
  }

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
      if (!requireAdmin()) return;
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
      if (!requireAdmin()) return;
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
      if (!requireAdmin()) return;
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
      if (!requireAdmin()) return;
      if (id) { const o = orders.find((x) => x.id === id); return o ? sendJSON(res, 200, o) : sendJSON(res, 404, { error: 'not found' }); }
      return sendJSON(res, 200, orders);
    }
    if (method === 'POST') { // public checkout (demo — used when Stripe is not configured)
      const b = await readBody(req);
      try { const order = placeOrder(b); return sendJSON(res, 201, { ok: true, number: order.number, id: order.id }); }
      catch (e) { return sendJSON(res, 400, { error: e.message }); }
    }
    if (method === 'PATCH' && id) {
      if (!requireAdmin()) return;
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
    if (!requireAdmin()) return;
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
      if (!requireAdmin()) return;
      const b = await readBody(req);
      const s = { ...readJSON('settings.json', {}), ...b };
      writeJSON('settings.json', s);
      return sendJSON(res, 200, s);
    }
  }

  // ---- stats (dashboard) ----
  if (resource === 'stats' && method === 'GET') {
    if (!requireAdmin()) return;
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

  // =====================================================================
  // HEALING SESSIONS · BOOKINGS · WAITLIST · REVIEWS · ANALYTICS
  // =====================================================================
  const action = seg[3];
  const seatsBooked = (sid, bookings) => bookings.filter((b) => b.sessionId === sid && b.status === 'confirmed').reduce((n, b) => n + b.quantity, 0);
  const withSeats = (s, bookings) => { const booked = seatsBooked(s.id, bookings); return { ...s, booked, remaining: Math.max(0, s.maxSeats - booked), soldOut: booked >= s.maxSeats }; };

  // ---- sessions ----
  if (resource === 'sessions') {
    const all = readJSON('sessions.json', []);
    const bookings = readJSON('bookings.json', []);
    if (method === 'GET' && !id) {
      const admin = isAuthed(req);
      let list = admin ? all : all.filter((s) => s.status === 'published');
      list = list.map((s) => withSeats(s, bookings)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      return sendJSON(res, 200, list);
    }
    if (method === 'GET' && id && action === 'attendees') { // CSV export (admin or owning instructor)
      if (!requireAuth()) return;
      const s = all.find((x) => x.id === id);
      if (me.role === 'instructor' && (!s || s.instructor.toLowerCase().trim() !== (me.instructorName || '').toLowerCase().trim())) return sendJSON(res, 403, { error: 'Not your session' });
      const rows = [['Booking', 'Name', 'Email', 'Phone', 'Tickets', 'Payment', 'Attendance', 'Booked at']];
      bookings.filter((b) => b.sessionId === id && b.status === 'confirmed').forEach((b) => rows.push([b.number, b.customer.name, b.customer.email, b.customer.phone, b.quantity, b.paymentStatus, b.attendance, new Date(b.createdAt).toISOString()]));
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      return res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="attendees-${(s && s.slug) || id}.csv"` }), res.end(csv);
    }
    if (method === 'GET' && id) {
      const s = all.find((x) => x.id === id || x.slug === id);
      return s ? sendJSON(res, 200, withSeats(s, bookings)) : sendJSON(res, 404, { error: 'not found' });
    }
    if (method === 'POST' && id && action === 'duplicate') {
      if (!requireAdmin()) return;
      const src = all.find((x) => x.id === id); if (!src) return sendJSON(res, 404, { error: 'not found' });
      const copy = { ...src, id: 's_' + crypto.randomBytes(5).toString('hex'), title: src.title + ' (copy)', status: 'draft', featured: false, createdAt: Date.now() };
      all.unshift(copy); writeJSON('sessions.json', all); return sendJSON(res, 201, copy);
    }
    if (method === 'POST') {
      if (!requireAdmin()) return;
      const b = await readBody(req);
      const s = {
        id: 's_' + crypto.randomBytes(5).toString('hex'),
        title: b.title || 'Untitled session', slug: (b.title || 'session').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        category: b.category || 'Guided Meditation', price: +b.price || 0, maxSeats: +b.maxSeats || 10,
        date: b.date || '', time: b.time || '', duration: b.duration || '', instructor: b.instructor || '',
        location: b.location || '432Hz Studio, Dubai', difficulty: b.difficulty || '',
        description: b.description || '', about: b.about || '', whatToBring: b.whatToBring || '', whatToExpect: b.whatToExpect || '',
        benefits: Array.isArray(b.benefits) ? b.benefits : [], gallery: Array.isArray(b.gallery) ? b.gallery : [],
        journey: Array.isArray(b.journey) ? b.journey : [],
        coverImage: b.coverImage || '', status: b.status || 'draft', featured: !!b.featured,
        cancelPolicy: b.cancelPolicy || 'Free cancellation up to 24 hours before the session.', createdAt: Date.now(),
      };
      all.unshift(s); writeJSON('sessions.json', all); return sendJSON(res, 201, s);
    }
    if (method === 'PUT' && id) {
      if (!requireAdmin()) return;
      const b = await readBody(req); const i = all.findIndex((x) => x.id === id);
      if (i < 0) return sendJSON(res, 404, { error: 'not found' });
      ['title', 'category', 'price', 'maxSeats', 'date', 'time', 'duration', 'instructor', 'location', 'difficulty', 'description', 'about', 'whatToBring', 'whatToExpect', 'benefits', 'gallery', 'journey', 'coverImage', 'status', 'featured', 'cancelPolicy'].forEach((f) => { if (b[f] !== undefined) all[i][f] = f === 'price' || f === 'maxSeats' ? +b[f] : b[f]; });
      if (b.title) all[i].slug = b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      writeJSON('sessions.json', all); return sendJSON(res, 200, all[i]);
    }
    if (method === 'DELETE' && id) {
      if (!requireAdmin()) return;
      writeJSON('sessions.json', all.filter((x) => x.id !== id)); return sendJSON(res, 200, { ok: true });
    }
  }

  // ---- bookings ----
  if (resource === 'bookings') {
    const bookings = readJSON('bookings.json', []);
    if (method === 'GET' && id) { // ticket lookup (public — id acts as token)
      const b = bookings.find((x) => x.id === id || x.number === id);
      return b ? sendJSON(res, 200, b) : sendJSON(res, 404, { error: 'not found' });
    }
    if (method === 'GET' && !id) {
      if (url.searchParams.get('email')) { // customer portal
        const em = url.searchParams.get('email').toLowerCase();
        return sendJSON(res, 200, bookings.filter((b) => (b.customer.email || '').toLowerCase() === em));
      }
      if (!requireAuth()) return; // staff list
      const sid = url.searchParams.get('session');
      let list = sid ? bookings.filter((b) => b.sessionId === sid) : bookings;
      if (me.role === 'instructor') {
        const mine = new Set(readJSON('sessions.json', []).filter((s) => s.instructor.toLowerCase().trim() === (me.instructorName || '').toLowerCase().trim()).map((s) => s.id));
        list = list.filter((b) => mine.has(b.sessionId));
      }
      return sendJSON(res, 200, list);
    }
    if (method === 'POST' && !id) { // create booking (demo — used when Stripe is not configured)
      const b = await readBody(req);
      try { const booking = placeBooking(b); return sendJSON(res, 201, { ok: true, id: booking.id, number: booking.number, booking }); }
      catch (e) { return sendJSON(res, e.remaining !== undefined ? 409 : 400, { error: e.message, remaining: e.remaining }); }
    }
    if (method === 'POST' && id && action === 'cancel') { // public self-cancel
      const i = bookings.findIndex((x) => x.id === id || x.number === id);
      if (i < 0) return sendJSON(res, 404, { error: 'not found' });
      bookings[i].status = 'cancelled'; bookings[i].paymentStatus = 'refunded';
      writeJSON('bookings.json', bookings); return sendJSON(res, 200, { ok: true });
    }
    if (method === 'PATCH' && id) { // staff update
      if (!requireAuth()) return;
      const b = await readBody(req); const i = bookings.findIndex((x) => x.id === id);
      if (i < 0) return sendJSON(res, 404, { error: 'not found' });
      if (me.role === 'instructor') {
        // instructors may only check attendees in/out on their own sessions
        const s = readJSON('sessions.json', []).find((x) => x.id === bookings[i].sessionId);
        if (!s || s.instructor.toLowerCase().trim() !== (me.instructorName || '').toLowerCase().trim()) return sendJSON(res, 403, { error: 'Not your session' });
        if (b.attendance !== undefined) bookings[i].attendance = b.attendance;
      } else {
        ['status', 'paymentStatus', 'attendance'].forEach((f) => { if (b[f] !== undefined) bookings[i][f] = b[f]; });
      }
      writeJSON('bookings.json', bookings); return sendJSON(res, 200, bookings[i]);
    }
  }

  // ---- waitlist ----
  if (resource === 'waitlist') {
    const wl = readJSON('waitlist.json', []);
    if (method === 'POST' && !id) {
      const b = await readBody(req);
      const entry = { id: 'wl_' + crypto.randomBytes(5).toString('hex'), sessionId: b.sessionId, name: b.name || '', email: b.email || '', phone: b.phone || '', quantity: Math.max(1, parseInt(b.quantity) || 1), createdAt: Date.now() };
      wl.push(entry); writeJSON('waitlist.json', wl); return sendJSON(res, 201, { ok: true });
    }
    if (method === 'GET') { if (!requireAdmin()) return; return sendJSON(res, 200, wl); }
    if (method === 'DELETE' && id) { if (!requireAdmin()) return; writeJSON('waitlist.json', wl.filter((x) => x.id !== id)); return sendJSON(res, 200, { ok: true }); }
    if (method === 'POST' && id && action === 'promote') { // move to a booking
      if (!requireAdmin()) return;
      const entry = wl.find((x) => x.id === id); if (!entry) return sendJSON(res, 404, { error: 'not found' });
      const all = readJSON('sessions.json', []); const bookings = readJSON('bookings.json', []);
      const s = all.find((x) => x.id === entry.sessionId); if (!s) return sendJSON(res, 400, { error: 'session gone' });
      if (s.maxSeats - seatsBooked(s.id, bookings) < entry.quantity) return sendJSON(res, 409, { error: 'still full' });
      const meta = readJSON('booking_meta.json', { seq: 1001 });
      const booking = { id: 'bk_' + crypto.randomBytes(7).toString('hex'), number: 'HS-' + meta.seq, sessionId: s.id, sessionTitle: s.title, category: s.category, date: s.date, time: s.time, duration: s.duration, location: s.location, instructor: s.instructor, customer: { name: entry.name, email: entry.email, phone: entry.phone }, attendees: [], quantity: entry.quantity, subtotal: s.price * entry.quantity, discountCode: '', discount: 0, total: s.price * entry.quantity, paymentStatus: 'pending', status: 'confirmed', attendance: 'booked', createdAt: Date.now() };
      meta.seq += 1; writeJSON('booking_meta.json', meta);
      bookings.unshift(booking); writeJSON('bookings.json', bookings);
      writeJSON('waitlist.json', wl.filter((x) => x.id !== id));
      return sendJSON(res, 201, { ok: true, number: booking.number });
    }
  }

  // ---- session reviews ----
  if (resource === 'session-reviews') {
    const reviews = readJSON('session_reviews.json', []);
    if (method === 'GET') {
      const approvedOnly = !isAuthed(req);
      let list = approvedOnly ? reviews.filter((r) => r.approved) : reviews;
      const sid = url.searchParams.get('session'); if (sid) list = list.filter((r) => r.sessionId === sid);
      return sendJSON(res, 200, list);
    }
    if (method === 'POST' && !id) {
      const b = await readBody(req);
      reviews.unshift({ id: 'rv_' + crypto.randomBytes(5).toString('hex'), sessionId: b.sessionId || '', name: b.name || 'Anonymous', rating: Math.min(5, Math.max(1, +b.rating || 5)), text: b.text || '', approved: false, createdAt: Date.now() });
      writeJSON('session_reviews.json', reviews); return sendJSON(res, 201, { ok: true });
    }
    if (method === 'PATCH' && id) { if (!requireAdmin()) return; const i = reviews.findIndex((r) => r.id === id); if (i < 0) return sendJSON(res, 404, {}); reviews[i].approved = !!(await readBody(req)).approved; writeJSON('session_reviews.json', reviews); return sendJSON(res, 200, reviews[i]); }
    if (method === 'DELETE' && id) { if (!requireAdmin()) return; writeJSON('session_reviews.json', reviews.filter((r) => r.id !== id)); return sendJSON(res, 200, { ok: true }); }
  }

  // ---- discounts ----
  if (resource === 'discounts') {
    const discounts = readJSON('discounts.json', []);
    if (method === 'POST' && id === 'validate') { // public preview
      const b = await readBody(req);
      const d = discounts.find((x) => x.active && x.code.toLowerCase() === String(b.code || '').toLowerCase());
      if (!d) return sendJSON(res, 404, { error: 'Invalid code' });
      const sub = +b.subtotal || 0;
      return sendJSON(res, 200, { code: d.code, discount: d.type === 'percent' ? Math.round(sub * d.value / 100) : Math.min(sub, d.value), note: d.note });
    }
    if (method === 'GET') { if (!requireAdmin()) return; return sendJSON(res, 200, discounts); }
    if (method === 'POST') { if (!requireAdmin()) return; const b = await readBody(req); discounts.push({ code: (b.code || '').toUpperCase(), type: b.type || 'percent', value: +b.value || 0, active: b.active !== false, note: b.note || '' }); writeJSON('discounts.json', discounts); return sendJSON(res, 201, { ok: true }); }
    if (method === 'DELETE' && id) { if (!requireAdmin()) return; writeJSON('discounts.json', discounts.filter((d) => d.code !== id)); return sendJSON(res, 200, { ok: true }); }
  }

  // ---- booking analytics ----
  if (resource === 'booking-stats' && method === 'GET') {
    if (!requireAdmin()) return;
    const bookings = readJSON('bookings.json', []);
    const all = readJSON('sessions.json', []);
    const confirmed = bookings.filter((b) => b.status === 'confirmed');
    const todayStr = new Date().toISOString().slice(0, 10);
    const ticketsSold = confirmed.reduce((n, b) => n + b.quantity, 0);
    const revenue = confirmed.filter((b) => b.paymentStatus === 'paid').reduce((s, b) => s + b.total, 0);
    const upcoming = all.filter((s) => s.status === 'published' && s.date >= todayStr);
    const capacity = upcoming.reduce((n, s) => n + s.maxSeats, 0);
    const filled = upcoming.reduce((n, s) => n + seatsBooked(s.id, confirmed), 0);
    const past = confirmed.filter((b) => b.date < todayStr);
    const attended = past.filter((b) => b.attendance === 'checked-in').reduce((n, b) => n + b.quantity, 0);
    const pastTickets = past.reduce((n, b) => n + b.quantity, 0);
    const bySession = {};
    confirmed.forEach((b) => { bySession[b.sessionTitle] = (bySession[b.sessionTitle] || 0) + b.quantity; });
    const popular = Object.entries(bySession).map(([title, tickets]) => ({ title, tickets })).sort((a, b) => b.tickets - a.tickets).slice(0, 5);
    const emails = confirmed.map((b) => (b.customer.email || '').toLowerCase()).filter(Boolean);
    const repeat = emails.length - new Set(emails).size;
    return sendJSON(res, 200, {
      ticketsSold, revenue,
      occupancy: capacity ? Math.round(filled / capacity * 100) : 0,
      upcomingRevenue: confirmed.filter((b) => b.date >= todayStr && b.paymentStatus === 'paid').reduce((s, b) => s + b.total, 0),
      attendanceRate: pastTickets ? Math.round(attended / pastTickets * 100) : 0,
      repeatCustomers: repeat, bookingsCount: confirmed.length,
      today: confirmed.filter((b) => b.date === todayStr).length,
      popular, upcomingSessions: upcoming.length,
    });
  }

  // ---- Stripe payments ----
  if (resource === 'stripe') {
    if (id === 'config' && method === 'GET') return sendJSON(res, 200, { enabled: !!STRIPE_KEY });

    if (id === 'checkout' && method === 'POST') {
      if (!STRIPE_KEY) return sendJSON(res, 400, { error: 'Stripe is not configured' });
      const b = await readBody(req);
      const type = b.type === 'booking' ? 'booking' : 'order';
      const payload = b.payload || {};
      // compute the amount + label server-side (never trust client totals)
      let total = 0, label = '', email = payload.customer?.email || '';
      if (type === 'order') {
        const items = Array.isArray(payload.items) ? payload.items : [];
        if (!items.length) return sendJSON(res, 400, { error: 'empty cart' });
        const settings = readJSON('settings.json', {});
        const subtotal = items.reduce((s, i) => s + (+i.price || 0) * (+i.qty || 1), 0);
        const shipping = subtotal >= (settings.freeShipThreshold || 100) ? 0 : (settings.flatShipping || 25);
        total = subtotal + shipping;
        const n = items.reduce((s, i) => s + (+i.qty || 1), 0);
        label = `432Hz order — ${n} item${n > 1 ? 's' : ''}${shipping ? ' (incl. shipping)' : ''}`;
      } else {
        const all = readJSON('sessions.json', []);
        const s = all.find((x) => x.id === payload.sessionId);
        if (!s || s.status !== 'published') return sendJSON(res, 400, { error: 'Session unavailable' });
        const qty = Math.max(1, parseInt(payload.quantity) || 1);
        const bookings = readJSON('bookings.json', []);
        const booked = bookings.filter((x) => x.sessionId === s.id && x.status === 'confirmed').reduce((n2, x) => n2 + x.quantity, 0);
        if (s.maxSeats - booked < qty) return sendJSON(res, 409, { error: 'Not enough seats', remaining: s.maxSeats - booked });
        let sub = s.price * qty, discount = 0;
        if (payload.discountCode) {
          const d = readJSON('discounts.json', []).find((x) => x.active && x.code.toLowerCase() === String(payload.discountCode).toLowerCase());
          if (d) discount = d.type === 'percent' ? Math.round(sub * d.value / 100) : Math.min(sub, d.value);
        }
        total = sub - discount;
        label = `${s.title} — ${qty} ticket${qty > 1 ? 's' : ''}`;
      }
      if (total <= 0) return sendJSON(res, 400, { error: 'invalid amount' });
      // park the payload until payment confirms
      const pending = readPending();
      const pid = 'pp_' + crypto.randomBytes(8).toString('hex');
      pending.push({ id: pid, type, payload, createdAt: Date.now() });
      writeJSON('pending_payments.json', pending);
      const origin = siteOrigin(req);
      const successPath = type === 'order' ? '/checkout.html' : '/ticket.html';
      try {
        const session = await stripeCall('POST', '/v1/checkout/sessions', {
          mode: 'payment',
          'line_items[0][price_data][currency]': 'aed',
          'line_items[0][price_data][product_data][name]': label,
          'line_items[0][price_data][unit_amount]': String(Math.round(total * 100)),
          'line_items[0][quantity]': '1',
          success_url: origin + successPath + '?sid={CHECKOUT_SESSION_ID}',
          cancel_url: b.cancelUrl && String(b.cancelUrl).startsWith(origin) ? b.cancelUrl : origin + (type === 'order' ? '/checkout.html' : '/healing.html'),
          ...(email ? { customer_email: email } : {}),
          'metadata[pending_id]': pid,
        });
        return sendJSON(res, 200, { url: session.url });
      } catch (e) {
        writeJSON('pending_payments.json', readPending().filter((p) => p.id !== pid));
        return sendJSON(res, 502, { error: 'Stripe: ' + e.message });
      }
    }

    if (id === 'verify' && method === 'GET') {
      if (!STRIPE_KEY) return sendJSON(res, 400, { error: 'Stripe is not configured' });
      const sid = url.searchParams.get('sid');
      if (!sid || !/^cs_[a-zA-Z0-9_]+$/.test(sid)) return sendJSON(res, 400, { error: 'bad session id' });
      // idempotency: if this Stripe session already produced a record, return it
      const oHit = readJSON('orders.json', []).find((o) => o.stripeSessionId === sid);
      if (oHit) return sendJSON(res, 200, { ok: true, type: 'order', id: oHit.id, number: oHit.number });
      const bHit = readJSON('bookings.json', []).find((x) => x.stripeSessionId === sid);
      if (bHit) return sendJSON(res, 200, { ok: true, type: 'booking', id: bHit.id, number: bHit.number, booking: bHit });
      try {
        const cs = await stripeCall('GET', '/v1/checkout/sessions/' + encodeURIComponent(sid));
        if (cs.payment_status !== 'paid') return sendJSON(res, 200, { ok: false, status: cs.payment_status });
        const pid = cs.metadata && cs.metadata.pending_id;
        const pending = readPending();
        const rec = pending.find((p) => p.id === pid);
        if (!rec) return sendJSON(res, 404, { error: 'payment record not found' });
        let out;
        if (rec.type === 'order') {
          const order = placeOrder(rec.payload, { paymentStatus: 'paid', stripeSessionId: sid });
          order.status = 'paid';
          const orders = readJSON('orders.json', []); const i = orders.findIndex((o) => o.id === order.id);
          if (i >= 0) { orders[i].status = 'paid'; writeJSON('orders.json', orders); }
          out = { ok: true, type: 'order', id: order.id, number: order.number };
        } else {
          const booking = placeBooking(rec.payload, { paymentStatus: 'paid', stripeSessionId: sid, allowOverbook: true });
          out = { ok: true, type: 'booking', id: booking.id, number: booking.number, booking };
        }
        writeJSON('pending_payments.json', readPending().filter((p) => p.id !== pid));
        return sendJSON(res, 200, out);
      } catch (e) { return sendJSON(res, 502, { error: 'Stripe: ' + e.message }); }
    }
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
