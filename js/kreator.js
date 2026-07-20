/* ═══════════════════════════════════════════
   BALLOON LAND — Kreator dekoracija (vanilla JS)
   Tok: dekoracija → baloni → slaganje → boje
        (→ završni balon za stub) → upit
   Pregled: canvas + PNG sprite bijelog balona,
   svaki balon se boji multiply tintom (auto "maska")
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  const stage = document.getElementById("kStage");
  if (!stage) return; // nije kreator stranica

  /* ─────── PALETA (12 boja) ─────── */
  const COLORS = [
    { id: "bijela",    name: "Bijela",           hex: "#F5F2EC" },
    { id: "crna",      name: "Crna",             hex: "#2A2730" },
    { id: "zlatna",    name: "Zlatna",           hex: "#C9A24B" },
    { id: "srebrna",   name: "Srebrna",          hex: "#C7C9D1" },
    { id: "roze",      name: "Roze",             hex: "#F2A7C3" },
    { id: "fuksija",   name: "Fuksija",          hex: "#D6467E" },
    { id: "crvena",    name: "Crvena",           hex: "#C93A46" },
    { id: "bordo",     name: "Bordo",            hex: "#7E2138" },
    { id: "plava",     name: "Kraljevsko plava", hex: "#3E6FD9" },
    { id: "babyplava", name: "Baby plava",       hex: "#A9CBEA" },
    { id: "tirkiz",    name: "Tirkizna",         hex: "#3FB8AF" },
    { id: "lila",      name: "Lila",             hex: "#8B5FBF" },
  ];
  const WHITE = "#F5F2EC";
  const colorById = (id) => COLORS.find((c) => c.id === id);

  /* ─────── STANJE ─────── */
  const state = {
    deko: null,       // luk | stub
    tip: null,        // isti | kombinacija
    slaganje: null,   // ravno | dijagonalno | mix
    brojBoja: null,   // 2 | 3 | 4
    boje: [],         // id-jevi boja po redovima
    topColor: null,   // završni balon (stub)
    natpis: "",
  };

  const STEP_NAMES = {
    dekoracija: "Dekoracija",
    baloni: "Baloni",
    slaganje: "Slaganje",
    boje: "Boje",
    zavrsni: "Završni balon",
    upit: "Tvoj upit",
  };

  let stepIndex = 0;

  function stepList() {
    const steps = ["dekoracija", "baloni", "slaganje", "boje"];
    if (state.deko === "stub") steps.push("zavrsni");
    steps.push("upit");
    return steps;
  }

  /* ─────── DOM ─────── */
  const stepEls = document.querySelectorAll(".kstep");
  const btnNext = document.getElementById("kNext");
  const btnBack = document.getElementById("kBack");
  const progressBar = document.getElementById("kProgressBar");
  const rowsWrap = document.getElementById("kRows");
  const topColorsWrap = document.getElementById("kTopColors");
  const natpisInput = document.getElementById("kNatpis");
  const placeholder = document.getElementById("kPlaceholder");
  const chipsWrap = document.getElementById("kChips");
  const priceEl = document.getElementById("kPrice");
  const summaryEl = document.getElementById("kSummary");

  /* ─────── OPCIJE (kartice) ─────── */
  document.querySelectorAll(".kopt").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.set;
      const val = btn.dataset.value;
      state[key] = key === "brojBoja" ? +val : val;
      document.querySelectorAll(`.kopt[data-set="${key}"]`).forEach((b) =>
        b.classList.toggle("is-selected", b === btn)
      );
      if (key === "brojBoja") {
        state.boje = Array(+val).fill(null);
        buildColorRows();
      }
      if (key === "deko") {
        // promjena tipa dekoracije mijenja listu koraka
        state.topColor = null;
        state.natpis = "";
        if (natpisInput) natpisInput.value = "";
        buildTopColors();
      }
      update();
    });
  });

  /* ─────── REDOVI BOJA ─────── */
  function buildColorRows() {
    rowsWrap.innerHTML = "";
    for (let i = 0; i < state.brojBoja; i++) {
      const row = document.createElement("div");
      row.className = "krow";
      const label = document.createElement("p");
      label.className = "krow__label";
      label.innerHTML = `<span class="krow__dot" data-dot="${i}"></span> Red ${i + 1}`;
      row.appendChild(label);
      row.appendChild(buildSwatches((colorId) => {
        state.boje[i] = colorId;
        const dot = rowsWrap.querySelector(`[data-dot="${i}"]`);
        if (dot) dot.style.background = colorById(colorId).hex;
        update();
      }, () => state.boje[i]));
      rowsWrap.appendChild(row);
    }
  }

  function buildSwatches(onPick, getCurrent) {
    const wrap = document.createElement("div");
    wrap.className = "kswatches";
    COLORS.forEach((c) => {
      const s = document.createElement("button");
      s.type = "button";
      s.className = "kswatch";
      s.style.background = `radial-gradient(circle at 35% 30%, ${shade(c.hex, 0.25)}, ${c.hex} 60%, ${shade(c.hex, -0.15)})`;
      s.title = c.name;
      s.setAttribute("aria-label", c.name);
      s.dataset.color = c.id;
      s.addEventListener("click", () => {
        onPick(c.id);
        s.parentElement.querySelectorAll(".kswatch").forEach((x) =>
          x.classList.toggle("is-selected", x === s)
        );
      });
      wrap.appendChild(s);
    });
    // označi već izabranu (kod povratka na korak)
    const cur = getCurrent && getCurrent();
    if (cur) {
      const el = wrap.querySelector(`[data-color="${cur}"]`);
      if (el) el.classList.add("is-selected");
    }
    return wrap;
  }

  function buildTopColors() {
    if (!topColorsWrap) return;
    topColorsWrap.innerHTML = "";
    const wrap = buildSwatches((colorId) => {
      state.topColor = colorId;
      update();
    }, () => state.topColor);
    while (wrap.firstChild) topColorsWrap.appendChild(wrap.firstChild);
  }
  buildTopColors();

  if (natpisInput) {
    natpisInput.addEventListener("input", () => {
      state.natpis = natpisInput.value.trim();
      update();
    });
  }

  /* ─────── NAVIGACIJA KORAKA ─────── */
  function currentStep() { return stepList()[stepIndex]; }

  function canProceed() {
    switch (currentStep()) {
      case "dekoracija": return !!state.deko;
      case "baloni": return !!state.tip;
      case "slaganje": return !!state.slaganje;
      case "boje": return !!state.brojBoja && state.boje.every(Boolean);
      case "zavrsni": return !!state.topColor;
      case "upit": {
        const n = document.getElementById("kName");
        const p = document.getElementById("kPhone");
        return n.value.trim() && p.value.trim();
      }
    }
    return false;
  }

  btnNext.addEventListener("click", () => {
    if (!canProceed()) return;
    if (currentStep() === "upit") {
      document.getElementById("kSuccess").hidden = false;
      return;
    }
    stepIndex++;
    update();
  });
  btnBack.addEventListener("click", () => {
    if (stepIndex > 0) stepIndex--;
    update();
  });

  ["kName", "kPhone"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => syncNav());
  });

  /* ─────── CIJENA ─────── */
  function price() {
    if (!state.deko) return null;
    let p = state.deko === "luk" ? 250 : 120;
    if (state.tip === "kombinacija") p += state.deko === "luk" ? 40 : 20;
    if (state.brojBoja === 3) p += 15;
    if (state.brojBoja === 4) p += 25;
    if (state.deko === "stub" && state.natpis) p += 15;
    return p;
  }

  /* ─────── UPDATE UI ─────── */
  function update() {
    const steps = stepList();
    if (stepIndex >= steps.length) stepIndex = steps.length - 1;

    stepEls.forEach((s) =>
      s.classList.toggle("is-active", s.dataset.step === steps[stepIndex])
    );

    document.getElementById("kStepNow").textContent = stepIndex + 1;
    document.getElementById("kStepTotal").textContent = steps.length;
    document.getElementById("kStepName").textContent = STEP_NAMES[steps[stepIndex]];
    progressBar.style.width = ((stepIndex + 1) / steps.length) * 100 + "%";

    if (currentStep() === "upit") buildSummary();

    syncNav();
    renderChips();
    renderPrice();
    renderStage();
  }

  function syncNav() {
    btnBack.disabled = stepIndex === 0;
    btnNext.disabled = !canProceed();
    btnNext.textContent = currentStep() === "upit" ? "Pošalji upit 🎈" : "Dalje →";
  }

  function renderChips() {
    const chips = [];
    if (state.deko) chips.push(state.deko === "luk" ? "Luk" : "Stub");
    if (state.tip) chips.push(state.tip === "isti" ? "Isti baloni" : "Veliki + mali");
    if (state.slaganje) chips.push({ ravno: "Ravno", dijagonalno: "Dijagonalno", mix: "Mix" }[state.slaganje]);
    if (state.brojBoja) chips.push(state.brojBoja + " boje");
    if (state.deko === "stub" && state.natpis) chips.push("Natpis: “" + state.natpis + "”");
    chipsWrap.innerHTML = chips.map((c) => `<span class="chip">${c}</span>`).join("");
  }

  function renderPrice() {
    const p = price();
    priceEl.textContent = p === null ? "—" : "~" + p;
  }

  function buildSummary() {
    const rows = [];
    rows.push(["Dekoracija", state.deko === "luk" ? "Luk od balona" : "Stub od balona"]);
    rows.push(["Baloni", state.tip === "isti" ? "Iste veličine" : "Veliki + mali"]);
    rows.push(["Slaganje", { ravno: "Ravno", dijagonalno: "Dijagonalno", mix: "Mix (nasumično)" }[state.slaganje]]);
    const dots = state.boje
      .map((id) => `<i style="background:${colorById(id).hex}"></i>`)
      .join("");
    rows.push(["Boje (" + state.brojBoja + ")", `<span class="ksummary__colors">${dots}</span>`]);
    if (state.deko === "stub") {
      const tc = colorById(state.topColor);
      rows.push(["Završni balon", `<span class="ksummary__colors"><i style="background:${tc.hex}"></i></span> ${tc.name}${state.natpis ? " — “" + state.natpis + "”" : ""}`]);
    }
    rows.push(["Procjena cijene", "<strong>~" + price() + " KM</strong>"]);
    summaryEl.innerHTML = rows
      .map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`)
      .join("");
  }

  /* ═══════════ POMOĆNE ═══════════ */
  function shade(hex, pct) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = pct < 0 ? 0 : 255;
    const p = Math.abs(pct);
    r = Math.round((t - r) * p + r);
    g = Math.round((t - g) * p + g);
    b = Math.round((t - b) * p + b);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }

  // deterministički pseudo-random da scena ne "skače"
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // MIX raspored: deterministički, ali pazi da što manje istih boja bude jedna do druge.
  // Greedy — za svaki balon bira boju sa najmanje "sudara" sa već dodijeljenim susjedima
  // (ista pozicija prethodnog klastera = jak susjed, ostatak klastera = slabiji),
  // uz blago balansiranje ukupne upotrebe boja.
  let mixCache = { n: 0, map: null };
  function mixIndex(seg, strand) {
    const n = state.brojBoja;
    if (mixCache.n !== n) {
      const rnd = mulberry32(97);
      const MAXSEG = 61;
      const map = new Int8Array(MAXSEG * 3).fill(-1);
      const usage = new Array(n).fill(0);
      const get = (s, p) => (s < 0 || s >= MAXSEG) ? -1 : map[s * 3 + p];
      for (let s = 0; s < MAXSEG; s++) {
        for (let p = 0; p < 3; p++) {
          const scores = new Array(n).fill(0);
          const c1 = get(s - 1, p);
          if (c1 >= 0) scores[c1] += 2; // ista pozicija u prethodnom klasteru
          [get(s, 0), get(s, 1), get(s, 2), get(s - 1, 0), get(s - 1, 1), get(s - 1, 2)]
            .forEach((c) => { if (c >= 0) scores[c] += 1; });
          for (let c = 0; c < n; c++) scores[c] += usage[c] * 0.02; // balans boja
          let best = [], bestScore = Infinity;
          for (let c = 0; c < n; c++) {
            if (scores[c] < bestScore - 1e-9) { bestScore = scores[c]; best = [c]; }
            else if (Math.abs(scores[c] - bestScore) < 1e-9) best.push(c);
          }
          const pick = best[(rnd() * best.length) | 0];
          map[s * 3 + p] = pick;
          usage[pick]++;
        }
      }
      mixCache = { n, map };
    }
    return mixCache.map[Math.min(seg, 60) * 3 + Math.min(strand, 2)];
  }

  // boja balona za segment/red prema slaganju
  function balloonHex(segment, strand) {
    if (!state.brojBoja || !state.boje.every(Boolean)) return WHITE;
    const n = state.brojBoja;
    let idx;
    if (state.slaganje === "mix") {
      idx = mixIndex(segment, strand);
    } else if (state.slaganje === "dijagonalno") {
      idx = (segment + strand) % n;
    } else {
      idx = segment % n;
    }
    return colorById(state.boje[idx]).hex;
  }

  /* ═══════════ CANVAS PREGLED (PNG sprite + tint) ═══════════ */
  const ctx = stage.getContext("2d");
  const W = 600, H = 470;      // logičke dimenzije (canvas je 2x zbog oštrine)

  // sprite bijelog balona (izrezana pozadina)
  const sprite = new Image();
  let spriteReady = false;
  sprite.onload = () => { spriteReady = true; tintCache = {}; renderStage(); };
  sprite.onerror = () => { spriteReady = false; renderStage(); };
  sprite.src = "img/balloon-sprite.png";

  // tintovani sprite po boji — sprite alpha je "maska" za bojenje
  let tintCache = {};
  function tintedSprite(hex) {
    if (tintCache[hex]) return tintCache[hex];
    const c = document.createElement("canvas");
    c.width = sprite.naturalWidth;
    c.height = sprite.naturalHeight;
    const cc = c.getContext("2d");
    cc.drawImage(sprite, 0, 0);
    cc.globalCompositeOperation = "multiply";
    cc.fillStyle = hex;
    cc.fillRect(0, 0, c.width, c.height);
    cc.globalCompositeOperation = "destination-in";
    cc.drawImage(sprite, 0, 0);
    tintCache[hex] = c;
    return c;
  }

  function drawBalloon(x, y, r, hex, rot) {
    if (spriteReady) {
      const img = tintedSprite(hex);
      const h = r * 2.35;
      const w = h * (img.width / img.height);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot || 0);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      // fallback: gradijent krug dok se sprite ne učita
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
      g.addColorStop(0, shade(hex, 0.28));
      g.addColorStop(0.55, hex);
      g.addColorStop(1, shade(hex, -0.2));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ═══════════ FOTO MOD (bijela baza + maska iz Illustratora) ═══════════
     Ako u img/kreator/ postoje {key}.png i {key}-mask.png, pregled je prava
     fotografija koja se boji preko maske. Inače: sprite fallback. */
  const photoCache = {};

  function photoKey() {
    if (!state.deko || !state.tip) return null;
    return state.deko + "-" + (state.tip === "kombinacija" ? "kombo" : "isti");
  }

  function loadPhoto(key) {
    if (photoCache[key]) return photoCache[key];
    const entry = {
      status: "loading", mode: null,
      base: new Image(), mask: null,
      idx: null, w: 0, h: 0, topBox: null,
      shapes: null, svg: null, building: false,
      composed: null, sig: null,
    };
    photoCache[key] = entry;

    const basePromise = new Promise((res, rej) => {
      entry.base.onload = res;
      entry.base.onerror = rej;
      entry.base.src = "img/kreator/" + key + ".png";
    });

    basePromise.then(() => {
      const useSvg = (text) => {
        buildSvgMask(entry, text);
        entry.mode = "svg";
        entry.status = "ready";
        renderStage();
      };
      // 1. pokušaj: SVG maska preko mreže (radi na serveru)
      fetch("img/kreator/" + key + "-mask.svg")
        .then((r) => (r.ok ? r.text() : Promise.reject()))
        .then(useSvg)
        .catch(() => {
          // 2. pokušaj: ugrađena maska iz js/maske.js (radi i na file://)
          if (window.KREATOR_MASKE && window.KREATOR_MASKE[key]) {
            useSvg(window.KREATOR_MASKE[key]);
            return;
          }
          // 3. pokušaj: PNG maska
          const m = new Image();
          m.onload = () => {
            entry.mask = m;
            buildMaskIndex(entry);
            entry.mode = "png";
            entry.status = "ready";
            renderStage();
          };
          m.onerror = () => { entry.status = "missing"; renderStage(); };
          m.src = "img/kreator/" + key + "-mask.png";
        });
    }).catch(() => { entry.status = "missing"; renderStage(); });

    return entry;
  }

  // parsira SVG masku: fill svake plohe nosi kod balona (ista legenda kao PNG)
  function buildSvgMask(entry, text) {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.documentElement;

    // dimenzije iz viewBox-a (artboard = dimenzije baze)
    let vw, vh;
    const vb = svg.getAttribute("viewBox");
    if (vb) {
      const p = vb.split(/[\s,]+/).map(Number);
      vw = p[2]; vh = p[3];
    } else {
      vw = parseFloat(svg.getAttribute("width")) || entry.base.naturalWidth;
      vh = parseFloat(svg.getAttribute("height")) || entry.base.naturalHeight;
      svg.setAttribute("viewBox", "0 0 " + vw + " " + vh);
    }
    entry.w = vw; entry.h = vh;
    svg.setAttribute("width", vw);
    svg.setAttribute("height", vh);

    // privremeno u DOM zbog computed fill boja i bbox-a
    const holder = document.createElement("div");
    holder.style.cssText = "position:absolute;left:-99999px;top:0;visibility:hidden;";
    document.body.appendChild(holder);
    holder.appendChild(svg);

    entry.shapes = [];
    svg.querySelectorAll("path, circle, ellipse, polygon, rect").forEach((sh) => {
      const fill = getComputedStyle(sh).fill;
      const m = fill && fill.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
      if (!m) return;
      const R = +m[1], G = +m[2], B = +m[3];
      // geometrija plohe (za graf susjedstva kod mix slaganja)
      let geo = null;
      try {
        const b = sh.getBBox();
        geo = {
          cx: b.x + b.width / 2,
          cy: b.y + b.height / 2,
          r: Math.max(b.width, b.height) / 2,
          box: { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height },
        };
      } catch (e) { /* bbox nedostupan */ }

      if (B > 200 && R < 60) {
        // završni balon
        if (geo) entry.topBox = geo.box;
        entry.shapes.push({ el: sh, top: true, geo });
        return;
      }
      // B kanal ≈160 (A0) = drugi "bank" — segmenti 21+
      const bank = B > 130 ? 21 : 0;
      const seg = bank + Math.round((R - 20) / 10);
      const strand = G < 80 ? 0 : (G < 160 ? 1 : 2);
      if (seg >= 0 && seg <= 60) entry.shapes.push({ el: sh, seg, strand, geo });
    });

    holder.remove();
    entry.svg = svg;
  }

  // dekodira masku: R = 20 + segment*10, G = 40/120/200 (A/B/mali), završni = #0000FF
  function buildMaskIndex(entry) {
    const maxW = 1200;
    const scale = Math.min(1, maxW / entry.base.naturalWidth);
    const w = Math.round(entry.base.naturalWidth * scale);
    const h = Math.round(entry.base.naturalHeight * scale);
    entry.w = w; entry.h = h;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const cc = c.getContext("2d", { willReadFrequently: true });
    cc.imageSmoothingEnabled = false; // kodovi boja se ne smiju blendati
    cc.drawImage(entry.mask, 0, 0, w, h);
    const d = cc.getImageData(0, 0, w, h).data;
    const idx = new Int16Array(w * h).fill(-1);
    let tx0 = w, ty0 = h, tx1 = 0, ty1 = 0, hasTop = false;
    for (let i = 0; i < w * h; i++) {
      if (d[i * 4 + 3] < 128) continue;
      const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2];
      if (B > 200 && R < 60) { // završni balon
        idx[i] = 30000; hasTop = true;
        const x = i % w, y = (i / w) | 0;
        if (x < tx0) tx0 = x; if (x > tx1) tx1 = x;
        if (y < ty0) ty0 = y; if (y > ty1) ty1 = y;
        continue;
      }
      // B kanal ≈160 (A0) = drugi "bank" — segmenti 21+
      const bank = B > 130 ? 21 : 0;
      const seg = bank + Math.round((R - 20) / 10);
      const strand = G < 80 ? 0 : (G < 160 ? 1 : 2);
      if (seg >= 0 && seg <= 60) idx[i] = seg * 4 + strand;
    }
    entry.idx = idx;
    entry.topBox = hasTop ? { x0: tx0, y0: ty0, x1: tx1, y1: ty1 } : null;
  }

  function groupHex(shape) {
    if (shape.top) return state.topColor ? colorById(state.topColor).hex : WHITE;
    return balloonHex(shape.seg, shape.strand);
  }

  // MIX za SVG maske: graf susjedstva iz STVARNE geometrije ploha —
  // dvije plohe su susjedi ako se (skoro) dodiruju na fotografiji.
  // Greedy bojenje minimizira iste boje jednu do druge.
  function svgMixAssign(entry) {
    const n = state.brojBoja;
    if (entry.mixCache && entry.mixCache.n === n) return entry.mixCache.map;

    const shapes = entry.shapes
      .filter((s) => !s.top && s.geo)
      .sort((a, b) => (a.seg - b.seg) || (a.strand - b.strand));

    // graf susjedstva
    if (!entry.mixAdj) {
      const adj = shapes.map(() => []);
      for (let i = 0; i < shapes.length; i++) {
        for (let j = i + 1; j < shapes.length; j++) {
          const A = shapes[i].geo, B = shapes[j].geo;
          const dist = Math.hypot(A.cx - B.cx, A.cy - B.cy);
          if (dist < (A.r + B.r) * 1.12) {
            adj[i].push(j);
            adj[j].push(i);
          }
        }
      }
      entry.mixAdj = adj;
      entry.mixShapes = shapes;
    }

    const adj = entry.mixAdj;
    const ordered = entry.mixShapes;
    const rnd = mulberry32(53);
    const map = new Map();
    const picked = new Array(ordered.length).fill(-1);
    const usage = new Array(n).fill(0);

    ordered.forEach((s, i) => {
      const scores = new Array(n).fill(0);
      adj[i].forEach((j) => { if (picked[j] >= 0) scores[picked[j]] += 1; });
      for (let c = 0; c < n; c++) scores[c] += usage[c] * 0.02;
      let best = [], bestScore = Infinity;
      for (let c = 0; c < n; c++) {
        if (scores[c] < bestScore - 1e-9) { bestScore = scores[c]; best = [c]; }
        else if (Math.abs(scores[c] - bestScore) < 1e-9) best.push(c);
      }
      const pick = best[(rnd() * best.length) | 0];
      picked[i] = pick;
      usage[pick]++;
      map.set(s, pick);
    });

    entry.mixCache = { n, map };
    return map;
  }

  function stateSig() {
    return [state.slaganje, state.brojBoja, state.boje.join(","), state.topColor].join("|");
  }

  // SVG mod: oboji plohe → rasterizuj → multiply preko baze (asinhrono, keširano)
  function composePhotoSvg(entry) {
    const sig = stateSig();
    if (entry.sig === sig && entry.composed) return entry.composed;
    if (entry.building === sig) return null; // već se pravi za ovo stanje
    entry.building = sig;

    const mixMap = (state.slaganje === "mix" && state.brojBoja && state.boje.every(Boolean))
      ? svgMixAssign(entry)
      : null;
    entry.shapes.forEach((s) => {
      if (mixMap && !s.top && mixMap.has(s)) {
        s.el.style.fill = colorById(state.boje[mixMap.get(s)]).hex;
      } else {
        s.el.style.fill = groupHex(s);
      }
    });
    const text = new XMLSerializer().serializeToString(entry.svg);
    const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = entry.w, h = entry.h;
      const out = document.createElement("canvas");
      out.width = w; out.height = h;
      const octx = out.getContext("2d");
      octx.drawImage(entry.base, 0, 0, w, h);
      octx.globalCompositeOperation = "multiply";
      octx.drawImage(img, 0, 0, w, h);
      octx.globalCompositeOperation = "destination-in";
      octx.drawImage(entry.base, 0, 0, w, h);
      entry.composed = out;
      entry.sig = sig;
      entry.building = false;
      renderStage();
    };
    img.onerror = () => { URL.revokeObjectURL(url); entry.building = false; };
    img.src = url;
    return null;
  }

  function composePhoto(entry) {
    if (entry.mode === "svg") return composePhotoSvg(entry);
    const sig = stateSig();
    if (entry.sig === sig && entry.composed) return entry.composed;
    const w = entry.w, h = entry.h;
    const overlay = document.createElement("canvas");
    overlay.width = w; overlay.height = h;
    const oc = overlay.getContext("2d");
    const img = oc.createImageData(w, h);
    const od = img.data;
    const rgbCache = {};
    for (let i = 0; i < w * h; i++) {
      const gid = entry.idx[i];
      if (gid < 0) continue;
      let hex;
      if (gid === 30000) {
        hex = state.topColor ? colorById(state.topColor).hex : WHITE;
      } else {
        // strand 2 = treća pozicija u klasteru (prednji/mali balon) — nastavlja spiralu
        const seg = (gid / 4) | 0, strand = gid % 4;
        hex = balloonHex(seg, strand);
      }
      let rgb = rgbCache[hex];
      if (!rgb) {
        const n = parseInt(hex.slice(1), 16);
        rgb = rgbCache[hex] = [n >> 16, (n >> 8) & 255, n & 255];
      }
      od[i * 4] = rgb[0]; od[i * 4 + 1] = rgb[1]; od[i * 4 + 2] = rgb[2]; od[i * 4 + 3] = 255;
    }
    oc.putImageData(img, 0, 0);
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    const octx = out.getContext("2d");
    octx.drawImage(entry.base, 0, 0, w, h);
    octx.globalCompositeOperation = "multiply";
    octx.drawImage(overlay, 0, 0);
    octx.globalCompositeOperation = "destination-in";
    octx.drawImage(entry.base, 0, 0, w, h);
    entry.sig = sig;
    entry.composed = out;
    return out;
  }

  // mekana sjena na podu (radijalni gradijent, bez oštrih ivica)
  function drawFloorShadow(cx2, cy2, rx, ry, alpha) {
    ctx.save();
    ctx.translate(cx2, cy2);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, "rgba(0,0,0," + alpha + ")");
    g.addColorStop(0.55, "rgba(0,0,0," + alpha * 0.55 + ")");
    g.addColorStop(0.85, "rgba(0,0,0," + alpha * 0.15 + ")");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function renderPhoto(entry) {
    // dok se SVG kompozicija pravi, nacrtaj bijelu bazu (bez treptanja)
    const composed = composePhoto(entry) || entry.base;
    const pad = 24;
    const scale = Math.min((W - pad * 2) / entry.w, (H - 60) / entry.h);
    const dw = entry.w * scale, dh = entry.h * scale;
    const dx = (W - dw) / 2, dy = 445 - dh;

    // sjena na podu
    drawFloorShadow(300, 447, dw * 0.52, 16, 0.4);

    ctx.drawImage(composed, dx, dy, dw, dh);

    // natpis na završnom balonu (stub)
    if (state.natpis && entry.topBox) {
      const b = entry.topBox;
      const cx = dx + ((b.x0 + b.x1) / 2) * scale;
      const cyt = dy + ((b.y0 + b.y1) / 2) * scale * 0.985;
      const boxW = (b.x1 - b.x0) * scale;
      const topHex = state.topColor ? colorById(state.topColor).hex : WHITE;
      const dark = luminance(topHex) > 0.62;
      const fs = Math.max(9, Math.min(boxW * 0.85 / Math.max(state.natpis.length, 1) * 1.6, boxW * 0.24));
      ctx.fillStyle = dark ? "#2A2730" : "#FDFBF7";
      ctx.font = `italic 600 ${fs}px "Playfair Display", Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(state.natpis, cx, cyt);
    }
  }

  // linijska asocijacija dekoracije (prije izbora slaganja)
  // geometrija = identičan "fit" kao kod finalne fotografije, da se poklapaju
  function renderOutline() {
    const dims = state.deko === "luk" ? { w: 1600, h: 1067 } : { w: 1200, h: 1600 };
    const pad = 24;
    const scale = Math.min((W - pad * 2) / dims.w, (H - 60) / dims.h);
    const dw = dims.w * scale, dh = dims.h * scale;
    const dx = (W - dw) / 2, dy = 445 - dh;

    const gold = ctx.createLinearGradient(dx, 0, dx + dw, 0);
    gold.addColorStop(0, "#a37f2e");
    gold.addColorStop(0.5, "#e8c877");
    gold.addColorStop(1, "#a37f2e");

    ctx.save();
    ctx.strokeStyle = gold;
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(201,162,75,.35)";
    ctx.shadowBlur = 18;

    if (state.deko === "luk") {
      // srednja linija girlande na fotografiji luka
      drawFloorShadow(300, 447, dw * 0.52, 16, 0.3);
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.ellipse(dx + dw / 2, dy + dh * 0.93, dw * 0.3425, dh * 0.784, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    } else {
      // osa stuba + završni balon na fotografiji stuba
      const cx2 = dx + dw * 0.5;
      const topCy = dy + dh * 0.278;
      const topR = dh * 0.163;
      drawFloorShadow(300, 447, dw * 0.42, 13, 0.3);
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(cx2, dy + dh * 0.93);
      ctx.lineTo(cx2, topCy + topR + 6);
      ctx.stroke();
      // krug na vrhu — samo outline
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(cx2, topCy, topR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderStage() {
    ctx.setTransform(2, 0, 0, 2, 0, 0); // 2x retina
    ctx.clearRect(0, 0, W, H);

    if (!state.deko) {
      placeholder.classList.remove("is-hidden");
      return;
    }
    placeholder.classList.add("is-hidden");

    // dok slaganje nije izabrano: samo linijska asocijacija (bez balona)
    if (!state.slaganje) {
      renderOutline();
      return;
    }

    // foto mod ako postoje baza + maska za trenutnu kombinaciju
    const key = photoKey();
    if (key) {
      const entry = loadPhoto(key);
      if (entry.status === "ready") { renderPhoto(entry); return; }
      if (entry.status === "loading") return; // render stiže kad se učita
    }

    // fallback: sprite mod
    drawFloorShadow(300, 442, state.deko === "luk" ? 260 : 130, 16, 0.4);

    if (state.deko === "luk") renderLuk();
    else renderStub();
  }

  /* ─────── LUK ─────── */
  function renderLuk() {
    const rnd = mulberry32(7);
    const cx = 300, cy = 445, rx = 215, ry = 335;
    const SEG = 15;
    const isti = state.tip !== "kombinacija";

    for (let i = 0; i < SEG; i++) {
      const t = i / (SEG - 1);
      const a = Math.PI - t * Math.PI; // 180° → 0°
      const x = cx + rx * Math.cos(a);
      const y = cy - ry * Math.sin(a) * 0.92;
      // normala (za dvije "pletenice" luka)
      const nx = Math.cos(a) * 0.55;
      const ny = -Math.sin(a);
      const off = isti ? 16 : 18;

      for (let strand = 0; strand < 2; strand++) {
        const dir = strand === 0 ? -1 : 1;
        const bx = x + nx * off * dir + (rnd() - 0.5) * 5;
        const by = y + ny * off * dir * 0.5 + (rnd() - 0.5) * 5;
        const r = isti ? 19 : (i % 2 === strand ? 22 : 12);
        drawBalloon(bx, by, r, balloonHex(i, strand), (rnd() - 0.5) * 0.5);
      }
      // mali "filler" baloni kod organic stila
      if (!isti && i < SEG - 1) {
        const t2 = (i + 0.5) / (SEG - 1);
        const a2 = Math.PI - t2 * Math.PI;
        const fx = cx + rx * Math.cos(a2) + (rnd() - 0.5) * 8;
        const fy = cy - ry * Math.sin(a2) * 0.92 + (rnd() - 0.5) * 8;
        drawBalloon(fx, fy, 8, balloonHex(i + 1, i % 2), (rnd() - 0.5) * 0.6);
      }
    }
  }

  /* ─────── STUB (zdepast — kao pravi) ─────── */
  function renderStub() {
    const rnd = mulberry32(11);
    const cx = 300;
    const LAYERS = 5;
    const isti = state.tip !== "kombinacija";
    let y = 412;

    for (let layer = 0; layer < LAYERS; layer++) {
      const wob = (layer % 2 ? -6 : 6);
      const r = isti ? 26 : (layer % 2 ? 28 : 18);
      const spread = isti ? 27 : (layer % 2 ? 29 : 21);
      // lijevi (A) i desni (B)
      drawBalloon(cx + wob - spread + (rnd() - 0.5) * 4, y + (rnd() - 0.5) * 3, r, balloonHex(layer, 0), (rnd() - 0.5) * 0.4);
      drawBalloon(cx + wob + spread + (rnd() - 0.5) * 4, y + (rnd() - 0.5) * 3, r, balloonHex(layer, 1), (rnd() - 0.5) * 0.4);
      // prednji (M) — malo niži, preko njih
      drawBalloon(cx + wob + (rnd() - 0.5) * 4, y + r * 0.55, r * 0.95, balloonHex(layer, 2), (rnd() - 0.5) * 0.4);
      y -= isti ? 44 : (layer % 2 ? 46 : 34);
    }

    // završni balon — krupan, skoro širine stuba
    const topHex = state.topColor ? colorById(state.topColor).hex : WHITE;
    const topY = y - 42;

    // čvor
    ctx.fillStyle = shade(topHex, -0.25);
    ctx.beginPath();
    ctx.moveTo(cx, topY + 76);
    ctx.lineTo(cx - 8, topY + 88);
    ctx.lineTo(cx + 8, topY + 88);
    ctx.closePath();
    ctx.fill();

    drawBalloon(cx, topY, 80, topHex, 0);

    // natpis
    if (state.natpis) {
      const dark = luminance(topHex) > 0.62;
      const len = state.natpis.length;
      const fs = len > 14 ? 15 : len > 9 ? 18 : 22;
      ctx.fillStyle = dark ? "#2A2730" : "#FDFBF7";
      ctx.font = `italic 600 ${fs}px "Playfair Display", Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(state.natpis, cx, topY + 2);
    }
  }

  /* ─────── START ─────── */
  update();
  // ponovni render kad se učita font (zbog natpisa na balonu)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(renderStage);
  }
})();
