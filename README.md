# 7x7 Stories — team hub & brand house

A one-page website for the 7x7 Stories team: project status and dates, team structure, how we work, how to get involved, the full brand house, and downloadable logos.

There are two versions while the team votes on the logo:

- `index.html` — **Option A: mural.** The bottom-left block becomes an orange tail; color sweeps across into the mural palette.
- `option-b.html` — **Option B: one big bubble.** Same start; orange sweeps across and the grid closes into one solid orange speech bubble.

Each page links to the other from the bar under the header.

### After the vote

- **Option A wins:** delete `option-b.html` and `assets/logos/7x7-mark-bubble*`, and remove the `<div class="optbar"…>` line from `index.html`.
- **Option B wins:** delete `index.html`, rename `option-b.html` to `index.html`, delete `assets/logos/7x7-mark-mural*`, and remove the `optbar` line.


## Put it online with GitHub Pages (about 5 minutes)

1. Sign in to GitHub and create a new repository (e.g. `7x7-stories`). Public is required on a free account.
2. Click **Add file → Upload files**, drag in everything from this folder (including the `assets` folder and the hidden `.nojekyll` file), and commit.
3. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After a minute or two the site is live at `https://<your-username>.github.io/7x7-stories/`.

The page tells search engines not to index it, but anyone with the link can open it. Keep private details (phone numbers, personal emails, youth names, Drive links, waivers) off the site.

## Keeping it up to date

Everything is in `index.html` (and `option-b.html` until the vote). The parts that change most are marked with comments:

- **Where we are** — edit the status sentence and the "Last updated" date. In the dates list, move `class="next"` to the next upcoming date and add `class="past"` to dates that have passed. When spending is approved, change `<span class="dot"` to `<span class="dot go"` and rewrite the status line.
- **Team** — once roles are settled, replace "Youth leader A/B/C" with first names if everyone is comfortable with that.

Edit directly on GitHub (open `index.html`, click the pencil icon, commit). The live site updates within a minute or two.

## What's in here

- `index.html` — the whole site (styles and script included)
- `assets/logos/` — every logo version as SVG, plus 1080px PNGs of the primary mark and avatar (use the PNG for YEF uploads and Instagram)
- `assets/patterns/` — the mural tile pattern
- `favicon.png`, `.nojekyll`

Fonts (Space Grotesk, DM Sans) load from Google Fonts; if they can't load, the page falls back to system fonts.
