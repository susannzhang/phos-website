# Website of Phos

The website for **Phos** — a research and development lab making breakthroughs
in plasma-based computing. Phos works on the fundamental research behind
plasma-based computers and on applications where plasma computing is uniquely
better than conventional approaches (silicon, photonics).

This repo is a **static, self-contained snapshot of the original phosworld.com
site** (built on Squarespace), localized so it serves entirely from this repo
with no Squarespace dependency. It's deployed via GitHub Pages and live at
**https://phosworld.com**.

## What's here

| Path | Purpose |
|------|---------|
| `index.html` | Home page (served at the site root) |
| `contact/index.html` | Contact page → `/contact` |
| `cart/index.html` | Cart page → `/cart` |
| `assets/` | Full-resolution brand images, logo, favicon |
| `og_assets/` | Localized Squarespace scripts, styles, and component bundles |
| `CNAME` | Custom domain (`phosworld.com`) for GitHub Pages |
| `.nojekyll` | Tells GitHub Pages to serve files as-is |
| `DEPLOY-phosworld-domain.txt` | Step-by-step DNS / custom-domain notes |

All internal navigation uses **relative links**, so it works both at the apex
domain (`phosworld.com`) and under a project path
(`<user>.github.io/<repo>/`).

## How it was made

The original Squarespace pages were saved, then every external reference
(scripts, stylesheets, component bundles, images) was downloaded into
`og_assets/` / `assets/` and rewritten to point at those local copies. Nav
links were converted from absolute (`/contact`) to relative (`contact/`) so the
multi-page snapshot resolves correctly anywhere it's hosted. Google Fonts are
still loaded remotely.

> An earlier custom build — a dynamic "plasma particle" one-pager — lived at
> `index_plasma.html` with `styles.css` / `particles.js`. It was removed but
> remains recoverable from git history (and the `original` tag marks this
> snapshot).

## Run locally

Use any static server (so relative paths resolve like they do in production):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

GitHub Pages serves the `main` branch — **every push auto-redeploys**.

First-time setup: **Settings → Pages → Build and deployment → Source: _Deploy
from a branch_**, pick `main` / `/ (root)`. For the custom domain, the `CNAME`
file plus the DNS records in
[`DEPLOY-phosworld-domain.txt`](DEPLOY-phosworld-domain.txt) point
`phosworld.com` at GitHub Pages.

## Editing notes

- **Page content:** edit the relevant `index.html` (home, `contact/`, `cart/`).
  These are Squarespace-exported markup, so they're verbose — search for the
  visible text to find what to change.
- **Contact email:** `susan@phosteam.com`, in the Contact section.
- **Caveat — the contact form doesn't submit.** On the original it POSTed to
  Squarespace's backend, which doesn't exist on static hosting. To make it work,
  wire it to a form service (e.g. Formspree) or a `mailto:`.
