/* ═══════════════════════════════════════════
   BALLOON LAND — CMS Dashboard (blog sekcija)
   Radi sa cms/server.mjs API-jem.
   - rich text editor (execCommand, bez biblioteka)
   - statusi: objavljeno / skica / zakazano
   - slider: draggable grafički elementi na pregledu slajda
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  const lista = document.getElementById("dLista");
  if (!lista) return;

  const panelLista = document.getElementById("panelLista");
  const panelForma = document.getElementById("panelForma");
  const forma = document.getElementById("dForma");
  const status = document.getElementById("dStatus");
  const editor = document.getElementById("fEditor");
  let objave = [];
  let sliderElementi = [];   // { tip, tekst, x, y } — koordinate u %
  let izabraniElement = -1;

  /* ─────── API pomoćnici ─────── */
  async function api(putanja, opcije = {}) {
    const r = await fetch(putanja, {
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      ...opcije,
    });
    if (r.status === 401) { location.href = "prijava.html"; throw new Error("odjavljen"); }
    const podaci = await r.json();
    if (!r.ok) throw new Error(podaci.greska || "Greška na serveru.");
    return podaci;
  }

  (async () => {
    try {
      await api("/api/ja");
      await ucitajListu();
    } catch (gr) { /* preusmjeren na prijavu */ }
  })();

  /* ─────── lista objava ─────── */
  function statusBedz(o) {
    if (o.status === "skica") return '<span class="dash-bedz dash-bedz--skica">📝 Skica</span>';
    if (o.status === "zakazano") {
      const d = o.objaviU ? new Date(o.objaviU) : null;
      const kad = d ? d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear() + ". u " +
        String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") : "";
      return '<span class="dash-bedz dash-bedz--zakazano">🕐 Zakazano ' + kad + '</span>';
    }
    return '<span class="dash-bedz dash-bedz--objavljeno">✅ Objavljeno</span>';
  }

  async function ucitajListu() {
    objave = await api("/api/objave");
    const objavljenih = objave.filter((o) => (o.status || "objavljeno") === "objavljeno").length;
    document.getElementById("dBrojac").textContent =
      objave.length + " ukupno — " + objavljenih + " na sajtu";
    lista.innerHTML = objave.length
      ? objave.map((o) => `
          <div class="dash-red">
            <img class="dash-red__slika" src="${o.slika}" alt="">
            <div class="dash-red__info">
              <h3>${o.naslov} ${o.slider ? "🎠" : ""}</h3>
              <p><span class="b-kat">${o.kategorija}</span> ${o.datum} &nbsp; ${statusBedz(o)}</p>
            </div>
            <div class="dash-red__akcije">
              ${(o.status || "objavljeno") === "objavljeno"
                ? `<a class="dash-mini" href="objava.html?id=${encodeURIComponent(o.id)}" target="_blank" rel="noopener">👁 Pogledaj</a>`
                : ""}
              <button class="dash-mini" data-uredi="${o.id}">✏️ Uredi</button>
              <button class="dash-mini dash-mini--obrisi" data-obrisi="${o.id}">🗑 Obriši</button>
            </div>
          </div>`).join("")
      : '<p style="color:var(--muted); padding:2rem 0;">Još nema objava — kreirajte prvu! 🎈</p>';
  }

  lista.addEventListener("click", async (e) => {
    const urediId = e.target.dataset.uredi;
    const obrisiId = e.target.dataset.obrisi;
    if (urediId) otvoriFormu(objave.find((o) => o.id === urediId));
    if (obrisiId) {
      const o = objave.find((x) => x.id === obrisiId);
      if (confirm('Obrisati objavu "' + o.naslov + '"?\nOva radnja se ne može poništiti.')) {
        await api("/api/objave/" + obrisiId, { method: "DELETE" });
        await ucitajListu();
      }
    }
  });

  /* ─────── RICH TEXT EDITOR ─────── */
  document.getElementById("dAlati").addEventListener("click", (e) => {
    const dugme = e.target.closest("button");
    if (!dugme) return;
    e.preventDefault();
    // emoji panel
    if (dugme.id === "dEmojiBtn") {
      const panel = document.getElementById("dEmojiPanel");
      panel.hidden = !panel.hidden;
      return;
    }
    if (dugme.closest("#dEmojiPanel")) {
      editor.focus();
      document.execCommand("insertText", false, dugme.textContent);
      document.getElementById("dEmojiPanel").hidden = true;
      return;
    }
    editor.focus();
    if (dugme.dataset.cmd) document.execCommand(dugme.dataset.cmd, false, null);
    if (dugme.dataset.boja) document.execCommand("foreColor", false, dugme.dataset.boja);
    if (dugme.dataset.marker) {
      // highlight selektovanog teksta
      if (!document.execCommand("hiliteColor", false, dugme.dataset.marker)) {
        document.execCommand("backColor", false, dugme.dataset.marker);
      }
    }
  });
  document.getElementById("dVelicina").addEventListener("change", (e) => {
    if (!e.target.value) return;
    editor.focus();
    document.execCommand("fontSize", false, e.target.value);
    e.target.value = "";
  });
  document.getElementById("dFont").addEventListener("change", (e) => {
    if (!e.target.value) return;
    editor.focus();
    document.execCommand("fontName", false, e.target.value);
    e.target.value = "";
  });

  /* ─────── status objave ─────── */
  const statusPolje = document.getElementById("fStatus");
  const poljeZakazano = document.getElementById("poljeZakazano");
  statusPolje.addEventListener("change", () => {
    poljeZakazano.hidden = statusPolje.value !== "zakazano";
  });

  /* ─────── SLIDER: switch + draggable elementi ─────── */
  const sliderSwitch = document.getElementById("fSlider");
  const sliderPanel = document.getElementById("sliderPanel");
  const slajd = document.getElementById("dSlajd");
  const slojElemenata = document.getElementById("dSlajdElementi");
  const elTekst = document.getElementById("elTekst");
  const elObrisi = document.getElementById("elObrisi");

  sliderSwitch.addEventListener("change", () => {
    sliderPanel.hidden = !sliderSwitch.checked;
    if (sliderSwitch.checked) osvjeziPregledSlajda();
  });

  function osvjeziPregledSlajda() {
    document.getElementById("dSlajdBg").style.backgroundImage =
      "url('" + document.getElementById("fSlika").value + "')";
    document.getElementById("dSlajdKicker").textContent =
      document.getElementById("fKategorija").value;
    document.getElementById("dSlajdNaslov").textContent =
      document.getElementById("fNaslov").value || "Naslov vijesti";
    document.getElementById("dSlajdUvod").textContent =
      document.getElementById("fUvod").value || "Uvod vijesti…";
    nacrtajElemente();
  }
  ["fNaslov", "fUvod", "fKategorija"].forEach((id) =>
    document.getElementById(id).addEventListener("input", () => {
      if (sliderSwitch.checked) osvjeziPregledSlajda();
    })
  );

  const elPanel = document.getElementById("elPanel");
  const elVelicina = document.getElementById("elVelicina");
  const elVelicinaVr = document.getElementById("elVelicinaVr");
  const elBoje = document.getElementById("elBoje");

  // podrazumijevano po tipu: tekst, veličina teksta (px) i boja teksta
  const PODRAZUMIJEVANO = {
    krug:  { tekst: "-20%",    velicina: 30, boja: "#2A2730" },
    traka: { tekst: "AKCIJA",  velicina: 15, boja: "#2A2730" },
    pill:  { tekst: "✨ Novo", velicina: 14, boja: "#E8C877" },
  };

  ["Krug", "Traka", "Pill"].forEach((veliki) => {
    const tip = veliki.toLowerCase();
    document.getElementById("el" + veliki).addEventListener("click", () => {
      sliderElementi.push({
        tip,
        ...PODRAZUMIJEVANO[tip],
        x: 75,
        y: 30 + sliderElementi.length * 14,
      });
      izaberiElement(sliderElementi.length - 1);
    });
  });

  function stilElementa(el) {
    const d = PODRAZUMIJEVANO[el.tip] || {};
    return "left:" + el.x + "%; top:" + el.y + "%;" +
      " font-size:" + (el.velicina || d.velicina) + "px;" +
      " color:" + (el.boja || d.boja) + ";";
  }

  function nacrtajElemente() {
    slojElemenata.innerHTML = sliderElementi
      .map((el, i) => `
        <span class="hv-el hv-el--${el.tip}${i === izabraniElement ? " is-izabran" : ""}"
              data-i="${i}" style="${stilElementa(el)}">${el.tekst}</span>`)
      .join("");
  }

  function izaberiElement(i) {
    izabraniElement = i;
    const el = i >= 0 ? sliderElementi[i] : null;
    elPanel.hidden = !el;
    if (el) {
      elTekst.value = el.tekst;
      elVelicina.value = el.velicina;
      elVelicinaVr.textContent = el.velicina + "px";
      elBoje.querySelectorAll("button").forEach((b) =>
        b.classList.toggle("is-izabrana", b.dataset.boja.toLowerCase() === (el.boja || "").toLowerCase())
      );
    }
    nacrtajElemente();
  }

  elTekst.addEventListener("input", () => {
    if (izabraniElement < 0) return;
    sliderElementi[izabraniElement].tekst = elTekst.value;
    nacrtajElemente();
  });
  elVelicina.addEventListener("input", () => {
    if (izabraniElement < 0) return;
    sliderElementi[izabraniElement].velicina = +elVelicina.value;
    elVelicinaVr.textContent = elVelicina.value + "px";
    nacrtajElemente();
  });
  elBoje.addEventListener("click", (e) => {
    const dugme = e.target.closest("button");
    if (!dugme || izabraniElement < 0) return;
    sliderElementi[izabraniElement].boja = dugme.dataset.boja;
    elBoje.querySelectorAll("button").forEach((b) => b.classList.toggle("is-izabrana", b === dugme));
    nacrtajElemente();
  });
  elObrisi.addEventListener("click", () => {
    if (izabraniElement < 0) return;
    sliderElementi.splice(izabraniElement, 1);
    izaberiElement(-1);
  });

  // prevlačenje mišem (pointer eventi, koordinate u %)
  let vuceni = -1;
  slojElemenata.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(".hv-el");
    if (!el) return;
    vuceni = +el.dataset.i;
    izaberiElement(vuceni);
    slojElemenata.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  slojElemenata.addEventListener("pointermove", (e) => {
    if (vuceni < 0) return;
    const okvir = slajd.getBoundingClientRect();
    const x = Math.min(96, Math.max(4, ((e.clientX - okvir.left) / okvir.width) * 100));
    const y = Math.min(92, Math.max(6, ((e.clientY - okvir.top) / okvir.height) * 100));
    sliderElementi[vuceni].x = Math.round(x * 10) / 10;
    sliderElementi[vuceni].y = Math.round(y * 10) / 10;
    nacrtajElemente();
  });
  ["pointerup", "pointercancel"].forEach((ev) =>
    slojElemenata.addEventListener(ev, () => { vuceni = -1; })
  );

  /* ─────── forma (nova / izmjena) ─────── */
  function otvoriFormu(o) {
    forma.reset();
    status.textContent = "";
    document.getElementById("fId").value = o ? o.id : "";
    document.getElementById("dFormaNaslov").innerHTML = o ? "Izmjena <em>objave</em>" : "Nova <em>objava</em>";
    document.getElementById("fNaslov").value = o ? o.naslov : "";
    document.getElementById("fKategorija").value = o ? o.kategorija : "Novosti";
    document.getElementById("fDatum").value = o ? o.datum : "";
    postaviSliku(o ? o.slika : "img/gold-balloons-gift.jpg");
    document.getElementById("fUvod").value = o ? o.uvod : "";
    editor.innerHTML = o ? o.sadrzaj : "<p><br></p>";
    // status
    statusPolje.value = o ? (o.status || "objavljeno") : "objavljeno";
    poljeZakazano.hidden = statusPolje.value !== "zakazano";
    document.getElementById("fObjaviU").value = (o && o.objaviU) ? o.objaviU : "";
    // slider
    sliderElementi = o && Array.isArray(o.sliderElementi) ? o.sliderElementi.map((x) => ({ ...x })) : [];
    izabraniElement = -1;
    sliderSwitch.checked = !!(o && o.slider);
    sliderPanel.hidden = !sliderSwitch.checked;
    elPanel.hidden = true;
    if (sliderSwitch.checked) osvjeziPregledSlajda();
    panelLista.classList.remove("is-active");
    panelForma.classList.add("is-active");
  }
  function nazadNaListu() {
    panelForma.classList.remove("is-active");
    panelLista.classList.add("is-active");
  }
  document.getElementById("dNova").addEventListener("click", () => otvoriFormu(null));
  document.getElementById("dNazad").addEventListener("click", nazadNaListu);

  /* ─────── slika: izbor + upload ─────── */
  function postaviSliku(putanja) {
    document.getElementById("fSlika").value = putanja;
    document.getElementById("fSlikaPregled").src = putanja;
    document.getElementById("fSlikaInfo").textContent = putanja;
    if (sliderSwitch.checked) osvjeziPregledSlajda();
  }
  document.getElementById("fSlikaDugme").addEventListener("click", () =>
    document.getElementById("fSlikaFajl").click()
  );
  document.getElementById("fSlikaFajl").addEventListener("change", () => {
    const fajl = document.getElementById("fSlikaFajl").files[0];
    if (!fajl) return;
    status.classList.remove("is-greska");
    status.textContent = "⏳ Slika se šalje…";
    const citac = new FileReader();
    citac.onload = async () => {
      try {
        const { putanja } = await api("/api/upload", {
          method: "POST",
          body: JSON.stringify({ ime: fajl.name, data: citac.result }),
        });
        postaviSliku(putanja);
        status.textContent = "✅ Slika je dodana.";
      } catch (gr) {
        status.classList.add("is-greska");
        status.textContent = "⚠ " + gr.message;
      }
    };
    citac.readAsDataURL(fajl);
  });

  /* ─────── snimanje ─────── */
  forma.addEventListener("submit", async (e) => {
    e.preventDefault();
    const naslov = document.getElementById("fNaslov").value.trim();
    const sadrzaj = editor.innerHTML.trim();
    const prazanSadrzaj = !editor.textContent.trim();
    if (!naslov || prazanSadrzaj) {
      status.classList.add("is-greska");
      status.textContent = "⚠ Naslov i sadržaj su obavezni.";
      return;
    }
    const podaci = {
      naslov,
      kategorija: document.getElementById("fKategorija").value,
      datum: document.getElementById("fDatum").value.trim() || undefined,
      slika: document.getElementById("fSlika").value,
      uvod: document.getElementById("fUvod").value.trim(),
      sadrzaj,
      status: statusPolje.value,
      objaviU: statusPolje.value === "zakazano" ? document.getElementById("fObjaviU").value : undefined,
      slider: sliderSwitch.checked,
      sliderElementi: sliderSwitch.checked ? sliderElementi : [],
    };
    if (podaci.status === "zakazano" && !podaci.objaviU) {
      status.classList.add("is-greska");
      status.textContent = "⚠ Odaberite datum i vrijeme zakazane objave.";
      return;
    }
    const id = document.getElementById("fId").value;
    status.classList.remove("is-greska");
    status.textContent = "⏳ Snimanje…";
    try {
      if (id) await api("/api/objave/" + id, { method: "PUT", body: JSON.stringify(podaci) });
      else await api("/api/objave", { method: "POST", body: JSON.stringify(podaci) });
      const poruke = { objavljeno: "✅ Snimljeno — objava je na sajtu!", skica: "📝 Snimljeno kao skica.", zakazano: "🕐 Zakazano — objaviće se automatski." };
      status.textContent = poruke[podaci.status];
      await ucitajListu();
      setTimeout(nazadNaListu, 800);
    } catch (gr) {
      status.classList.add("is-greska");
      status.textContent = "⚠ " + gr.message;
    }
  });

  /* ═══════════ SEKCIJE (sidebar) ═══════════ */
  const POCETNI_PANEL = { blog: "panelLista", galerija: "panelGLista", postavke: "panelPostavke" };
  document.querySelectorAll(".dash-side__link[data-sekcija]").forEach((dugme) => {
    dugme.addEventListener("click", () => {
      document.querySelectorAll(".dash-side__link").forEach((b) => b.classList.toggle("is-active", b === dugme));
      document.querySelectorAll(".dash-panel").forEach((p) => p.classList.remove("is-active"));
      document.getElementById(POCETNI_PANEL[dugme.dataset.sekcija]).classList.add("is-active");
      if (dugme.dataset.sekcija === "galerija") ucitajGaleriju();
      if (dugme.dataset.sekcija === "postavke") ucitajPostavke();
    });
  });

  /* ═══════════ POSTAVKE ═══════════ */
  const pStatus = document.getElementById("pStatus");

  async function ucitajPostavke() {
    const p = await api("/api/postavke");
    document.getElementById("pTelefon").value = p.telefon || "";
    document.getElementById("pTelefonPrikaz").value = p.telefonPrikaz || "";
    document.getElementById("pEmail").value = p.email || "";
    document.getElementById("pAdresa").value = p.adresa || "";
    const rv = p.radnoVrijeme;
    if (rv && typeof rv === "object") {
      document.getElementById("pRadnoPonPet").value = rv.ponPet || "";
      document.getElementById("pRadnoSub").value = rv.subota || "";
      document.getElementById("pRadnoNed").value = rv.nedjelja || "";
    } else {
      document.getElementById("pRadnoPonPet").value = rv || "";
      document.getElementById("pRadnoSub").value = "";
      document.getElementById("pRadnoNed").value = "";
    }
    document.getElementById("pInstagram").value = (p.mreze && p.mreze.instagram !== "#") ? p.mreze.instagram : "";
    document.getElementById("pFacebook").value = (p.mreze && p.mreze.facebook !== "#") ? p.mreze.facebook : "";
    document.getElementById("pTiktok").value = (p.mreze && p.mreze.tiktok !== "#") ? p.mreze.tiktok : "";
    document.getElementById("pMapa").value = p.mapa || "";
    pStatus.textContent = "";
  }

  document.getElementById("pForma").addEventListener("submit", async (e) => {
    e.preventDefault();
    const podaci = {
      telefon: document.getElementById("pTelefon").value.trim(),
      telefonPrikaz: document.getElementById("pTelefonPrikaz").value.trim(),
      email: document.getElementById("pEmail").value.trim(),
      adresa: document.getElementById("pAdresa").value.trim(),
      radnoVrijeme: {
        ponPet: document.getElementById("pRadnoPonPet").value.trim(),
        subota: document.getElementById("pRadnoSub").value.trim(),
        nedjelja: document.getElementById("pRadnoNed").value.trim(),
      },
      mreze: {
        instagram: document.getElementById("pInstagram").value.trim() || "#",
        facebook: document.getElementById("pFacebook").value.trim() || "#",
        tiktok: document.getElementById("pTiktok").value.trim() || "#",
      },
      mapa: document.getElementById("pMapa").value.trim(),
    };
    if (!podaci.telefon || !podaci.email) {
      pStatus.classList.add("is-greska");
      pStatus.textContent = "⚠ Telefon i email su obavezni.";
      return;
    }
    pStatus.classList.remove("is-greska");
    pStatus.textContent = "⏳ Snimanje…";
    try {
      await api("/api/postavke", { method: "PUT", body: JSON.stringify(podaci) });
      pStatus.textContent = "✅ Snimljeno — postavke važe na cijelom sajtu!";
    } catch (gr) {
      pStatus.classList.add("is-greska");
      pStatus.textContent = "⚠ " + gr.message;
    }
  });

  /* ═══════════ GALERIJA ═══════════ */
  const gLista = document.getElementById("gLista");
  const gForma = document.getElementById("gForma");
  const gStatus = document.getElementById("gStatus");
  const KATEGORIJE = { vjencanja: "Vjenčanja", rodjendani: "Rođendani", djecije: "Dječije", efekti: "Efekti" };
  let galerija = [];

  const gFilter = { kat: "", god: "" };
  const gDatumPrikaz = (iso) => (iso ? iso.split("-").reverse().join(".") + "." : "—");

  function prikaziGaleriju() {
    const stavke = galerija.filter((s) =>
      (!gFilter.kat || s.kategorija === gFilter.kat) &&
      (!gFilter.god || (s.datum || "").startsWith(gFilter.god))
    );
    document.getElementById("gBrojac").textContent =
      (gFilter.kat || gFilter.god)
        ? stavke.length + " od " + galerija.length + " fotografija (filtrirano)"
        : galerija.length + " fotografija u galeriji";
    gLista.innerHTML = stavke.length
      ? stavke.map((s) => `
          <div class="dash-red">
            <img class="dash-red__slika" src="${s.slika}" alt="">
            <div class="dash-red__info">
              <h3>${s.naslov}</h3>
              <p><span class="b-kat">${KATEGORIJE[s.kategorija] || s.kategorija}</span> 📅 ${gDatumPrikaz(s.datum)} &nbsp; ${s.slika}</p>
            </div>
            <div class="dash-red__akcije">
              <button class="dash-mini" data-guredi="${s.id}">✏️ Uredi</button>
              <button class="dash-mini dash-mini--obrisi" data-gobrisi="${s.id}">🗑 Obriši</button>
            </div>
          </div>`).join("")
      : '<p style="color:var(--muted); padding:2rem 0;">Nema fotografija za izabrani filter. 📸</p>';
  }

  function napuniGodine() {
    const izbor = document.getElementById("gFilterGod");
    const trenutna = izbor.value;
    const godine = [...new Set(galerija.map((s) => (s.datum || "").slice(0, 4)).filter(Boolean))].sort().reverse();
    izbor.innerHTML = '<option value="">Sve</option>' +
      godine.map((g) => `<option value="${g}">${g}</option>`).join("");
    izbor.value = godine.includes(trenutna) ? trenutna : "";
  }

  document.getElementById("gFilterKat").addEventListener("change", (e) => {
    gFilter.kat = e.target.value;
    prikaziGaleriju();
  });
  document.getElementById("gFilterGod").addEventListener("change", (e) => {
    gFilter.god = e.target.value;
    prikaziGaleriju();
  });

  async function ucitajGaleriju() {
    galerija = await api("/api/galerija");
    napuniGodine();
    prikaziGaleriju();
  }

  gLista.addEventListener("click", async (e) => {
    const urediId = e.target.dataset.guredi;
    const obrisiId = e.target.dataset.gobrisi;
    if (urediId) otvoriGFormu(galerija.find((s) => s.id === urediId));
    if (obrisiId) {
      const s = galerija.find((x) => x.id === obrisiId);
      if (confirm('Ukloniti "' + s.naslov + '" iz galerije?')) {
        await api("/api/galerija/" + obrisiId, { method: "DELETE" });
        await ucitajGaleriju();
      }
    }
  });

  function otvoriGFormu(s) {
    gForma.reset();
    gStatus.textContent = "";
    document.getElementById("gId").value = s ? s.id : "";
    document.getElementById("gFormaNaslov").innerHTML = s ? "Izmjena <em>fotografije</em>" : "Nova <em>fotografija</em>";
    document.getElementById("gNaslov").value = s ? s.naslov : "";
    document.getElementById("gKategorija").value = s ? s.kategorija : "vjencanja";
    postaviGSliku(s ? s.slika : "");
    document.querySelectorAll(".dash-panel").forEach((p) => p.classList.remove("is-active"));
    document.getElementById("panelGForma").classList.add("is-active");
  }
  function nazadNaGListu() {
    document.querySelectorAll(".dash-panel").forEach((p) => p.classList.remove("is-active"));
    document.getElementById("panelGLista").classList.add("is-active");
  }
  document.getElementById("gNova").addEventListener("click", () => otvoriGFormu(null));
  document.getElementById("gNazad").addEventListener("click", nazadNaGListu);

  function postaviGSliku(putanja) {
    document.getElementById("gSlika").value = putanja;
    document.getElementById("gSlikaPregled").src = putanja || "img/gold-balloons-gift.jpg";
    document.getElementById("gSlikaInfo").textContent = putanja || "—";
  }
  document.getElementById("gSlikaDugme").addEventListener("click", () =>
    document.getElementById("gSlikaFajl").click()
  );
  document.getElementById("gSlikaFajl").addEventListener("change", () => {
    const fajl = document.getElementById("gSlikaFajl").files[0];
    if (!fajl) return;
    gStatus.classList.remove("is-greska");
    gStatus.textContent = "⏳ Slika se šalje…";
    const citac = new FileReader();
    citac.onload = async () => {
      try {
        const { putanja } = await api("/api/upload", {
          method: "POST",
          body: JSON.stringify({ ime: fajl.name, data: citac.result, folder: "galerija" }),
        });
        postaviGSliku(putanja);
        gStatus.textContent = "✅ Slika je dodana.";
      } catch (gr) {
        gStatus.classList.add("is-greska");
        gStatus.textContent = "⚠ " + gr.message;
      }
    };
    citac.readAsDataURL(fajl);
  });

  gForma.addEventListener("submit", async (e) => {
    e.preventDefault();
    const podaci = {
      naslov: document.getElementById("gNaslov").value.trim(),
      kategorija: document.getElementById("gKategorija").value,
      slika: document.getElementById("gSlika").value,
    };
    if (!podaci.naslov || !podaci.slika) {
      gStatus.classList.add("is-greska");
      gStatus.textContent = "⚠ Fotografija i naslov su obavezni.";
      return;
    }
    const id = document.getElementById("gId").value;
    gStatus.classList.remove("is-greska");
    gStatus.textContent = "⏳ Snimanje…";
    try {
      if (id) await api("/api/galerija/" + id, { method: "PUT", body: JSON.stringify(podaci) });
      else await api("/api/galerija", { method: "POST", body: JSON.stringify(podaci) });
      gStatus.textContent = "✅ Snimljeno — fotografija je u galeriji!";
      await ucitajGaleriju();
      setTimeout(nazadNaGListu, 700);
    } catch (gr) {
      gStatus.classList.add("is-greska");
      gStatus.textContent = "⚠ " + gr.message;
    }
  });

  /* ─────── odjava ─────── */
  document.getElementById("dOdjava").addEventListener("click", async () => {
    await api("/api/odjava", { method: "POST" });
    location.href = "prijava.html";
  });
})();
