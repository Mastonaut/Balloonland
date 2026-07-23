/* ═══════════════════════════════════════════
   BALLOON LAND — CMS Dashboard (MEDIA biblioteka)
   Centralni izvor svih fajlova: slike / video / dokumenti.
   - upload (i video preko linka), metapodaci: naslov, opis, alt
   - crop slika (canvas, bez biblioteka)
   Server: /api/media (+ generiše js/media-data.js za SEO alt).
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  const koren = document.getElementById("panelMedia");
  if (!koren) return;

  const status = document.getElementById("medStatus");
  const gridEl = {
    slika: document.getElementById("medGridSlika"),
    video: document.getElementById("medGridVideo"),
    dokument: document.getElementById("medGridDok"),
  };
  let stavke = [];
  let trenutna = null;

  /* ─────── API ─────── */
  async function api(putanja, opcije = {}) {
    const r = await fetch(putanja, { headers: { "Content-Type": "application/json" }, credentials: "same-origin", ...opcije });
    if (r.status === 401) { location.href = "prijava.html"; throw new Error("odjavljen"); }
    const p = await r.json();
    if (!r.ok) throw new Error(p.greska || "Greška na serveru.");
    return p;
  }
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  function poruka(el, tekst, greska) { el.classList.toggle("is-greska", !!greska); el.textContent = tekst; }
  const citajDataUrl = (fajl) => new Promise((r) => { const c = new FileReader(); c.onload = () => r(c.result); c.readAsDataURL(fajl); });
  const dimenzijeSlike = (dataUrl) => new Promise((r) => { const im = new Image(); im.onload = () => r(im.naturalWidth + "x" + im.naturalHeight); im.onerror = () => r(""); im.src = dataUrl; });
  function citljivaVelicina(b) { if (!b) return ""; return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }

  /* ─────── grid ─────── */
  function itemHTML(s) {
    let thumb;
    if (s.tip === "slika") {
      thumb = `<img src="${esc(s.putanja)}?t=${encodeURIComponent(s.velicina || 0)}" alt="${esc(s.alt)}" loading="lazy">`;
    } else if (s.tip === "video") {
      thumb = s.izvor === "link"
        ? `<div class="med-item__ikona">🎬<span>link</span></div>`
        : `<video src="${esc(s.putanja)}" muted preload="metadata"></video>`;
    } else {
      thumb = `<div class="med-item__ikona">📄<span>${esc((s.originalnoIme.split(".").pop() || "").toUpperCase())}</span></div>`;
    }
    const treba = s.tip === "slika" && !s.alt ? '<span class="med-item__warn" title="Nedostaje alt tekst za SEO">⚠</span>' : "";
    return `<button type="button" class="med-item" data-id="${esc(s.id)}">
        <div class="med-item__thumb">${thumb}${treba}</div>
        <span class="med-item__naslov">${esc(s.naslov || s.originalnoIme || "(bez naslova)")}</span>
      </button>`;
  }
  function render() {
    ["slika", "video", "dokument"].forEach((tip) => {
      const items = stavke.filter((s) => s.tip === tip);
      gridEl[tip].innerHTML = items.length
        ? items.map(itemHTML).join("")
        : '<p class="dash-hint" style="grid-column:1/-1">Još nema stavki — uploaduj prvu. 🎈</p>';
    });
  }
  Object.values(gridEl).forEach((g) => g.addEventListener("click", (e) => {
    const it = e.target.closest(".med-item");
    if (it) otvoriModal(stavke.find((s) => s.id === it.dataset.id));
  }));

  /* ─────── upload ─────── */
  async function uploadFajl(tip, fajl) {
    if (!fajl) return;
    poruka(status, "⏳ Upload u toku…", false);
    try {
      const data = await citajDataUrl(fajl);
      const dimenzije = tip === "slika" ? await dimenzijeSlike(data) : "";
      const nova = await api("/api/media", { method: "POST", body: JSON.stringify({ tip, ime: fajl.name, data, dimenzije }) });
      stavke.unshift(nova);
      render();
      poruka(status, "✅ Dodano — popuni naslov i alt tekst.", false);
      otvoriModal(nova);
    } catch (gr) { poruka(status, "⚠ " + gr.message, true); }
  }
  function veziUpload(dugmeId, inputId, tip) {
    const input = document.getElementById(inputId);
    document.getElementById(dugmeId).addEventListener("click", () => input.click());
    input.addEventListener("change", () => { uploadFajl(tip, input.files[0]); input.value = ""; });
  }
  veziUpload("medDodajSlika", "medUploadSlika", "slika");
  veziUpload("medDodajVideo", "medUploadVideo", "video");
  veziUpload("medDodajDok", "medUploadDok", "dokument");

  document.getElementById("medDodajVideoLink").addEventListener("click", async () => {
    const polje = document.getElementById("medVideoLink");
    const link = polje.value.trim();
    if (!link) return;
    poruka(status, "⏳ Dodavanje…", false);
    try {
      const nova = await api("/api/media", { method: "POST", body: JSON.stringify({ tip: "video", izvor: "link", link }) });
      stavke.unshift(nova);
      polje.value = "";
      render();
      poruka(status, "✅ Video link dodan.", false);
      otvoriModal(nova);
    } catch (gr) { poruka(status, "⚠ " + gr.message, true); }
  });

  /* ─────── modal editor ─────── */
  const modal = document.getElementById("medModal");
  const medPregled = document.getElementById("medPregled");
  const medMeta = document.getElementById("medMeta");
  const medFormaStatus = document.getElementById("medFormaStatus");
  const medKropujDugme = document.getElementById("medKropujDugme");

  function pregledHTML(s) {
    if (s.tip === "slika") return `<img src="${esc(s.putanja)}?t=${encodeURIComponent(s.velicina || 0)}" alt="${esc(s.alt)}">`;
    if (s.tip === "video") {
      if (s.izvor === "link") return `<a href="${esc(s.putanja)}" target="_blank" rel="noopener" class="med-pregled__link">🎬 Otvori video link ↗<br><small>${esc(s.putanja)}</small></a>`;
      return `<video src="${esc(s.putanja)}" controls preload="metadata"></video>`;
    }
    return `<a href="${esc(s.putanja)}" target="_blank" rel="noopener" class="med-pregled__link">📄 Otvori dokument ↗<br><small>${esc(s.originalnoIme || s.putanja)}</small></a>`;
  }
  function metaTekst(s) {
    const d = [];
    if (s.dimenzije) d.push(s.dimenzije + " px");
    if (s.velicina) d.push(citljivaVelicina(s.velicina));
    d.push(s.izvor === "link" ? "link" : s.putanja);
    if (s.datum) d.push("dodano " + s.datum.split("-").reverse().join("."));
    return d.join("  •  ");
  }
  function otvoriModal(s) {
    if (!s) return;
    trenutna = s;
    zatvoriCrop();
    document.getElementById("medId").value = s.id;
    document.getElementById("medNaslov").value = s.naslov || "";
    document.getElementById("medAlt").value = s.alt || "";
    document.getElementById("medOpis").value = s.opis || "";
    document.getElementById("medModalNaslov").textContent =
      "Uredi " + (s.tip === "slika" ? "sliku" : s.tip === "video" ? "video" : "dokument");
    medPregled.innerHTML = pregledHTML(s);
    medMeta.textContent = metaTekst(s);
    medKropujDugme.hidden = !(s.tip === "slika" && s.izvor === "upload");
    poruka(medFormaStatus, "", false);
    modal.hidden = false;
  }
  function zatvoriModal() { modal.hidden = true; trenutna = null; zatvoriCrop(); }
  document.getElementById("medZatvori").addEventListener("click", zatvoriModal);
  document.getElementById("medModalPozadina").addEventListener("click", zatvoriModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) zatvoriModal(); });

  document.getElementById("medForma").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!trenutna) return;
    poruka(medFormaStatus, "⏳ Snimanje…", false);
    try {
      const azurirana = await api("/api/media/" + trenutna.id, {
        method: "PUT",
        body: JSON.stringify({
          naslov: document.getElementById("medNaslov").value.trim(),
          alt: document.getElementById("medAlt").value.trim(),
          opis: document.getElementById("medOpis").value.trim(),
        }),
      });
      const i = stavke.findIndex((x) => x.id === azurirana.id);
      if (i >= 0) stavke[i] = azurirana;
      trenutna = azurirana;
      render();
      poruka(medFormaStatus, "✅ Snimljeno.", false);
    } catch (gr) { poruka(medFormaStatus, "⚠ " + gr.message, true); }
  });

  document.getElementById("medObrisi").addEventListener("click", async () => {
    if (!trenutna) return;
    if (!confirm('Obrisati "' + (trenutna.naslov || trenutna.originalnoIme || "stavku") + '" iz biblioteke?\nAko se koristi na sajtu, slika će nestati.')) return;
    try {
      await api("/api/media/" + trenutna.id, { method: "DELETE" });
      stavke = stavke.filter((x) => x.id !== trenutna.id);
      render();
      zatvoriModal();
      poruka(status, "🗑 Obrisano iz biblioteke.", false);
    } catch (gr) { poruka(medFormaStatus, "⚠ " + gr.message, true); }
  });

  /* ═══════════ CROP (canvas, bez biblioteka) ═══════════ */
  const cropWrap = document.getElementById("medCrop");
  const cropScena = document.getElementById("medCropScena");
  const cropSlika = document.getElementById("medCropSlika");
  const cropBox = document.getElementById("medCropBox");
  let omjer = 0; // 0 = slobodno

  medKropujDugme.addEventListener("click", () => {
    if (!trenutna || trenutna.tip !== "slika") return;
    cropWrap.hidden = false;
    cropSlika.onload = () => postaviBox(0.82);
    cropSlika.src = trenutna.putanja + "?t=" + (trenutna.velicina || 0);
    cropSlika.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  function zatvoriCrop() { if (cropWrap) cropWrap.hidden = true; }
  document.getElementById("medCropOtkazi").addEventListener("click", zatvoriCrop);

  document.getElementById("medCropPreseti").addEventListener("click", (e) => {
    const b = e.target.closest("[data-omjer]");
    if (!b) return;
    omjer = parseFloat(b.dataset.omjer) || 0;
    document.querySelectorAll("#medCropPreseti [data-omjer]").forEach((x) => x.classList.toggle("is-active", x === b));
    postaviBox(0.82);
  });

  function scenaDim() { return { w: cropSlika.clientWidth, h: cropSlika.clientHeight }; }
  function postaviBox(frakcija) {
    const { w, h } = scenaDim();
    if (!w || !h) return;
    let bw = w * frakcija;
    let bh = omjer ? bw / omjer : h * frakcija;
    if (bh > h) { bh = h; bw = omjer ? bh * omjer : bw; }
    if (bw > w) { bw = w; bh = omjer ? bw / omjer : bh; }
    cropBox.style.width = bw + "px";
    cropBox.style.height = bh + "px";
    cropBox.style.left = (w - bw) / 2 + "px";
    cropBox.style.top = (h - bh) / 2 + "px";
  }

  let akcija = null, start = null;
  cropScena.addEventListener("pointerdown", (e) => {
    const naRucki = e.target.closest(".med-crop__rucka");
    const naBoksu = e.target.closest("#medCropBox");
    if (!naBoksu && !naRucki) return;
    e.preventDefault();
    cropScena.setPointerCapture(e.pointerId);
    akcija = naRucki ? "resize" : "move";
    start = { x: e.clientX, y: e.clientY, left: cropBox.offsetLeft, top: cropBox.offsetTop, w: cropBox.offsetWidth, h: cropBox.offsetHeight };
  });
  cropScena.addEventListener("pointermove", (e) => {
    if (!akcija) return;
    const { w, h } = scenaDim();
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    const min = 30;
    if (akcija === "move") {
      cropBox.style.left = Math.min(Math.max(0, start.left + dx), w - start.w) + "px";
      cropBox.style.top = Math.min(Math.max(0, start.top + dy), h - start.h) + "px";
    } else {
      let bw = Math.max(min, Math.min(start.w + dx, w - start.left));
      let bh = omjer ? bw / omjer : Math.max(min, Math.min(start.h + dy, h - start.top));
      if (start.top + bh > h) { bh = h - start.top; if (omjer) bw = bh * omjer; }
      cropBox.style.width = bw + "px";
      cropBox.style.height = bh + "px";
    }
  });
  ["pointerup", "pointercancel"].forEach((ev) => cropScena.addEventListener(ev, () => { akcija = null; }));

  document.getElementById("medCropPotvrdi").addEventListener("click", async () => {
    if (!trenutna) return;
    const rect = cropSlika.getBoundingClientRect();
    const scaleX = cropSlika.naturalWidth / rect.width;
    const scaleY = cropSlika.naturalHeight / rect.height;
    const sx = Math.round(cropBox.offsetLeft * scaleX);
    const sy = Math.round(cropBox.offsetTop * scaleY);
    const sw = Math.round(cropBox.offsetWidth * scaleX);
    const sh = Math.round(cropBox.offsetHeight * scaleY);
    if (sw < 5 || sh < 5) return;
    const platno = document.createElement("canvas");
    platno.width = sw; platno.height = sh;
    platno.getContext("2d").drawImage(cropSlika, sx, sy, sw, sh, 0, 0, sw, sh);
    const png = /\.png$/i.test(trenutna.putanja);
    const dataUrl = platno.toDataURL(png ? "image/png" : "image/jpeg", 0.92);
    poruka(medFormaStatus, "⏳ Primjena cropa…", false);
    try {
      const azurirana = await api("/api/media/" + trenutna.id, { method: "PUT", body: JSON.stringify({ data: dataUrl, dimenzije: sw + "x" + sh }) });
      const i = stavke.findIndex((x) => x.id === azurirana.id);
      if (i >= 0) stavke[i] = azurirana;
      trenutna = azurirana;
      render();
      medPregled.innerHTML = pregledHTML(azurirana);
      medMeta.textContent = metaTekst(azurirana);
      zatvoriCrop();
      poruka(medFormaStatus, "✅ Slika iskropovana.", false);
    } catch (gr) { poruka(medFormaStatus, "⚠ " + gr.message, true); }
  });

  /* ─────── sub-tabovi ─────── */
  document.getElementById("medTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".pkt-tab");
    if (!btn) return;
    document.querySelectorAll("#medTabs .pkt-tab").forEach((b) => b.classList.toggle("is-active", b === btn));
    koren.querySelectorAll(".pkt-tabpanel").forEach((p) => p.classList.toggle("is-active", p.dataset.tab === btn.dataset.tab));
    poruka(status, "", false);
  });

  /* ═══════════ PICKER (izbor iz biblioteke za druge sekcije) ═══════════ */
  const picker = document.getElementById("medPicker");
  const pickerGrid = document.getElementById("medPickerGrid");
  const pickerPrazno = document.getElementById("medPickerPrazno");
  let pickerCb = null;

  async function otvoriPicker(cb) {
    pickerCb = cb;
    pickerPrazno.hidden = true;
    pickerGrid.innerHTML = '<p class="dash-hint">Učitavanje…</p>';
    picker.hidden = false;
    try {
      const slike = (await api("/api/media")).filter((s) => s.tip === "slika");
      pickerPrazno.hidden = slike.length > 0;
      pickerGrid.innerHTML = slike.map((s) => `
        <button type="button" class="med-item" data-put="${esc(s.putanja)}">
          <div class="med-item__thumb"><img src="${esc(s.putanja)}?t=${encodeURIComponent(s.velicina || 0)}" alt="${esc(s.alt)}" loading="lazy"></div>
          <span class="med-item__naslov">${esc(s.naslov || s.originalnoIme || "(bez naslova)")}</span>
        </button>`).join("");
    } catch (gr) { pickerGrid.innerHTML = '<p class="dash-hint">⚠ ' + esc(gr.message) + "</p>"; }
  }
  function zatvoriPicker() { picker.hidden = true; pickerCb = null; }
  pickerGrid.addEventListener("click", (e) => {
    const it = e.target.closest(".med-item");
    if (!it || !pickerCb) return;
    pickerCb(it.dataset.put);
    zatvoriPicker();
  });
  document.getElementById("medPickerX").addEventListener("click", zatvoriPicker);
  document.getElementById("medPickerPozadina").addEventListener("click", zatvoriPicker);
  window.MediaPicker = { open: otvoriPicker };

  /* ─────── učitavanje ─────── */
  async function ucitaj() {
    try {
      stavke = await api("/api/media");
      render();
      poruka(status, "", false);
    } catch (gr) { /* preusmjeren na prijavu */ }
  }
  window.MediaCMS = { ucitaj };
})();
