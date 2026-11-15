/* =========================================================
   Ms van den Boom — portfolio behaviour
   Content lives in projects.js; you shouldn't need to edit
   this file to add or change makes.
   ========================================================= */
(function () {
  "use strict";

  const DEFAULT_FILTER = "featured";

  const projects = PROJECTS;
  const byId = new Map(projects.map((p) => [p.id, p]));

  // Each make gets a shareable address like #make/harlequin-tote, built from its id
  // (so renaming a make's title never breaks a link). Title-based links still work too.
  const titleSlug = (p) => p.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slugOf = (p) => p.id;
  const bySlug = new Map(projects.map((p) => [titleSlug(p), p]));
  const HASH_PREFIX = "#make/";
  const pageTitle = document.title;
  // Clean page path: "/index.html" shows as "/". Kept as-is for files opened
  // straight from disk, where the folder alone wouldn't load the site.
  const basePath = location.protocol.startsWith("http")
    ? location.pathname.replace(/\/index\.html$/, "/")
    : location.pathname;
  const addressFor = (hash = "") => basePath + location.search + hash;

  const $ = (id) => document.getElementById(id);
  const filtersEl = $("filters");
  const gridEl = $("grid");
  const countEl = $("makes-count");
  const emptyEl = $("makes-empty");

  const viewer = $("viewer");
  const scroller = $("viewer-scroll");
  const viewerFilter = $("viewer-filter");
  const viewerPosition = $("viewer-position");
  const prevBtn = $("viewer-prev");
  const nextBtn = $("viewer-next");
  const galleryEl = $("viewer-gallery");
  const mainImg = $("viewer-image");
  const thumbsEl = $("viewer-thumbs");
  const titleEl = $("viewer-title");
  const descriptionEl = $("viewer-description");
  const detailsEl = $("viewer-details");
  const liveEl = $("viewer-live");
  const bodyEl = $("viewer-body");
  const filmstripEl = $("viewer-filmstrip");
  const stripEl = $("viewer-strip");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let activeFilter = DEFAULT_FILTER;
  const cardButtons = new Map();
  const view = { list: [], filter: "all", index: 0, project: null, returnFocus: null };

  /* ---------- helpers ---------- */

  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value == null || value === false) continue;
        if (key === "class") node.className = value;
        else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value === true ? "" : value);
      }
    }
    for (const child of children.flat()) {
      if (child == null || child === false || child === "") continue;
      node.append(child instanceof Node ? child : String(child));
    }
    return node;
  }

  const labelFor = (key) => (CATEGORIES.find((c) => c.key === key) || { label: key }).label;
  // Featured always fills whole rows: at least 6 makes and at least two full rows
  // of the grid. Hand-picked makes (tagged "featured", ordered by FEATURED_ORDER)
  // come first, then the newest makes fill any remaining spots.
  let featuredIds = new Set();
  const matches = (p, key) => key === "all" ||
    (key === "featured" ? featuredIds.has(p.id) : (p.categories || []).includes(key));
  const featuredRank = (p) => {
    if (!(p.categories || []).includes("featured")) return 2e6;
    const i = (typeof FEATURED_ORDER !== "undefined" ? FEATURED_ORDER : []).indexOf(p.id);
    return i === -1 ? 1e6 : i;
  };
  // Picks first, then everything else in PROJECTS order (newest first).
  const featuredOrder = () => projects
    .map((p, i) => ({ p, i, r: featuredRank(p) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.p);
  // Number of columns the grid is showing right now (4, 3, 2 or 1).
  function gridColumns() {
    const cols = getComputedStyle(gridEl).gridTemplateColumns;
    const repeat = cols.match(/repeat\(\s*(\d+)/);
    if (repeat) return Number(repeat[1]);
    return cols.split(/\s+/).filter((t) => /^[\d.]+px$/.test(t)).length || 1;
  }
  // Returns true when the featured set changed.
  function computeFeatured() {
    const cols = gridColumns();
    const count = Math.ceil(Math.max(6, cols * 2) / cols) * cols;
    const next = new Set(featuredOrder().slice(0, count).map((p) => p.id));
    const changed = next.size !== featuredIds.size || [...next].some((id) => !featuredIds.has(id));
    featuredIds = next;
    return changed;
  }
  // Projects in a filter, in display order.
  function listFor(key) {
    if (key === "featured") return featuredOrder().filter((p) => featuredIds.has(p.id));
    return projects.filter((p) => matches(p, key));
  }
  const hasValue = (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);

  function imagesOf(p) {
    const list = p.images && p.images.length ? p.images : [];
    return list.map((img, i) =>
      typeof img === "string"
        ? { src: img, alt: `${p.title}, photo ${i + 1}` }
        : { src: img.src, alt: img.alt || `${p.title}, photo ${i + 1}` }
    );
  }

  function card(p, { eager = false, onClick }) {
    const cover = imagesOf(p)[0];
    return h("button", { type: "button", class: "make-link", "aria-haspopup": "dialog", onclick: onClick },
      h("span", { class: "make-media" },
        cover && h("img", { src: cover.src, alt: "", width: 800, height: 1000, loading: eager ? "eager" : "lazy", decoding: "async" })),
      h("span", { class: "make-caption" },
        h("span", { class: "make-title" }, p.title)));
  }

  /* ---------- filters & grid ---------- */

  function renderFilters() {
    filtersEl.replaceChildren(...CATEGORIES.map((c) => {
      const n = projects.filter((p) => matches(p, c.key)).length;
      // Hide empty categories (Featured and All always show).
      if (n === 0 && c.key !== "featured" && c.key !== "all") return "";
      return h("button", {
        type: "button",
        class: "filter",
        "data-filter": c.key,
        "aria-pressed": String(c.key === activeFilter),
        onclick: () => applyFilter(c.key),
      }, c.label, h("span", { class: "filter-count" }, n));
    }));
  }

  function renderGrid() {
    gridEl.replaceChildren(...projects.map((p, i) => {
      const btn = card(p, { eager: i < 4, onClick: () => openViewer(p.id, btn, { push: true }) });
      cardButtons.set(p.id, btn);
      return h("li", { class: "make", "data-id": p.id }, btn);
    }));
  }

  function applyFilter(key) {
    activeFilter = key;
    filtersEl.querySelectorAll(".filter").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === key)));
    const ordered = listFor(key === "featured" ? "featured" : "all");
    gridEl.append(...ordered.map((p) => cardButtons.get(p.id).parentNode));
    let shown = 0;
    gridEl.querySelectorAll(".make").forEach((li) => {
      const visible = matches(byId.get(li.dataset.id), key);
      li.hidden = !visible;
      if (visible) shown++;
    });
    countEl.textContent = `${shown} ${shown === 1 ? "make" : "makes"}`;
    emptyEl.hidden = shown > 0;
  }

  /* ---------- viewer ---------- */

  function openViewer(id, trigger, { push = false } = {}) {
    let filter = activeFilter;
    let list = listFor(filter);
    if (!list.some((p) => p.id === id)) {
      filter = "all";
      list = projects.slice();
    }
    view.list = list;
    view.filter = filter;
    view.returnFocus = trigger || document.activeElement;

    if (push) {
      history.pushState(null, "", addressFor(HASH_PREFIX + slugOf(byId.get(id))));
      pushedEntry = true;
    }
    showProject(list.findIndex((p) => p.id === id));
    if (!viewer.open) {
      document.documentElement.classList.add("viewer-open");
      viewer.showModal();
    }
    centerStrip(false); // needs layout, so after the dialog is shown
    titleEl.focus({ preventScroll: true });
  }

  // direction: 1 = forward, -1 = back, 0 = jump (controls the slide animation)
  function showProject(index, direction = 0) {
    const n = view.list.length;
    view.index = ((index % n) + n) % n;
    const p = (view.project = view.list[view.index]);

    viewerFilter.textContent = labelFor(view.filter);
    viewerPosition.textContent = `${view.index + 1} of ${n}`;
    prevBtn.disabled = nextBtn.disabled = n < 2;

    titleEl.textContent = p.title;
    descriptionEl.textContent = p.description || "";
    descriptionEl.hidden = !p.description;
    renderDetails(p);

    renderGallery(p);
    renderStrip();
    animateSlide(direction);

    scroller.scrollTop = 0;
    liveEl.textContent = `${p.title}, ${view.index + 1} of ${n}`;
    document.title = `${p.title} | ${pageTitle}`;
    const hash = HASH_PREFIX + slugOf(p);
    if (location.hash !== hash || location.pathname !== basePath) history.replaceState(null, "", addressFor(hash));
  }

  function renderDetails(p) {
    const skills = (p.skills || []).filter(Boolean);
    const rows = [];
    // One pattern (pattern / company / patternUrl / patternNote), or several in `patterns`.
    const patterns = (p.patterns && p.patterns.length ? p.patterns
      : [{ name: p.pattern, company: p.company, url: p.patternUrl, note: p.patternNote }])
      .filter((x) => x.name || x.company);
    if (patterns.length) {
      rows.push(h("div", { class: "detail" }, h("dt", null, patterns.length > 1 ? "Patterns" : "Pattern"),
        h("dd", null, ...patterns.map((x) => h("span", { class: "pattern-line" },
          x.name && x.url ? h("a", { href: x.url, target: "_blank", rel: "noopener" }, x.name) : x.name,
          x.company && (x.name ? ` by ${x.company}` : x.company),
          x.note && h("span", { class: "pattern-note" }, ` (${x.note})`))))));
    }
    const mods = (p.modifications || []).filter(Boolean);
    if (mods.length) rows.push(h("div", { class: "detail" }, h("dt", null, "Modifications"),
      h("dd", null, h("ul", { class: "mod-list" }, ...mods.map((m) => h("li", null, m))))));
    if (p.fabric) rows.push(h("div", { class: "detail" }, h("dt", null, "Fabric"), h("dd", null, p.fabric)));
    const features = (p.features || []).filter(Boolean);
    if (features.length) {
      const text = features.join(", ");
      rows.push(h("div", { class: "detail" }, h("dt", null, "Features"),
        h("dd", null, text[0].toUpperCase() + text.slice(1))));
    }
    if (skills.length) rows.push(h("div", { class: "detail" }, h("dt", null, "Skills"),
      h("dd", null, h("ul", { class: "skill-list" }, ...skills.map((s) => h("li", null, s))))));
    detailsEl.replaceChildren(...rows);
    detailsEl.hidden = !rows.length;
  }

  const step = (delta) => showProject(view.index + delta, delta);

  /* carousel filmstrip */

  function renderStrip() {
    if (view.stripList !== view.list) {
      view.stripList = view.list;
      filmstripEl.hidden = view.list.length < 2;
      filmstripEl.setAttribute("aria-label", `Makes in ${labelFor(view.filter)}`);
      stripEl.replaceChildren(...view.list.map((p, i) => {
        const cover = imagesOf(p)[0];
        return h("li", null,
          h("button", {
            type: "button",
            class: "strip-item",
            "aria-label": `${p.title}, ${i + 1} of ${view.list.length}`,
            onclick: () => showProject(i, Math.sign(i - view.index)),
          }, cover && h("img", { src: cover.src, alt: "", width: 88, height: 110, loading: "lazy", decoding: "async" })));
      }));
    }
    stripEl.querySelectorAll(".strip-item").forEach((b, i) => b.setAttribute("aria-current", String(i === view.index)));
    centerStrip(true);
  }

  // Scroll the filmstrip so the current make sits in the middle.
  function centerStrip(smooth) {
    const item = stripEl.children[view.index];
    if (!item || !stripEl.clientWidth) return;
    stripEl.scrollTo({
      left: item.offsetLeft - (stripEl.clientWidth - item.offsetWidth) / 2,
      behavior: smooth && !reduceMotion.matches ? "smooth" : "auto",
    });
  }

  function animateSlide(direction) {
    bodyEl.classList.remove("slide-next", "slide-prev", "slide-fade");
    void bodyEl.offsetWidth; // restart the animation
    bodyEl.classList.add(direction > 0 ? "slide-next" : direction < 0 ? "slide-prev" : "slide-fade");
  }

  // Swipe left/right on the main photo to move through the carousel.
  let touchStart = null;
  const swipeArea = galleryEl.querySelector(".gallery-main");
  swipeArea.addEventListener("touchstart", (e) => {
    touchStart = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  swipeArea.addEventListener("touchend", (e) => {
    if (!touchStart || view.list.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  function closeViewer() {
    if (viewer.open) viewer.close();
  }

  viewer.addEventListener("close", () => {
    document.documentElement.classList.remove("viewer-open");
    document.title = pageTitle;
    // Drop the #make/... address: step back if we added it, otherwise just clear it.
    if (location.hash.startsWith(HASH_PREFIX)) {
      if (pushedEntry) history.back();
      else history.replaceState(null, "", addressFor());
    }
    pushedEntry = false;
    // Return focus to the last make viewed if it's visible in the grid.
    const btn = view.project && cardButtons.get(view.project.id);
    const target = btn && !btn.closest(".make").hidden ? btn : view.returnFocus;
    if (target && document.contains(target)) target.focus();
  });

  /* gallery */

  function renderGallery(p) {
    const imgs = imagesOf(p);
    galleryEl.classList.toggle("is-single", imgs.length < 2);
    thumbsEl.hidden = imgs.length < 2;
    thumbsEl.replaceChildren(...imgs.map((img, i) =>
      h("li", null,
        h("button", {
          type: "button",
          class: "thumb",
          "aria-label": `Show photo ${i + 1} of ${imgs.length}`,
          "aria-current": "false",
          onclick: () => setImage(imgs, i),
        }, h("img", { src: img.src, alt: "", width: 160, height: 200, loading: "lazy", decoding: "async" })))));
    setImage(imgs, 0);
  }

  function setImage(imgs, i) {
    const img = imgs[i];
    if (!img) {
      mainImg.removeAttribute("src");
      mainImg.alt = "";
      return;
    }
    mainImg.classList.remove("is-swapping");
    void mainImg.offsetWidth; // restart the fade
    mainImg.classList.add("is-swapping");
    mainImg.src = img.src;
    mainImg.alt = img.alt;
    thumbsEl.querySelectorAll(".thumb").forEach((t, j) => t.setAttribute("aria-current", String(j === i)));
  }

  /* controls & keyboard */

  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));
  viewer.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeViewer));

  // Clicking the dimmed backdrop closes the viewer.
  viewer.addEventListener("click", (e) => {
    if (e.target === viewer) closeViewer();
  });

  viewer.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "Tab") trapFocus(e);
    else if (e.key === "ArrowRight" && !nextBtn.disabled) { e.preventDefault(); step(1); }
    else if (e.key === "ArrowLeft" && !prevBtn.disabled) { e.preventDefault(); step(-1); }
    else if (e.key === "Escape") { e.preventDefault(); closeViewer(); }
  });

  function trapFocus(e) {
    const focusable = Array.from(viewer.querySelectorAll("a[href], button:not([disabled]), [tabindex]"))
      .filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------- addresses ---------- */

  let pushedEntry = false; // true when opening a make added a history entry

  function makeFromHash() {
    if (!location.hash.startsWith(HASH_PREFIX)) return null;
    const key = decodeURIComponent(location.hash.slice(HASH_PREFIX.length));
    return byId.get(key) || bySlug.get(key) || null;
  }

  // Back/forward buttons and edited addresses open or close the viewer to match.
  window.addEventListener("popstate", () => {
    const p = makeFromHash();
    if (p) {
      pushedEntry = false;
      if (!viewer.open) openViewer(p.id);
      else if (view.project !== p) {
        const i = view.list.indexOf(p);
        if (i >= 0) showProject(i);
        else openViewer(p.id);
      }
    } else if (viewer.open) {
      pushedEntry = false;
      viewer.close();
    }
  });

  /* ---------- init ---------- */

  renderGrid();
  computeFeatured();
  renderFilters();
  applyFilter(DEFAULT_FILTER);
  // Re-fill Featured when the number of grid columns changes (e.g. rotating a tablet).
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!computeFeatured()) return;
      renderFilters();
      if (activeFilter === "featured") applyFilter("featured");
    }, 150);
  });
  const linked = makeFromHash();
  if (linked) openViewer(linked.id);
  else if (location.hash.startsWith(HASH_PREFIX) || location.pathname !== basePath) {
    history.replaceState(null, "", addressFor(location.hash.startsWith(HASH_PREFIX) ? "" : location.hash));
  }
  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();
})();
