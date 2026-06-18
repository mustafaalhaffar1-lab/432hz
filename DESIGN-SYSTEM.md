# 432Hz — Design System & UX Strategy
### "The Frequency of Calm"

A luxury holistic-wellness commerce experience for **432hz.ae**. Built from the live
site's real brand DNA — products, prices, voice, testimonials, and positioning — and
elevated to the standard of a world-class creative agency.

---

## 1. Brand positioning

> **Where elegance meets elevated energy.**
> Reconnect with the Earth's frequency.

432Hz is not "a store." It is a *return to yourself* — a quiet, premium ritual practice
sold as objects. Every decision reinforces: **Energy · Balance · Healing · Frequency ·
Mindfulness · Rituals · Conscious living**.

The voice is **inspiring, sophisticated, authentic, emotional, trustworthy — never salesy.**

---

## 2. Color system

| Token | Hex | Role |
|---|---|---|
| `--bone` | `#F5F1E8` | Warm paper — primary light background |
| `--bone-deep` | `#ECE6D8` | Sectioned/alt background |
| `--sand` | `#E2D8C3` | Soft cards / media placeholders |
| `--pine` | `#1C2620` | Near-black forest — primary dark surface |
| `--pine-deep` | `#131A16` | Deepest dark / footer |
| `--gold` | `#C7A45A` | **Gold leaf — primary accent** (CTAs, highlights) |
| `--gold-soft` | `#DFC78E` | Italic display accents on dark |
| `--clay` | `#B07A52` | Terracotta — eyebrows, secondary accent |
| `--sage` | `#8E9A85` | Muted green — tertiary |
| `--ink` | `#14181A` | Body text |

**Principle:** earth tones ground the brand; gold appears *only* on intentional moments
(CTA fills, accents, the "432Hz" mark) so it always reads as precious, never decorative.

---

## 3. Typography

| Use | Family | Notes |
|---|---|---|
| Display / headlines | **Fraunces** (variable serif) | Editorial, soft, expressive italics for emotional words |
| Body / UI | **Hanken Grotesk** | Clean, warm grotesk; 400–700 |

- Fluid scale via `clamp()`: `--fs-mega` (hero) → `--fs-small` (labels).
- Headlines use tight tracking (`-.015em`); labels/eyebrows use wide tracking (`.18em`, uppercase).
- Emotional keywords are set in *italic gold* (e.g. "the **Earth's** frequency").

---

## 4. Motion language

Premium, slow, purposeful — never gimmicky. `--ease-out: cubic-bezier(.22,1,.36,1)`.

- **Scroll reveals** — `[data-reveal]` fade-up via IntersectionObserver; `mask` (clip-path)
  and `scale` variants; staggered with `--d` delay.
- **Split-line headline reveal** — `.reveal-lines` translates text up from behind a mask.
- **Hero frequency canvas** — live concentric breathing rings + flowing sine wave in gold.
- **Parallax** — `[data-parallax]` on hero copy and figures.
- **Micro-interactions** — button gold-fill wipe, link underline grow, card lift + image
  zoom, quick-add slide-up, nav underline.
- **Marquee** — infinite brand-value ribbon, pauses on hover.
- All motion is disabled under `prefers-reduced-motion`.

---

## 5. Sitemap

```
Home  (index.html)
├── Hero · Philosophy · Collections · Ritual Builder
├── Best-sellers · The Practice · Testimonials · Journal · Newsletter · Trust
│
Shop  (collections)
├── Intention Kits · Luxury Scents · Healing Crystals · Accessories
│
Product  (product.html)        ← luxury PDP template
├── Gallery · Info/Buy · Benefits (scent/stone/sound) · Ritual steps
├── FAQ · Frequently bought together
│
Ritual Builder  (#ritual)      ← intent-driven product discovery
Journal  (educational hub)
Our Story / About
Cart drawer · Wishlist · Search (global)
Footer: Care policies, contact, social
```

---

## 6. Homepage structure (wireframe order)

1. **Hero** — full-bleed pine gradient + animated frequency canvas, split-reveal headline,
   dual CTA ("Shop the rituals" / "Build your ritual"), scroll cue.
2. **Value marquee** — Energy · Balance · Healing · Frequency…
3. **The Philosophy** — founder story + the "432Hz" frequency emblem + three principles.
4. **Collections** — four-card grid (the real categories) with hover zoom.
5. **Ritual Builder** — pick an intention (Relaxation, Energy, Meditation, Sleep, Focus,
   Spiritual Growth, Self-Care) → a composed ritual appears, add-to-cart inline.
6. **Best-sellers** — real products (Protection / Abundance / Love rituals, Oud box) +
   crystals + a bundle, with quick-add.
7. **The Practice** — 3-step "how to ritual" band.
8. **Community** — real testimonials in a draggable/arrow slider.
9. **Journal** — editorial education cards.
10. **Newsletter** — "join the frequency," 10% off, framed as a movement.
11. **Trust strip** — sourcing, free GCC shipping, returns, support.
12. **Footer** — full nav, contact, socials, oversized "432Hz" wordmark.

---

## 7. Component library

`btn` (+ `btn-light`, `btn-ghost`) · `link-underline` · `eyebrow` · `marquee` ·
`coll-card` · `prod-card` (badge, fav, quick-add, rating) · `intent` chip ·
`ritual__panel` · `t-card` slider · `j-card` · `nl-form` · `trust-item` ·
`cart-drawer` + `overlay` · `mobile-nav` · `toast` · `progress` bar ·
`ring-svg` frequency emblem · PDP: `gallery`, `qty-stepper`, `faq` accordion.

---

## 8. Commerce / conversion mechanics (implemented)

- **Ritual Builder** — personalized, intent-based discovery (AI-style "tell us how you
  want to feel").
- **Quick add** + **slide-out cart drawer** with live totals, qty steppers, free-shipping note.
- **Bundle** ("The Ritual Library", save 18%) and **frequently-bought-together** on PDP.
- **Social proof** everywhere — ratings, review counts, regional testimonials.
- **Scarcity / status** — "Limited", "Bestseller", "New" badges.
- **Newsletter capture** as a movement, 10% incentive.
- **Trust signals** — sourcing, shipping, returns, support.

---

## 9. Mobile-first

- Single-column reflows for every grid at 640px; ritual result + builder stack.
- Full-screen serif **mobile nav** with contact block — app-like, not a hamburger list.
- Sticky cart access; large tap targets; hero recenters and stacks CTAs.
- Reduced-motion respected; canvas pauses when tab hidden.

---

## 10. Performance & accessibility

- **Zero build step, zero framework** — one CSS file, one JS file, system + 2 Google fonts
  (`display=swap`, preconnect). Fast first paint, trivial to host anywhere.
- Semantic landmarks (`header/nav/main/section/footer`), `aria-label`s on icon buttons,
  keyboard `Esc` closes cart, visible focus via native controls.
- SVG iconography & emblems (crisp, weightless). Replace placeholder product SVGs with the
  real photography from 432hz.ae's CDN to ship.
- `prefers-reduced-motion` fully honored.

---

## 11. To productionize

1. Swap placeholder SVG product art for real images (Shopify CDN or `/assets/img`).
2. Wire cart/checkout to the real backend (Shopify Storefront API or custom).
3. Connect the newsletter form to the existing ESP.
4. Add remaining routes (collection listing, About, policies, Journal articles) from this
   same component set.
```
