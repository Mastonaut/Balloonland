/* ═══════════════════════════════════════════
   BALLOON LAND — CMS Dashboard (sekcija PAKETI)
   Uređuje cijeli dokument cms/podaci/paketi.json:
     • kartice paketa (dinamički broj — dodaj/obriši/pomjeri)
     • tabela poređenja (kolone automatski prate pakete po id-u)
     • dodaci (à la carte)
     • FAQ
   Server generiše js/paketi-data.js. Sve se snima jednim dugmetom.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  const koren = document.getElementById("panelPaketi");
  if (!koren) return;

  const status = document.getElementById("pkStatus");
  let podaci = { paketi: [], poredjenje: [], dodaci: [], faq: [] };
  let brojac = 0; // za nove id-eve paketa (paket-N)

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
    do { id = "paket-" + (++brojac); } while (podaci.paketi.some((p) => p.id === id));
    return id;
  }

  function greska(poruka) {
    status.classList.add("is-greska");
    status.textContent = "⚠ " + poruka;
  }

  /* ═══════════ KARTICE ═══════════ */
  const elGrid = document.getElementById("pkGrid");
  const elEditor = document.getElementById("pkEditor");
  const listaView = document.getElementById("pkKarticeLista");
  const editorView = document.getElementById("pkKarticeEditor");
  let uredjiviIndeks = -1;
  let vuceniIndeks = -1;

  function stavkaHTML(s) {
    return `
      <div class="pk-stavka">
        <input class="pk-stavka-t" value="${esc(s.t)}" placeholder="npr. Dostava i montaža">
        <label class="pkt-check pkt-check--sm"><input type="checkbox" class="pk-stavka-off" ${s.off ? "checked" : ""}> prekriženo</label>
        <button type="button" class="dash-mini dash-mini--obrisi pk-obrisi-stavku" title="Ukloni stavku">✕</button>
      </div>`;
  }

  function karticaHTML(p, i) {
    return `
      <div class="pkt-kartica" data-id="${esc(p.id)}">
        <div class="pkt-kartica__glava">
          <strong>Paket #${i + 1}</strong>
          <div class="pkt-kartica__akcije">
            <button type="button" class="dash-mini" data-gore="${i}" title="Pomjeri gore">↑</button>
            <button type="button" class="dash-mini" data-dole="${i}" title="Pomjeri dole">↓</button>
            <button type="button" class="dash-mini dash-mini--obrisi" data-obrisi-paket="${i}">🗑 Obriši paket</button>
          </div>
        </div>
        <div class="cform__row">
          <div class="cform__field" style="flex:2"><label>Ime *</label><input class="pk-ime" value="${esc(p.ime)}" placeholder="npr. Mini"></div>
          <div class="cform__field"><label>Cijena (KM)</label><input type="number" class="pk-cijena" value="${esc(p.cijena)}" min="0"></div>
        </div>
        <div class="cform__field"><label>Tagline</label><input class="pk-tag" value="${esc(p.tag)}" placeholder="npr. Za intimne proslave"></div>
        <div class="cform__row">
          <div class="cform__field">
            <label class="pkt-check"><input type="checkbox" class="pk-istaknut" ${p.istaknut ? "checked" : ""}> Istaknut (zlatni okvir)</label>
          </div>
          <div class="cform__field" style="flex:2"><label>Bedž <span class="dash-hint">(prikazuje se samo ako je istaknut)</span></label><input class="pk-bedz" value="${esc(p.bedz)}" placeholder="npr. ★ Najpopularniji"></div>
        </div>
        <div class="cform__field">
          <label>Stavke paketa</label>
          <div class="pk-stavke">${(p.stavke || []).map(stavkaHTML).join("")}</div>
          <button type="button" class="dash-mini pk-dodaj-stavku">+ Dodaj stavku</button>
        </div>
      </div>`;
  }

  /* ─── grid kvadrata ─── */
  function tileHTML(p, i) {
    return `
      <div class="pkt-tile${p.istaknut ? " is-istaknut" : ""}" data-tile="${i}" draggable="true" title="Uredi — ili prevuci za redoslijed">
        ${p.istaknut ? '<span class="pkt-tile__zvijezda" title="Istaknut">★</span>' : ""}
        <span class="pkt-tile__broj">Paket ${i + 1}</span>
        <span class="pkt-tile__ime">${esc(p.ime || "bez imena")}</span>
        <span class="pkt-tile__uredi">✏️ Uredi</span>
      </div>`;
  }
  function renderGrid() {
    elGrid.innerHTML =
      podaci.paketi.map(tileHTML).join("") +
      `<button type="button" class="pkt-tile pkt-tile--dodaj" data-dodaj-paket>
         <span class="pkt-tile__plus">+</span>
         <span>Dodaj novi paket</span>
       </button>`;
  }
  function prikaziListu() {
    uredjiviIndeks = -1;
    editorView.hidden = true;
    listaView.hidden = false;
    renderGrid();
  }
  function otvoriEditor(i) {
    uredjiviIndeks = i;
    elEditor.innerHTML = karticaHTML(podaci.paketi[i], i);
    listaView.hidden = true;
    editorView.hidden = false;
  }

  /* ─── čitanje otvorenog editora u stanje ─── */
  function scrapeEditor() {
    if (uredjiviIndeks < 0) return;
    const k = elEditor.querySelector(".pkt-kartica");
    if (!k) return;
    podaci.paketi[uredjiviIndeks] = {
      id: k.dataset.id || noviId(),
      ime: k.querySelector(".pk-ime").value.trim(),
      tag: k.querySelector(".pk-tag").value.trim(),
      cijena: Number(k.querySelector(".pk-cijena").value) || 0,
      istaknut: k.querySelector(".pk-istaknut").checked,
      bedz: k.querySelector(".pk-bedz").value.trim(),
      stavke: [...k.querySelectorAll(".pk-stavka")].map((s) => {
        const t = s.querySelector(".pk-stavka-t").value.trim();
        const off = s.querySelector(".pk-stavka-off").checked;
        return off ? { t, off: true } : { t };
      }),
    };
  }

  elGrid.addEventListener("click", (e) => {
    if (e.target.closest("[data-dodaj-paket]")) {
      podaci.paketi.push({ id: noviId(), ime: "", tag: "", cijena: 0, istaknut: false, bedz: "", stavke: [{ t: "" }] });
      otvoriEditor(podaci.paketi.length - 1);
      return;
    }
    const tile = e.target.closest("[data-tile]");
    if (tile) otvoriEditor(+tile.dataset.tile);
  });

  /* ─── drag-to-reorder kvadrata ─── */
  elGrid.addEventListener("dragstart", (e) => {
    const tile = e.target.closest(".pkt-tile[data-tile]");
    if (!tile) return;
    vuceniIndeks = +tile.dataset.tile;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(vuceniIndeks)); // Firefox traži podatke
    tile.classList.add("pkt-tile--vuce");
  });
  elGrid.addEventListener("dragover", (e) => {
    if (vuceniIndeks < 0) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const tile = e.target.closest(".pkt-tile[data-tile]");
    elGrid.querySelectorAll(".pkt-tile--cilj").forEach((t) => t.classList.remove("pkt-tile--cilj"));
    if (tile && +tile.dataset.tile !== vuceniIndeks) tile.classList.add("pkt-tile--cilj");
  });
  elGrid.addEventListener("drop", (e) => {
    if (vuceniIndeks < 0) return;
    e.preventDefault();
    const tile = e.target.closest(".pkt-tile[data-tile]");
    if (tile) {
      const cilj = +tile.dataset.tile;
      if (cilj !== vuceniIndeks) {
        const [premjesten] = podaci.paketi.splice(vuceniIndeks, 1);
        podaci.paketi.splice(cilj, 0, premjesten);
      }
    }
    vuceniIndeks = -1;
    renderGrid();
  });
  elGrid.addEventListener("dragend", () => {
    vuceniIndeks = -1;
    elGrid.querySelectorAll(".pkt-tile--vuce, .pkt-tile--cilj")
      .forEach((t) => t.classList.remove("pkt-tile--vuce", "pkt-tile--cilj"));
  });

  document.getElementById("pkNazadNaLista").addEventListener("click", () => {
    scrapeEditor();
    prikaziListu();
  });

  elEditor.addEventListener("click", (e) => {
    if (uredjiviIndeks < 0) return;
    if (e.target.closest(".pk-dodaj-stavku")) {
      scrapeEditor();
      podaci.paketi[uredjiviIndeks].stavke.push({ t: "" });
      otvoriEditor(uredjiviIndeks);
      return;
    }
    if (e.target.closest(".pk-obrisi-stavku")) {
      const j = [...elEditor.querySelectorAll(".pk-stavka")].indexOf(e.target.closest(".pk-stavka"));
      scrapeEditor();
      podaci.paketi[uredjiviIndeks].stavke.splice(j, 1);
      otvoriEditor(uredjiviIndeks);
      return;
    }
    if (e.target.closest("[data-obrisi-paket]")) {
      if (confirm('Obrisati paket "' + (podaci.paketi[uredjiviIndeks].ime || "bez imena") + '"?')) {
        podaci.paketi.splice(uredjiviIndeks, 1);
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
      if (j < 0 || j >= podaci.paketi.length) return;
      [podaci.paketi[i], podaci.paketi[j]] = [podaci.paketi[j], podaci.paketi[i]];
      otvoriEditor(j);
    }
  });

  /* ═══════════ TABELA POREĐENJA ═══════════ */
  const elPoredjenje = document.getElementById("pkPoredjenje");

  function cellHTML(v, pid) {
    const jeTekst = !(v === true || v == null || v === false);
    const mode = v === true ? "da" : jeTekst ? "tekst" : "ne";
    return `
      <td class="pk-cmp-cell" data-pid="${esc(pid)}">
        <select class="pk-cmp-mode">
          <option value="da"${mode === "da" ? " selected" : ""}>✦ da</option>
          <option value="ne"${mode === "ne" ? " selected" : ""}>— ne</option>
          <option value="tekst"${mode === "tekst" ? " selected" : ""}>Tekst…</option>
        </select>
        <input class="pk-cmp-tekst" value="${esc(jeTekst ? v : "")}" placeholder="tekst" ${mode === "tekst" ? "" : "hidden"}>
      </td>`;
  }

  function renderPoredjenje() {
    if (!podaci.paketi.length) {
      elPoredjenje.innerHTML = '<p class="dash-hint">Prvo dodaj barem jedan paket u tabu „Kartice“.</p>';
      return;
    }
    const glava = "<tr><th>Stavka</th>" +
      podaci.paketi.map((p) => `<th>${esc(p.ime || "?")}</th>`).join("") + "<th></th></tr>";
    const redovi = podaci.poredjenje.map((r, i) => `
        <tr>
          <td><input class="pk-cmp-stavka" value="${esc(r.stavka)}" placeholder="Naziv stavke"></td>
          ${podaci.paketi.map((p) => cellHTML(r[p.id], p.id)).join("")}
          <td><button type="button" class="dash-mini dash-mini--obrisi" data-obrisi-red="${i}" title="Ukloni red">✕</button></td>
        </tr>`).join("");
    elPoredjenje.innerHTML =
      `<table class="pkt-tabela"><thead>${glava}</thead><tbody>${redovi}</tbody></table>`;
  }

  function scrapePoredjenje() {
    const redovi = elPoredjenje.querySelectorAll("tbody tr");
    if (!redovi.length) return;
    podaci.poredjenje = [...redovi].map((tr) => {
      const red = { stavka: tr.querySelector(".pk-cmp-stavka").value.trim() };
      tr.querySelectorAll(".pk-cmp-cell").forEach((c) => {
        const pid = c.dataset.pid;
        const mode = c.querySelector(".pk-cmp-mode").value;
        red[pid] = mode === "da" ? true : mode === "ne" ? false : c.querySelector(".pk-cmp-tekst").value.trim();
      });
      return red;
    });
  }

  elPoredjenje.addEventListener("change", (e) => {
    const sel = e.target.closest(".pk-cmp-mode");
    if (!sel) return;
    sel.closest(".pk-cmp-cell").querySelector(".pk-cmp-tekst").hidden = sel.value !== "tekst";
  });
  elPoredjenje.addEventListener("click", (e) => {
    const del = e.target.closest("[data-obrisi-red]");
    if (!del) return;
    scrapePoredjenje();
    podaci.poredjenje.splice(+del.dataset.obrisiRed, 1);
    renderPoredjenje();
  });
  document.getElementById("pkDodajRed").addEventListener("click", () => {
    scrapeEditor();
    scrapePoredjenje();
    const red = { stavka: "" };
    podaci.paketi.forEach((p) => { red[p.id] = false; });
    podaci.poredjenje.push(red);
    renderPoredjenje();
  });

  /* ═══════════ DODACI ═══════════ */
  const elDodaci = document.getElementById("pkDodaci");

  function renderDodaci() {
    elDodaci.innerHTML = podaci.dodaci.length
      ? podaci.dodaci.map((d) => `
        <div class="pkt-red">
          <input class="pk-d-ikona" value="${esc(d.ikona)}" placeholder="🎈" title="Emoji ikona">
          <input class="pk-d-naziv" value="${esc(d.naziv)}" placeholder="Naziv">
          <input class="pk-d-opis" value="${esc(d.opis)}" placeholder="Kratak opis">
          <input class="pk-d-cijena" value="${esc(d.cijena)}" placeholder="od 00 KM">
          <button type="button" class="dash-mini dash-mini--obrisi" data-obrisi-dodatak title="Ukloni">✕</button>
        </div>`).join("")
      : '<p class="dash-hint">Nema dodataka.</p>';
  }

  function scrapeDodaci() {
    podaci.dodaci = [...elDodaci.querySelectorAll(".pkt-red")].map((r) => ({
      ikona: r.querySelector(".pk-d-ikona").value.trim() || "🎈",
      naziv: r.querySelector(".pk-d-naziv").value.trim(),
      opis: r.querySelector(".pk-d-opis").value.trim(),
      cijena: r.querySelector(".pk-d-cijena").value.trim(),
    }));
  }

  elDodaci.addEventListener("click", (e) => {
    const del = e.target.closest("[data-obrisi-dodatak]");
    if (!del) return;
    scrapeDodaci();
    podaci.dodaci.splice([...elDodaci.querySelectorAll(".pkt-red")].indexOf(del.closest(".pkt-red")), 1);
    renderDodaci();
  });
  document.getElementById("pkDodajDodatak").addEventListener("click", () => {
    scrapeDodaci();
    podaci.dodaci.push({ ikona: "🎈", naziv: "", opis: "", cijena: "" });
    renderDodaci();
  });

  /* ═══════════ FAQ ═══════════ */
  const elFaq = document.getElementById("pkFaq");

  function renderFaq() {
    elFaq.innerHTML = podaci.faq.length
      ? podaci.faq.map((f) => `
        <div class="pkt-faq">
          <div class="pkt-faq__glava">
            <input class="pk-f-pitanje" value="${esc(f.pitanje)}" placeholder="Pitanje">
            <button type="button" class="dash-mini dash-mini--obrisi" data-obrisi-faq title="Ukloni">✕</button>
          </div>
          <textarea class="pk-f-odgovor" rows="3" placeholder="Odgovor">${esc(f.odgovor)}</textarea>
        </div>`).join("")
      : '<p class="dash-hint">Nema pitanja.</p>';
  }

  function scrapeFaq() {
    podaci.faq = [...elFaq.querySelectorAll(".pkt-faq")].map((r) => ({
      pitanje: r.querySelector(".pk-f-pitanje").value.trim(),
      odgovor: r.querySelector(".pk-f-odgovor").value.trim(),
    }));
  }

  elFaq.addEventListener("click", (e) => {
    const del = e.target.closest("[data-obrisi-faq]");
    if (!del) return;
    scrapeFaq();
    podaci.faq.splice([...elFaq.querySelectorAll(".pkt-faq")].indexOf(del.closest(".pkt-faq")), 1);
    renderFaq();
  });
  document.getElementById("pkDodajFaq").addEventListener("click", () => {
    scrapeFaq();
    podaci.faq.push({ pitanje: "", odgovor: "" });
    renderFaq();
  });

  /* ═══════════ SUB-TABOVI ═══════════ */
  function sinhronizuj() {
    scrapeEditor();
    scrapePoredjenje();
    scrapeDodaci();
    scrapeFaq();
  }

  document.getElementById("pktTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".pkt-tab");
    if (!btn) return;
    sinhronizuj();
    document.querySelectorAll("#pktTabs .pkt-tab").forEach((b) => b.classList.toggle("is-active", b === btn));
    koren.querySelectorAll(".pkt-tabpanel").forEach((p) => p.classList.toggle("is-active", p.dataset.tab === btn.dataset.tab));
    if (btn.dataset.tab === "poredjenje") renderPoredjenje(); // kolone prate aktuelne pakete
    status.textContent = "";
  });

  /* ═══════════ SNIMANJE ═══════════ */
  document.getElementById("pkSnimi").addEventListener("click", async () => {
    sinhronizuj();
    if (!podaci.paketi.length) return greska("Potreban je barem jedan paket.");
    if (podaci.paketi.some((p) => !p.ime)) return greska("Svaki paket mora imati ime.");
    status.classList.remove("is-greska");
    status.textContent = "⏳ Snimanje…";
    try {
      podaci = await api("/api/paketi", { method: "PUT", body: JSON.stringify(podaci) });
      prikaziListu(); renderPoredjenje(); renderDodaci(); renderFaq();
      status.textContent = "✅ Snimljeno — paketi su ažurirani na cijelom sajtu!";
    } catch (gr) {
      greska(gr.message);
    }
  });

  /* ═══════════ UČITAVANJE ═══════════ */
  async function ucitaj() {
    try {
      podaci = await api("/api/paketi");
      brojac = 0;
      podaci.paketi.forEach((p) => {
        const m = /^paket-(\d+)$/.exec(p.id || "");
        if (m) brojac = Math.max(brojac, +m[1]);
      });
      prikaziListu(); renderPoredjenje(); renderDodaci(); renderFaq();
      document.querySelectorAll("#pktTabs .pkt-tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === "kartice"));
      koren.querySelectorAll(".pkt-tabpanel").forEach((p) => p.classList.toggle("is-active", p.dataset.tab === "kartice"));
      status.textContent = "";
      status.classList.remove("is-greska");
    } catch (gr) { /* preusmjeren na prijavu */ }
  }

  window.PaketiCMS = { ucitaj };
})();
