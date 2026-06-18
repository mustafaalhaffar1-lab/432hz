# 432Hz — Luxury Wellness Storefront

A hand-built, framework-free reimagining of [432hz.ae](https://432hz.ae) as a premium,
immersive holistic-wellness experience. Real brand content, elevated.

## Run it
Requires Node (no npm dependencies). Start the server:

```bash
node server.js
# → 432Hz store + admin at http://localhost:8099
```

- **Storefront:** http://localhost:8099
- **Admin portal:** http://localhost:8099/admin  (default password `changeme432`)

Set a real password with the `ADMIN_PASSWORD` env var.

## Structure
```
server.js               Zero-dependency Node server: static + REST API + auth + uploads
data/                   JSON datastore (auto-seeded on first run)
  products.json  orders.json  settings.json  meta.json
index.html              Homepage
collection.html         Shop listing (renders live from /api/products)
product.html            Product detail page
checkout.html           Cart → creates a real order via /api/orders
about / journal / article / policies / gift   Brand + content + tools
admin/                  Back office (index.html, admin.css, admin.js)
assets/css/styles.css   Storefront design system
assets/js/main.js       Storefront interactions + persistent cart
assets/img/uploads/     Admin-uploaded product images
DESIGN-SYSTEM.md        Colors, type, motion, sitemap, components
```

## Admin portal
Dashboard (revenue / orders / pending / products + recent orders) · Products CRUD with
drag-free image upload, inventory, status, badges · Orders list + detail + status updates ·
Settings (store info, shipping). Cookie-session auth.

## API
`GET/POST/PUT/DELETE /api/products` · `GET/POST/PATCH /api/orders` · `POST /api/upload` ·
`GET/PUT /api/settings` · `GET /api/stats` · `POST /api/login` · `POST /api/logout` · `GET /api/me`.
Write routes require an admin session; `GET /api/products` and `POST /api/orders` (checkout) are public.

## The commerce loop (verified)
Admin adds/edits a product → appears on the storefront collection → customer adds to cart
(persists across pages) → checkout creates an order → order shows in admin, stock decremented.

**Reset data:** delete the `data/` folder and restart — it re-seeds the catalogue.

See `DESIGN-SYSTEM.md` for the full design spec.
