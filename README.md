# Website of Phos

A light, one-page site for **Phos** — a research and development lab making
breakthroughs in plasma-based computing. Phos works on the fundamental research
behind plasma-based computers and on applications where plasma computing is
uniquely better than conventional approaches (silicon, photonics).

Live one-pager built to be pushed straight to GitHub Pages. No build step, no
dependencies — just static `index.html`, `styles.css`, `particles.js`, and the
`assets/`.

## Design notes

We wanted plasma to be the medium, not just the subject. The brief was *plasma
and fun moving graphics, but also light and ephemeral* — so:

- **Deep-space canvas, glowing accents.** A near-black background lets the plasma
  colours (magenta → violet → cyan, pulled from the brand imagery) glow rather
  than sit flat. Soft animated aurora blobs + a fine grain keep it airy.
- **Particles that *are* the pictures.** Each featured image is sampled and
  rebuilt out of thousands of glowing plasma particles that swarm into its shape.
  Hover/move your cursor over one and the particles scatter away from you, light
  up, then spring back into place — the "simulation made real" idea, literally.
- **Ephemeral motion everywhere.** An ambient field of drifting motes leans
  gently toward your cursor; sections fade up as you scroll; elegant serif
  display type (Cormorant Garamond) keeps it weightless.
- **Light to ship.** Vanilla JS, a single shared glow sprite, particle counts
  that adapt to screen size, animation paused for off-screen canvases, and full
  `prefers-reduced-motion` support.

## Content

Copy and assets are preserved from the reference site (phosworld.com): the
electromagnetism thesis, the sim-to-real gap, plasma-as-substrate, the
hardware-in-the-loop / fusion work, and the team/mission. Originals live in
[`assets/`](assets/) at full resolution.

## Run locally

Any static server works (needed so the browser can read image pixels for the
particle effect — `file://` will block that):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repo.
2. **Settings → Pages → Build and deployment → Source: _Deploy from a branch_**,
   pick `main` / `/ (root)`, save.
3. The site goes live at `https://<user>.github.io/<repo>/`.

`.nojekyll` is included so GitHub serves the files as-is.

> To use a custom domain (e.g. `phosworld.com`), add a `CNAME` file containing
> the domain and configure DNS in your registrar.

## Editing

- **Copy / sections:** edit `index.html`.
- **Colours, type, spacing:** CSS variables at the top of `styles.css`.
- **Particle behaviour:** tweak per-canvas via `data-density` / `data-accent`
  attributes on each `<canvas class="particle-canvas">`, or the constants in
  `particles.js`.
- **Contact email:** `susan@phosteam.com` in the Contact section of
  `index.html`.
