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
  const companyEl = $("viewer-company");
  const descriptionEl = $("viewer-description");
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
  const matches = (p, key) => key === "all" || (p.categories || []).includes(key);
  const hasValue = (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);

  function imagesOf(p) {
    const list = p.images && p.images.length ? p.images : [];
    return list.map((img, i) =>
      typeof img === "string"
        ? { src: img, alt: `${p.title}, photo ${i + 1}` }
        : { src: img.src, alt: img.alt || `${p.title}, photo ${i + 1}` }
    );
  }

  function companyNode(p, tag = "span") {
    return p.company
      ? h(tag, { class: "make-company" }, p.company)
      : h(tag, { class: "make-company is-missing" }, "Pattern company TBC");
  }

  function swatchRow(p) {
    if (!hasValue(p.swatches)) return null;
    return h("span", { class: "swatches", "aria-hidden": "true" },
      p.swatches.map((s) => h("span", { class: "swatch", style: `background:${s.color}`, title: s.name })));
  }

  function card(p, { eager = false, onClick }) {
    const cover = imagesOf(p)[0];
    return h("button", { type: "button", class: "make-link", "aria-haspopup": "dialog", onclick: onClick },
      h("span", { class: "make-media" },
        cover && h("img", { src: cover.src, alt: "", width: 800, height: 1000, loading: eager ? "eager" : "lazy", decoding: "async" })),
      h("span", { class: "make-caption" },
        h("span", { class: "make-title" }, p.title),
        companyNode(p),
        swatchRow(p)));
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
      const btn = card(p, { eager: i < 4, onClick: () => openViewer(p.id, btn) });
      cardButtons.set(p.id, btn);
      return h("li", { class: "make", "data-id": p.id }, btn);
    }));
  }

  function applyFilter(key) {
    activeFilter = key;
    filtersEl.querySelectorAll(".filter").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === key)));
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

  function openViewer(id, trigger) {
    let filter = activeFilter;
    let list = projects.filter((p) => matches(p, filter));
    if (!list.some((p) => p.id === id)) {
      filter = "all";
      list = projects.slice();
    }
    view.list = list;
    view.filter = filter;
    view.returnFocus = trigger || document.activeElement;

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
    companyEl.textContent = p.company || "Pattern company TBC";
    descriptionEl.textContent = p.description || "";
    descriptionEl.hidden = !p.description;

    renderGallery(p);
    renderStrip();
    animateSlide(direction);

    scroller.scrollTop = 0;
    liveEl.textContent = `${p.title}, ${view.index + 1} of ${n}`;
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

  /* ---------- init ---------- */

  renderFilters();
  renderGrid();
  applyFilter(DEFAULT_FILTER);
  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();
})();
