# APT Rent — Front End (Login / Register UI)

Static HTML/CSS/JS front end for the APT Rent apartment rental platform.
This first drop covers the landing page navbar and the Login / Register UI only —
no backend, no real authentication yet.

## Run it

No build step. Open `index.html` directly, or serve the folder locally
(recommended, so relative paths and any future `fetch()` calls behave):

```bash
# from the apt-rent/ folder
npx serve .
# or
python3 -m http.server 5500
```

Then visit `http://localhost:5500` (or whatever port your tool prints).

## Structure

```
APR_Rent/
├── index.html            → Landing page (navbar + hero search)
├── src/pages/
│   ├── login.html
│   └── register.html
├── src/css/
│   ├── global.css        → design tokens, reset, buttons, shared layout
│   ├── navbar.css        → navigation bar
│   ├── home.css          → hero + search bar (landing page only)
│   └── auth.css          → login/register split-panel + form styling
├── src/js/
│   ├── main.js           → mobile menu, locked-tab redirect, demo auth state
│   └── auth.js           → password toggle, role tabs, occupation fields, validation
├── src/assets/
│   ├── images/logo/      → apt-rent-logo.svg
│   ├── images/backgrounds/ (empty — drop hero/background images here later)
│   └── icons/            → search, user, email, lock, eye, upload, menu, close
├── .gitignore
└── README.md
```

## Design system

- **Palette:** deep blueprint navy (`--color-ink`), secondary blue
  (`--color-blueprint`), brass accent (`--color-brass`), warm paper background
  (`--color-paper`). All defined as CSS variables in `css/global.css`.
- **Type:** Fraunces (display/headings), Inter (body/UI), JetBrains Mono
  (small labels like "APT RENT // EST. 2026").
- **Signature motif:** the logo is a key-bow drawn as a house; the hero search
  bar is styled like a physical key tag (punched ring + dashed seam); auth
  cards and the hero use blueprint grid lines and drafting-style corner marks.

## Known front-end-only behavior (to replace later)

- `src/js/main.js` and `src/js/auth.js` use `localStorage` to fake a signed-in state
  and to lock the "Properties" / "About" nav tabs until "login." Replace this
  with real session/auth checks once the backend exists.
- Login/Register forms don't send data anywhere — submitting just flips the
  demo auth flag and redirects home.
- File inputs (profile picture, NID, ID card, trade license) only show the
  chosen filename; nothing is uploaded.

See inline comments in each file for more detail.
