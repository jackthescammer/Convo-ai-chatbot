# Convo landing page (local demo)

Static HTML/CSS/JS, no build step. It imports the shared mascot engine from `../mascot/`, so serve the **project root**, not this folder:

```sh
python -m http.server 5500 --bind 127.0.0.1
```

Then open http://127.0.0.1:5500/landing/

- `index.html`: the page. `styles.css`: tokens and styles (see `DESIGN.md` at the project root). `app.js`: the hero flow ribbon (English into Mandarin; sentence pairs in `FLOW_LINES`), layer toggles, sample conversation player, difficulty tabs, mascot events.
- `demo.html`: target of every "Try the café demo" link; forwards to the demo app in `../app/` (see `app/README.md`).
- The conversation and report on the page are fixed samples, labelled as such.

## Deploy (Vercel)

Live at https://tryconvo.vercel.app (project `convo-ai`). From the **project root**:

```sh
npx vercel@latest --prod
```

- `vercel.json` serves `landing/` at `/`; `../mascot/convo-mascot.js` still resolves, so the source needs no changes.
- `.vercelignore` is an allowlist: only `landing/` (minus this README), `mascot/convo-mascot.js` and `vercel.json` are uploaded. CLAUDE.md, DESIGN.md, PRODUCT.md, `.claude/`, `.impeccable/` and `.env.local` stay local. Add any new public folder to it.
- convo.app and convo-ai.vercel.app belong to other people, which is why the site uses tryconvo.vercel.app.
