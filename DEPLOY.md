# Deploying 432Hz to GitHub + Hostinger (Node.js)

This app is a single Node process (`server.js`) with **no npm dependencies**. It serves the
storefront, the admin portal, and the REST API, and listens on `process.env.PORT` (which
Hostinger provides automatically).

---

## 1. Push to GitHub

From the project folder (`432hz-website`):

```bash
git init                       # already initialised if you used the provided setup
git add .
git commit -m "432Hz store + admin"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

> `data/` and `assets/img/uploads/` are git-ignored on purpose, so deploys never overwrite
> live orders/products or uploaded images. The catalogue re-seeds itself on first run.

---

## 2. Create the Node.js app on Hostinger

In **hPanel → Websites → (your site) → Advanced → Node.js** (or cPanel → *Setup Node.js App*):

| Setting | Value |
|---|---|
| **Node.js version** | 18.x or newer |
| **Application mode** | Production |
| **Application root** | the folder your repo lives in (e.g. `domains/yourdomain.com/store`) |
| **Application URL** | your domain or subdomain |
| **Application startup file** | `server.js`  *(or `app.js` — both work)* |

Click **Create**.

---

## 3. Get the code onto the server

Either:

- **Git (recommended):** hPanel has a *Git* tool — connect your GitHub repo and deploy the
  `main` branch into the Application root. Re-deploy pulls future changes.
- **Or SSH:** `git clone https://github.com/<you>/<repo>.git` into the Application root.
- **Or upload:** zip the folder and upload via File Manager (exclude `node_modules`, `data`).

---

## 4. Install, configure, start

In the Node.js app panel:

1. **Run NPM Install** — there are no dependencies, so this is quick (and harmless).
2. **Add environment variables:**
   - `ADMIN_PASSWORD` = *a strong password of your choice* (this replaces the default `changeme432`).
   - `STRIPE_SECRET_KEY` = your Stripe secret key — enables real payments (see below). Optional; without it, checkout runs in demo mode.
3. Click **Start / Restart Application**.

### Stripe payments

1. Create an account at [dashboard.stripe.com](https://dashboard.stripe.com) and activate it for the UAE.
2. **Developers → API keys** → copy the **Secret key** (`sk_live_…` for real payments, `sk_test_…` to test first).
3. Add it as the `STRIPE_SECRET_KEY` environment variable in the Hostinger Node.js panel → **Restart Application**.
4. That's it — shop checkout and session bookings now redirect to **Stripe Checkout** (cards; Apple Pay & Google Pay appear automatically once your domain is verified under Stripe → Settings → Payment methods).
5. Test with card `4242 4242 4242 4242` (any future date / any CVC) while using an `sk_test_` key, then swap to the live key.

Payments are verified server-side on return (the server confirms with Stripe that the
session is paid before the order/booking is created), so totals can't be tampered with.
Never commit the secret key to git — it lives only in the environment variable.

Hostinger sets `PORT` itself and proxies your domain to the app — you don't configure a port.

---

## 5. Verify

- Storefront: `https://yourdomain.com`
- Admin: `https://yourdomain.com/admin` → sign in with your `ADMIN_PASSWORD`

Add a product in the admin → it appears on the shop. Place a test order at checkout → it
appears in the admin dashboard.

---

## Notes & good practice

- **Persistence:** `data/*.json` and uploaded images live on the server's disk. Back them up
  periodically (download the `data/` folder). A Git re-deploy will *not* touch them.
- **After code changes:** push to GitHub, pull/redeploy on Hostinger, then **Restart Application**.
- **HTTPS:** enable the free SSL certificate in hPanel for your domain.
- **Before real customers:** add a real payment gateway (e.g. Stripe) and harden admin auth
  (hashed passwords + persistent sessions). The current auth is session-cookie based and is
  fine for a small/owner-operated store, but is not a substitute for a full auth system.
- **Custom domain email/links** already point to `info@432hz.ae` and `432hz.ae` branding.
