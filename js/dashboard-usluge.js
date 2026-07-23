/* ═══════════════════════════════════════════
   BALLOON LAND — CMS Dashboard (sekcija USLUGE)
   Uređuje cijeli dokument cms/podaci/usluge.json:
     • glavne usluge (grid kvadrata → editor po usluzi, sa slikom i chipovima)
     • specijalni efekti (zaglavlje + kartice sa slikama)
     • fotokutak baner (naslov, tekst, do 2 dugmeta)
     • koraci procesa
   Server generiše js/usluge-data.js. Snima se jednim dugmetom.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  const koren = document.getElementById("panelUsluge");
  if (!koren) return;

  const status = document.getElementById("uslStatus");
  const uslGrid = document.getElementById("uslGrid");
  const uslEditor = document.getElementById("uslEditor");
  const listaView = document.getElementById("uslLista");
  const editorView = document.getElementById("uslEditorWrap");
  const uslEfekti = document.getElementById("uslEfekti");
  const uslFotokutak = document.getElementById("uslFotokutak");
  const uslKoraci = document.getElementById("uslKoraci");

  let podaci = { usluge: [], efekti: {}, fotokutak: {}, koraci: [] };
  let brojac = 0;
  let uredjiviIndeks = -1;
  let vuceniIndeks = -1;

  /* ─────── API ─────── */
  async function api(putanja, opcije = {}) {
    const r = await fetch(putanja, {
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      ...opcije,
    });
    if (r.status === 401) { location.href = "prijava.html"; throw new Error("odjavljen"); }
    const p = await r.json();
    if (!r.ok) throw new Error(p.greska || "Greška na serveru.");
    return p;
  }

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  function noviId() {
    let id;
    do { id = "usluga-" + (++brojac); } while (podaci.usluge.some((u) => u.id === id));
    return id;
  }
  function greska(poruka) { status.classList.add("is-greska"); status.textContent = "⚠ " + poruka; }
  const nn = (i) => String(i + 1).padStart(2, "0");

  /* ─────── kontrola za sliku (reupotrebljiva, bez id-eva) ─────── */
  function slikaControlHTML(putanja) {
    return `
      <div class="usl-slika">
        <img class="usl-slika__pregled" src="${esc(putanja || "img/gold-balloons-gift.jpg")}" alt="Pregled">
        <div>
          <input type="file" class="usl-slika__fajl" accept="image/*" hidden>
          <button type="button" class="btn btn--outline btn--sm usl-slika__dugme">📁 Uploaduj novu</button>
          <button type="button" class="btn btn--outline btn--sm usl-slika__biblioteka">📚 Iz biblioteke</button>
          <p class="usl-slika__info">${esc(putanja || "—")}</p>
        </div>
        <input type="hidden" class="usl-slika__putanja" value="${esc(putanja || "")}">
      </div>`;
  }
  async function uploadSlika(fajl) {
    const dataUrl = await new Promise((res) => { const c = new FileReader(); c.onload = () => res(c.result); c.readAsDataURL(fajl); });
    const { putanja } = await api("/api/media", { method: "POST", body: JSON.stringify({ tip: "slika", ime: fajl.name, data: dataUrl }) });
    return putanja;
  }
  function postaviSlikuUKontrolu(box, putanja) {
    box.querySelector(".usl-slika__putanja").value = putanja;
    box.querySelector(".usl-slika__pregled").src = putanja;
    box.querySelector(".usl-slika__info").textContent = putanja;
  }
  // delegirano na cijelom panelu — radi za sve slike (usluge i efekti)
  koren.addEventListener("click", (e) => {
    const dugme = e.target.closest(".usl-slika__dugme");
    if (dugme) { dugme.closest(".usl-slika").querySelector(".usl-slika__fajl").click(); return; }
    const bib = e.target.closest(".usl-slika__biblioteka");
    if (bib && window.MediaPicker) {
      const box = bib.closest(".usl-slika");
      window.MediaPicker.open((putanja) => postaviSlikuUKontrolu(box, putanja));
    }
  });
  koren.addEventListener("change", async (e) => {
    const fajl = e.target.closest(".usl-slika__fajl");
    if (!fajl || !fajl.files[0]) return;
    const box = fajl.closest(".usl-slika");
    const info = box.querySelector(".usl-slika__info");
    info.textContent = "⏳ Slanje…";
    try {
      const putanja = await uploadSlika(fajl.files[0]);
      box.querySelector(".usl-slika__putanja").value = putanja;
      box.querySelector(".usl-slika__pregled").src = putanja;
      info.textContent = putanja;
    } catch (gr) { info.textContent = "⚠ " + gr.message; }
  });

  /* ═══════════ GLAVNE USLUGE ═══════════ */
  function tileHTML(u, i) {
    return `
      <div class="pkt-tile" data-tile="${i}" draggable="true" title="Uredi — ili prevuci za redoslijed">
        <span class="pkt-tile__broj">${u.emoji || "🎈"} Usluga ${i + 1}</span>
        <span class="pkt-tile__ime">${esc(u.pill || "bez naziva")}</span>
        <span class="pkt-tile__uredi">✏️ Uredi</span>
      </div>`;
  }
  function renderGrid() {
    uslGrid.innerHTML =
      podaci.usluge.map(tileHTML).join("") +
      `<button type="button" class="pkt-tile pkt-tile--dodaj" data-dodaj-usluga>
         <span class="pkt-tile__plus">+</span>
         <span>Dodaj novu uslugu</span>
       </button>`;
  }
  function prikaziListu() {
    uredjiviIndeks = -1;
    editorView.hidden = true;
    listaView.hidden = false;
    renderGrid();
  }
  function chipHTML(c) {
    return `<div class="usl-chip"><input class="usl-chip-t" value="${esc(c)}" placeholder="npr. Slatki sto"><button type="button" class="dash-mini dash-mini--obrisi usl-obrisi-chip" title="Ukloni">✕</button></div>`;
  }
  function uslugaFormaHTML(u, i) {
    return `
      <div class="pkt-kartica usl-forma" data-id="${esc(u.id)}">
        <div class="pkt-kartica__glava">
          <strong>Usluga #${i + 1}</strong>
          <div class="pkt-kartica__akcije">
            <button type="button" class="dash-mini" data-gore title="Pomjeri gore">↑</button>
            <button type="button" class="dash-mini" data-dole title="Pomjeri dole">↓</button>
            <button type="button" class="dash-mini dash-mini--obrisi" data-obrisi-usluga>🗑 Obriši uslugu</button>
          </div>
        </div>
        <div class="cform__row">
          <div class="cform__field" style="flex:0 0 5rem"><label>Emoji</label><input class="usl-emoji" value="${esc(u.emoji)}"></div>
          <div class="cform__field" style="flex:2"><label>Naziv u navigaciji *</label><input class="usl-pill" value="${esc(u.pill)}" placeholder="npr. Vjenčanja"></div>
        </div>
        <div class="cform__field">
          <label>Naslov * <span class="dash-hint">(za zlatni kurziv omotaj riječ u &lt;em&gt;…&lt;/em&gt;)</span></label>
          <input class="usl-naslov" value="${esc(u.naslov)}" placeholder="npr. Vjenčanja iz &lt;em&gt;bajke&lt;/em&gt;">
        </div>
        <div class="cform__field"><label>Tag <span class="dash-hint">(bedž na slici)</span></label><input class="usl-tag" value="${esc(u.tag)}" placeholder="npr. Najtraženije"></div>
        <div class="cform__field"><label>Slika</label>${slikaControlHTML(u.slika)}</div>
        <div class="cform__field"><label>Opis</label><textarea class="usl-tekst" rows="4" placeholder="Opis usluge…">${esc(u.tekst)}</textarea></div>
        <div class="cform__field">
          <label>Chips <span class="dash-hint">(kratke stavke ispod opisa)</span></label>
          <div class="usl-chips">${(u.chips || []).map(chipHTML).join("")}</div>
          <button type="button" class="dash-mini usl-dodaj-chip">+ Dodaj chip</button>
        </div>
        <div class="cform__row">
          <div class="cform__field"><label>Sekundarno dugme — tekst <span class="dash-hint">(prazno = bez dugmeta)</span></label><input class="usl-sek-tekst" value="${esc(u.sekundarno ? u.sekundarno.tekst : "")}" placeholder="npr. Pogledaj radove"></div>
          <div class="cform__field"><label>Sekundarno dugme — link</label><input class="usl-sek-link" value="${esc(u.sekundarno ? u.sekundarno.link : "")}" placeholder="npr. galerija.html"></div>
        </div>
        <p class="dash-hint">Glavno dugme „Zatraži ponudu → kontakt“ se prikazuje automatski na svakoj usluzi.</p>
      </div>`;
  }
  function otvoriEditor(i) {
    uredjiviIndeks = i;
    uslEditor.innerHTML = uslugaFormaHTML(podaci.usluge[i], i);
    listaView.hidden = true;
    editorView.hidden = false;
  }
  function scrapeEditor() {
    if (uredjiviIndeks < 0) return;
    const k = uslEditor.querySelector(".usl-forma");
    if (!k) return;
    const sekTekst = k.querySelector(".usl-sek-tekst").value.trim();
    const staraSlika = (podaci.usluge[uredjiviIndeks] || {}).slika || "img/gold-balloons-gift.jpg";
    podaci.usluge[uredjiviIndeks] = {
      id: k.dataset.id || noviId(),
      emoji: k.querySelector(".usl-emoji").value.trim() || "🎈",
      pill: k.querySelector(".usl-pill").value.trim(),
      naslov: k.querySelector(".usl-naslov").value.trim(),
      tag: k.querySelector(".usl-tag").value.trim(),
      slika: k.querySelector(".usl-slika__putanja").value.trim() || staraSlika,
      tekst: k.querySelector(".usl-tekst").value.trim(),
      chips: [...k.querySelectorAll(".usl-chip-t")].map((c) => c.value.trim()),
      sekundarno: sekTekst ? { tekst: sekTekst, link: k.querySelector(".usl-sek-link").value.trim() || "kontakt.html" } : null,
    };
  }

  uslGrid.addEventListener("click", (e) => {
    if (e.target.closest("[data-dodaj-usluga]")) {
      podaci.usluge.push({ id: noviId(), emoji: "🎈", pill: "", naslov: "", tag: "", slika: "img/gold-balloons-gift.jpg", tekst: "", chips: [""], sekundarno: null });
      otvoriEditor(podaci.usluge.length - 1);
      return;
    }
    const tile = e.target.closest("[data-tile]");
    if (tile) otvoriEditor(+tile.dataset.tile);
  });

  /* drag-to-reorder */
  uslGrid.addEventListener("dragstart", (e) => {
    const tile = e.target.closest(".pkt-tile[data-tile]");
    if (!tile) return;
    vuceniIndeks = +tile.dataset.tile;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(vuceniIndeks));
    tile.classList.add("pkt-tile--vuce");
  });
  uslGrid.addEventListener("dragover", (e) => {
    if (vuceniIndeks < 0) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const tile = e.target.closest(".pkt-tile[data-tile]");
    uslGrid.querySelectorAll(".pkt-tile--cilj").forEach((t) => t.classList.remove("pkt-tile--cilj"));
    if (tile && +tile.dataset.tile !== vuceniIndeks) tile.classList.add("pkt-tile--cilj");
  });
  uslGrid.addEventListener("drop", (e) => {
    if (vuceniIndeks < 0) return;
    e.preventDefault();
    const tile = e.target.closest(".pkt-tile[data-tile]");
    if (tile) {
      const cilj = +tile.dataset.tile;
      if (cilj !== vuceniIndeks) {
        const [premjesten] = podaci.usluge.splice(vuceniIndeks, 1);
        podaci.usluge.splice(cilj, 0, premjesten);
      }
    }
    vuceniIndeks = -1;
    renderGrid();
  });
  uslGrid.addEventListener("dragend", () => {
    vuceniIndeks = -1;
    uslGrid.querySelectorAll(".pkt-tile--vuce, .pkt-tile--cilj").forEach((t) => t.classList.remove("pkt-tile--vuce", "pkt-tile--cilj"));
  });

  document.getElementById("uslNazad").addEventListener("click", () => { scrapeEditor(); prikaziListu(); });

  uslEditor.addEventListener("click", (e) => {
    if (uredjiviIndeks < 0) return;
    if (e.target.closest(".usl-dodaj-chip")) {
      scrapeEditor();
      podaci.usluge[uredjiviIndeks].chips.push("");
      otvoriEditor(uredjiviIndeks);
      return;
    }
    if (e.target.closest(".usl-obrisi-chip")) {
      const j = [...uslEditor.querySelectorAll(".usl-chip")].indexOf(e.target.closest(".usl-chip"));
      scrapeEditor();
      podaci.usluge[uredjiviIndeks].chips.splice(j, 1);
      otvoriEditor(uredjiviIndeks);
      return;
    }
    if (e.target.closest("[data-obrisi-usluga]")) {
      if (confirm('Obrisati uslugu "' + (podaci.usluge[uredjiviIndeks].pill || "bez naziva") + '"?')) {
        podaci.usluge.splice(uredjiviIndeks, 1);
        prikaziListu();
      }
      return;
    }
    const gore = e.target.closest("[data-gore]");
    const dole = e.target.closest("[data-dole]");
    if (gore || dole) {
      scrapeEditor();
      const i = uredjiviIndeks;
      const j = gore ? i - 1 : i + 1;
      if (j < 0 || j >= podaci.usluge.length) return;
      [podaci.usluge[i], podaci.usluge[j]] = [podaci.usluge[j], podaci.usluge[i]];
      otvoriEditor(j);
    }
  });

  /* ═══════════ EFEKTI ═══════════ */
  function efektKarticaHTML(k) {
    return `
      <div class="pkt-kartica usl-efekt">
        <div class="pkt-kartica__glava">
          <strong>Kartica efekta</strong>
          <button type="button" class="dash-mini dash-mini--obrisi usl-obrisi-efekt">🗑 Obriši</button>
        </div>
        <div class="cform__field"><label>Slika</label>${slikaControlHTML(k.slika)}</div>
        <div class="cform__field"><label>Naslov</label><input class="uef-k-naslov" value="${esc(k.naslov)}" placeholder="npr. Hladne prskalice"></div>
        <div class="cform__field"><label>Tekst</label><textarea class="uef-k-tekst" rows="2">${esc(k.tekst)}</textarea></div>
      </div>`;
  }
  function renderEfekti() {
    const e = podaci.efekti || {};
    uslEfekti.innerHTML = `
      <div class="cform__row">
        <div class="cform__field" style="flex:0 0 5rem"><label>Emoji</label><input class="uef-emoji" value="${esc(e.emoji)}"></div>
        <div class="cform__field" style="flex:2"><label>Naziv u navigaciji</label><input class="uef-pill" value="${esc(e.pill)}"></div>
      </div>
      <div class="cform__field"><label>Naslov <span class="dash-hint">(&lt;em&gt; za zlatni kurziv)</span></label><input class="uef-naslov" value="${esc(e.naslov)}"></div>
      <div class="cform__field"><label>Podnaslov</label><textarea class="uef-podnaslov" rows="2">${esc(e.podnaslov)}</textarea></div>
      <p class="usl-podnaslov-bloka">Kartice efekata</p>
      <div id="uslEfektiKartice">${(e.kartice || []).map(efektKarticaHTML).join("")}</div>
      <button type="button" class="dash-mini pkt-dodaj" id="uslDodajEfekt">+ Dodaj karticu</button>`;
  }
  function scrapeEfekti() {
    if (!uslEfekti.querySelector(".uef-emoji")) return;
    podaci.efekti = {
      emoji: uslEfekti.querySelector(".uef-emoji").value.trim() || "✨",
      pill: uslEfekti.querySelector(".uef-pill").value.trim(),
      naslov: uslEfekti.querySelector(".uef-naslov").value.trim(),
      podnaslov: uslEfekti.querySelector(".uef-podnaslov").value.trim(),
      kartice: [...uslEfekti.querySelectorAll(".usl-efekt")].map((el) => ({
        slika: el.querySelector(".usl-slika__putanja").value.trim(),
        naslov: el.querySelector(".uef-k-naslov").value.trim(),
        tekst: el.querySelector(".uef-k-tekst").value.trim(),
      })),
    };
  }
  uslEfekti.addEventListener("click", (e) => {
    if (e.target.closest("#uslDodajEfekt")) {
      scrapeEfekti();
      podaci.efekti.kartice = podaci.efekti.kartice || [];
      podaci.efekti.kartice.push({ slika: "", naslov: "", tekst: "" });
      renderEfekti();
      return;
    }
    const del = e.target.closest(".usl-obrisi-efekt");
    if (del) {
      scrapeEfekti();
      const i = [...uslEfekti.querySelectorAll(".usl-efekt")].indexOf(del.closest(".usl-efekt"));
      podaci.efekti.kartice.splice(i, 1);
      renderEfekti();
    }
  });

  /* ═══════════ FOTOKUTAK ═══════════ */
  function fotoDugmeHTML(d) {
    return `
      <div class="pkt-red usl-foto-dugme">
        <input class="ufo-d-tekst" value="${esc(d.tekst)}" placeholder="Tekst dugmeta">
        <input class="ufo-d-link" value="${esc(d.link)}" placeholder="npr. kontakt.html">
        <select class="ufo-d-stil">
          <option value="gold"${d.stil !== "ghost" ? " selected" : ""}>Zlatno</option>
          <option value="ghost"${d.stil === "ghost" ? " selected" : ""}>Prozirno</option>
        </select>
        <button type="button" class="dash-mini dash-mini--obrisi usl-obrisi-foto-dugme" title="Ukloni">✕</button>
      </div>`;
  }
  function renderFotokutak() {
    const f = podaci.fotokutak || {};
    uslFotokutak.innerHTML = `
      <div class="cform__row">
        <div class="cform__field" style="flex:0 0 5rem"><label>Emoji</label><input class="ufo-emoji" value="${esc(f.emoji)}"></div>
        <div class="cform__field" style="flex:2"><label>Naziv u navigaciji</label><input class="ufo-pill" value="${esc(f.pill)}"></div>
      </div>
      <div class="cform__field"><label>Naslov <span class="dash-hint">(&lt;em&gt; za zlatni kurziv)</span></label><input class="ufo-naslov" value="${esc(f.naslov)}"></div>
      <div class="cform__field"><label>Tekst</label><textarea class="ufo-tekst" rows="3">${esc(f.tekst)}</textarea></div>
      <p class="usl-podnaslov-bloka">Dugmad (do 2)</p>
      <div id="uslFotoDugmad">${(f.dugmad || []).map(fotoDugmeHTML).join("")}</div>
      <button type="button" class="dash-mini pkt-dodaj" id="uslDodajFotoDugme">+ Dodaj dugme</button>`;
  }
  function scrapeFotokutak() {
    if (!uslFotokutak.querySelector(".ufo-emoji")) return;
    podaci.fotokutak = {
      emoji: uslFotokutak.querySelector(".ufo-emoji").value.trim() || "📸",
      pill: uslFotokutak.querySelector(".ufo-pill").value.trim(),
      naslov: uslFotokutak.querySelector(".ufo-naslov").value.trim(),
      tekst: uslFotokutak.querySelector(".ufo-tekst").value.trim(),
      dugmad: [...uslFotokutak.querySelectorAll(".usl-foto-dugme")].map((el) => ({
        tekst: el.querySelector(".ufo-d-tekst").value.trim(),
        link: el.querySelector(".ufo-d-link").value.trim(),
        stil: el.querySelector(".ufo-d-stil").value,
      })),
    };
  }
  uslFotokutak.addEventListener("click", (e) => {
    if (e.target.closest("#uslDodajFotoDugme")) {
      scrapeFotokutak();
      podaci.fotokutak.dugmad = podaci.fotokutak.dugmad || [];
      if (podaci.fotokutak.dugmad.length >= 2) return;
      podaci.fotokutak.dugmad.push({ tekst: "", link: "kontakt.html", stil: "gold" });
      renderFotokutak();
      return;
    }
    const del = e.target.closest(".usl-obrisi-foto-dugme");
    if (del) {
      scrapeFotokutak();
      const i = [...uslFotokutak.querySelectorAll(".usl-foto-dugme")].indexOf(del.closest(".usl-foto-dugme"));
      podaci.fotokutak.dugmad.splice(i, 1);
      renderFotokutak();
    }
  });

  /* ═══════════ KORACI ═══════════ */
  function renderKoraci() {
    uslKoraci.innerHTML = (podaci.koraci || []).length
      ? podaci.koraci.map((k, i) => `
        <div class="pkt-faq usl-korak">
          <div class="pkt-faq__glava">
            <span class="usl-korak__broj">${nn(i)}</span>
            <input class="uko-naslov" value="${esc(k.naslov)}" placeholder="Naziv koraka">
            <button type="button" class="dash-mini dash-mini--obrisi usl-obrisi-korak" title="Ukloni">✕</button>
          </div>
          <textarea class="uko-tekst" rows="2" placeholder="Opis koraka">${esc(k.tekst)}</textarea>
        </div>`).join("")
      : '<p class="dash-hint">Nema koraka.</p>';
  }
  function scrapeKoraci() {
    podaci.koraci = [...uslKoraci.querySelectorAll(".usl-korak")].map((el) => ({
      naslov: el.querySelector(".uko-naslov").value.trim(),
      tekst: el.querySelector(".uko-tekst").value.trim(),
    }));
  }
  uslKoraci.addEventListener("click", (e) => {
    const del = e.target.closest(".usl-obrisi-korak");
    if (!del) return;
    scrapeKoraci();
    podaci.koraci.splice([...uslKoraci.querySelectorAll(".usl-korak")].indexOf(del.closest(".usl-korak")), 1);
    renderKoraci();
  });
  document.getElementById("uslDodajKorak").addEventListener("click", () => {
    scrapeKoraci();
    podaci.koraci = podaci.koraci || [];
    podaci.koraci.push({ naslov: "", tekst: "" });
    renderKoraci();
  });

  /* ═══════════ SUB-TABOVI + SNIMANJE + UČITAVANJE ═══════════ */
  function sinhronizuj() {
    scrapeEditor();
    scrapeEfekti();
    scrapeFotokutak();
    scrapeKoraci();
  }

  document.getElementById("uslTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".pkt-tab");
    if (!btn) return;
    sinhronizuj();
    document.querySelectorAll("#uslTabs .pkt-tab").forEach((b) => b.classList.toggle("is-active", b === btn));
    koren.querySelectorAll(".pkt-tabpanel").forEach((p) => p.classList.toggle("is-active", p.dataset.tab === btn.dataset.tab));
    status.textContent = "";
  });

  document.getElementById("uslSnimi").addEventListener("click", async () => {
    sinhronizuj();
    if (!podaci.usluge.length) return greska("Potrebna je barem jedna usluga.");
    if (podaci.usluge.some((u) => !u.pill || !u.naslov)) return greska("Svaka usluga mora imati naziv i naslov.");
    status.classList.remove("is-greska");
    status.textContent = "⏳ Snimanje…";
    try {
      podaci = await api("/api/usluge", { method: "PUT", body: JSON.stringify(podaci) });
      prikaziListu(); renderEfekti(); renderFotokutak(); renderKoraci();
      status.textContent = "✅ Snimljeno — usluge su ažurirane na cijelom sajtu!";
    } catch (gr) { greska(gr.message); }
  });

  async function ucitaj() {
    try {
      podaci = await api("/api/usluge");
      brojac = 0;
      (podaci.usluge || []).forEach((u) => {
        const m = /^usluga-(\d+)$/.exec(u.id || "");
        if (m) brojac = Math.max(brojac, +m[1]);
      });
      prikaziListu(); renderEfekti(); renderFotokutak(); renderKoraci();
      document.querySelectorAll("#uslTabs .pkt-tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === "usluge"));
      koren.querySelectorAll(".pkt-tabpanel").forEach((p) => p.classList.toggle("is-active", p.dataset.tab === "usluge"));
      status.textContent = "";
      status.classList.remove("is-greska");
    } catch (gr) { /* preusmjeren na prijavu */ }
  }

  window.UslugeCMS = { ucitaj };
})();
