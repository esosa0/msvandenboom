# Ms van den Boom — Sewing Portfolio

A one-page sewing portfolio built with plain HTML, CSS and JavaScript. No build step, no frameworks, no database. It's ready to publish with GitHub Pages.

```
index.html     page structure: header, intro, makes, about, contact, project viewer
styles.css     all styling (colours and fonts are variables at the top)
projects.js    ← YOUR PORTFOLIO DATA: every make lives here
script.js      filtering, the project viewer, make links, keyboard support
images/        photos
```

---

## 1. Run the site locally

**Easiest:** double-click `index.html` to open it in your browser. Everything works straight from the file.

**With a local server** (closer to how GitHub Pages serves it):

```bash
cd path/to/msvandenboom
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Press `Ctrl+C` to stop.

---

## 2. Add a new sewing project

Open **`projects.js`**. Copy an existing `{ ... },` block inside `PROJECTS`, paste it where you want it to appear (the grid follows this order), and edit it. You don't need to touch the HTML.

```js
{
  id: "ash-jeans",                    // unique, lowercase, dashes instead of spaces
  title: "Ash Jeans",
  categories: ["featured", "bottoms"],// see list below; a make can be in several
  images: [                           // the FIRST image is the cover in the grid
    { src: "images/ash-jeans-1.jpg", alt: "Indigo Ash Jeans, front view" },
    { src: "images/ash-jeans-2.jpg", alt: "Back pockets and yoke" },
  ],
  description: "One or two sentences shown under the title in the viewer.",

  // Shown in the viewer, in this order (empty rows are hidden)
  pattern: "Ash Jeans",
  company: "Megan Nielsen",           // or leave empty for self-drafted
  patternUrl: "https://...",          // optional: makes the pattern name a link
  patternNote: "hacked into shorts",  // optional: short note after the pattern name
  // patterns: [{ name, company, url, note }, ...]  // use instead when a make combines patterns
  modifications: ["Shortened by 2\"", "Added ½\" to the back rise"],
  fabric: "Stretch denim",
  features: ["fly front", "back yoke"],       // what the make has; shown as a sentence
  skills: ["Zip insertion", "Topstitching"],  // techniques used; shown as pills (3 to 5)

  // Not shown on the site yet, handy for your own records
  view: "Straight leg",
  size: "10",
  yardage: "2 yd",
  notions: "Jeans button, rivets, zip",
  interfacing: "Waistband",
  stretch: "20% horizontal",
  dateMade: "2025-09",
  fabricSource: "Fabric shop name",
  fiber: "98% cotton, 2% elastane",
  fabricWeight: "11 oz",
  fitNotes: "How it fits.",
  sizing: "Sizing observations.",
  makeAgain: true,                    // true or false
  rating: 4,                          // 1–5
  notes: "Free-form notes.\n\nA blank line starts a new paragraph.",
},
```

Category keys: `featured`, `tops`, `bottoms`, `dresses` (dresses and jumpsuits), `outerwear`, `swimwear`, `kids`, `bags`, `accessories`, `quilting`, `other`. Add `featured` to any make you want on the default view, then add its id to `FEATURED_ORDER` near the top of `projects.js` to set where it appears.

Tips:
- Any field can be `""` or left out. Empty rows are hidden automatically.
- `company` and `pattern` show together in the viewer's Pattern row ("Anna Bag by Sallie Tomato"). If both are empty, the row is hidden.
- Each make has its own link built from its `id`, like `yoursite.com/#make/harlequin-tote`. Changing a title doesn't break the link, but changing an `id` does, so leave ids alone once you've shared links.
- To rename, add or remove a filter button, edit the `CATEGORIES` list at the top of `projects.js`.
- Watch the commas: every `{ ... }` block ends with `},`, and text containing `"` needs a backslash (`\"`).

---

## 3. Where to put project images

Put photos in the **`images/`** folder and refer to them as `images/your-file.jpg` in `projects.js`.

- **Shape:** portrait 4:5 (e.g. 1600 × 2000 px) fits the grid best. Other shapes are cropped in the grid but shown in full in the viewer.
- **Size:** export at about 1600px on the long edge and compress with something like [Squoosh](https://squoosh.app). Aim for under 300 KB per photo so the site stays fast.
- **Naming:** `project-id-1.jpg`, `project-id-2.jpg`, … keeps things tidy.
- **Alt text:** describe each photo briefly (e.g. "Olive wide-leg trousers, side view"). Screen-reader users rely on it.

---

## 4. Change the About text (and intro)

Both are in **`index.html`**. Search for these comments:

- **Intro:** the `INTRO` section has the portrait (`images/portrait.jpg`), the "Hi, I'm Ms. Van den Boom." heading and the intro paragraph.
- **About:** the `ABOUT` section has the studio photo (`images/studio.jpg`) and the About paragraphs.

---

## 5. Change contact information

In **`index.html`**, find the `CONTACT` section. Update:

- the email in both the `mailto:` link and the visible text
- the Instagram link and handle

---

## 6. Deploy with GitHub Pages

1. Create a new repository on GitHub, e.g. `msvandenboom`. Name it `your-username.github.io` instead if you want the site at the root of that address.
2. Upload these files. Either drag them into the repository page on github.com ("Add file → Upload files") or use git:
   ```bash
   cd path/to/msvandenboom
   git init
   git add .
   git commit -m "First version of portfolio"
   git branch -M main
   git remote add origin https://github.com/your-username/msvandenboom.git
   git push -u origin main
   ```
3. On GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, set *Source* to **Deploy from a branch**, then choose branch **main** and folder **/ (root)**. Click **Save**.
5. After a minute or two the site is live at `https://your-username.github.io/msvandenboom/`.

All paths in the site are relative, so it works at either `your-username.github.io` or `your-username.github.io/repository-name/`.

To update the site later, edit the files and push or upload again. GitHub republishes automatically.

---

## 7. Connect a custom domain

1. Buy a domain from any registrar (Namecheap, Cloudflare, Porkbun, etc.).
2. On GitHub: **Settings → Pages → Custom domain**, enter it (e.g. `msvandenboom.com`) and **Save**. This adds a `CNAME` file to the repository. Keep it.
3. At your registrar, add these DNS records:

   | Type  | Name / Host | Value                     |
   |-------|-------------|---------------------------|
   | A     | `@`         | `185.199.108.153`         |
   | A     | `@`         | `185.199.109.153`         |
   | A     | `@`         | `185.199.110.153`         |
   | A     | `@`         | `185.199.111.153`         |
   | CNAME | `www`       | `your-username.github.io` |

   For a subdomain only (e.g. `sewing.example.com`), add a single CNAME record from `sewing` to `your-username.github.io`.
4. DNS can take from a few minutes to 24 hours to update. When GitHub shows the domain as verified, tick **Enforce HTTPS**.

See GitHub's guide, "Managing a custom domain for your GitHub Pages site", if anything gets stuck.

---

## Customising the look

The colours and fonts are CSS variables at the top of `styles.css` (`--sage`, `--bg`, `--serif`, …). The fonts are Cormorant Garamond for headings and DM Sans for text, loaded from Google Fonts in `index.html`.
