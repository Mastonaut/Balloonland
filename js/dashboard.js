/* ═══════════════════════════════════════════
   BALLOON LAND — CMS Dashboard (blog sekcija)
   Radi sa cms/server.mjs API-jem.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  const lista = document.getElementById("dLista");
  if (!lista) return;

  const panelLista = document.getElementById("panelLista");
  const panelForma = document.getElementById("panelForma");
  const forma = document.getElementById("dForma");
  const status = document.getElementById("dStatus");
  let objave = [];

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

  /* ─────── provjera prijave + početno učitavanje ─────── */
  (async () => {
    try {
      await api("/api/ja");
      await ucitajListu();
    } catch (gr) { /* preusmjeren na prijavu */ }
  })();

  /* ─────── lista objava ─────── */
  async function ucitajListu() {
    objave = await api("/api/objave");
    document.getElementById("dBrojac").textContent =
      objave.length + (objave.length === 1 ? " objava" : " objave/a") + " na sajtu";
    lista.innerHTML = objave.length
      ? objave.map((o) => `
          <div class="dash-red">
            <img class="dash-red__slika" src="${o.slika}" alt="">
            <div class="dash-red__info">
              <h3>${o.naslov}</h3>
              <p><span class="b-kat">${o.kategorija}</span> ${o.datum}</p>
            </div>
            <div class="dash-red__akcije">
              <a class="dash-mini" href="objava.html?id=${encodeURIComponent(o.id)}" target="_blank" rel="noopener">👁 Pogledaj</a>
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

  /* ─────── sadržaj: HTML ⇄ pasusi u textarea ─────── */
  function uPasuse(html) {
    return (html || "")
      .replace(/\s*<\/p>\s*<p>\s*/g, "\n\n")
      .replace(/^\s*<p>\s*/, "")
      .replace(/\s*<\/p>\s*$/, "")
      .trim();
  }
  function uHtml(tekst) {
    return tekst.trim().split(/\n\s*\n/)
      .map((p) => "<p>" + p.trim().replace(/\n/g, " ") + "</p>")
      .join("\n      ");
  }

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
    document.getElementById("fSadrzaj").value = o ? uPasuse(o.sadrzaj) : "";
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
    const sadrzajTekst = document.getElementById("fSadrzaj").value.trim();
    if (!naslov || !sadrzajTekst) {
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
      sadrzaj: uHtml(sadrzajTekst),
    };
    const id = document.getElementById("fId").value;
    status.classList.remove("is-greska");
    status.textContent = "⏳ Snimanje…";
    try {
      if (id) await api("/api/objave/" + id, { method: "PUT", body: JSON.stringify(podaci) });
      else await api("/api/objave", { method: "POST", body: JSON.stringify(podaci) });
      status.textContent = "✅ Snimljeno — objava je na sajtu!";
      await ucitajListu();
      setTimeout(nazadNaListu, 700);
    } catch (gr) {
      status.classList.add("is-greska");
      status.textContent = "⚠ " + gr.message;
    }
  });

  /* ─────── odjava ─────── */
  document.getElementById("dOdjava").addEventListener("click", async () => {
    await api("/api/odjava", { method: "POST" });
    location.href = "prijava.html";
  });
})();
