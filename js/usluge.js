/* ═══════════════════════════════════════════
   BALLOON LAND — Usluge render
   Crta pills (#uslugePills), glavne usluge (#uslugeFeatures),
   efekte (#fxHead + #fxGrid), fotokutak baner (#bannerInner)
   i korake (#koraciGrid) iz usluge-data.js.
   MORA se učitati PRIJE main.js (zbog reveal animacija).
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  const usluge = window.USLUGE || [];
  const efekti = window.USLUGE_EFEKTI;
  const foto = window.USLUGE_FOTOKUTAK;
  const koraci = window.USLUGE_KORACI || [];

  const nn = (i) => String(i + 1).padStart(2, "0");
  const altZa = (p, f) => (window.MEDIA && window.MEDIA[p] && window.MEDIA[p].alt) || f || "";

  /* ─────── PILLS ─────── */
  const pills = document.getElementById("uslugePills");
  if (pills) {
    let html = usluge.map((u) => `<a href="#${u.id}" class="pill">${u.emoji} ${u.pill}</a>`).join("");
    if (efekti) html += `<a href="#efekti" class="pill">${efekti.emoji} ${efekti.pill}</a>`;
    if (foto) html += `<a href="#fotokutak" class="pill">${foto.emoji} ${foto.pill}</a>`;
    pills.innerHTML = html;
  }

  /* ─────── GLAVNE USLUGE (naizmjenični redovi) ─────── */
  const wrap = document.getElementById("uslugeFeatures");
  if (wrap) {
    wrap.innerHTML = usluge
      .map((u, i) => `
        <section class="feature${i % 2 ? " feature--flip" : ""} section" id="${u.id}">
          <span class="feature__watermark">${nn(i)}</span>
          <div class="container feature__grid">
            <div class="feature__media reveal">
              <img src="${u.slika}" alt="${altZa(u.slika, u.pill + " — Balloon Land")}" loading="lazy">
              ${u.tag ? `<span class="feature__tag">${u.tag}</span>` : ""}
            </div>
            <div class="feature__content reveal" style="--d:.15s">
              <p class="section__kicker">Usluga ${nn(i)}</p>
              <h2 class="section__title">${u.naslov}</h2>
              <p class="feature__text">${u.tekst}</p>
              <ul class="feature__chips">${u.chips.map((c) => `<li>${c}</li>`).join("")}</ul>
              <div class="feature__actions">
                <a href="kontakt.html" class="btn btn--gold">Zatraži ponudu</a>
                ${u.sekundarno ? `<a href="${u.sekundarno.link}" class="btn btn--outline">${u.sekundarno.tekst}</a>` : ""}
              </div>
            </div>
          </div>
        </section>`)
      .join("");
  }

  /* ─────── SPECIJALNI EFEKTI ─────── */
  const fxHead = document.getElementById("fxHead");
  if (fxHead && efekti) {
    fxHead.innerHTML = `
      <p class="section__kicker section__kicker--light">Usluga ${nn(usluge.length)}</p>
      <h2 class="section__title">${efekti.naslov}</h2>
      <p class="section__sub">${efekti.podnaslov}</p>`;
  }
  const fxGrid = document.getElementById("fxGrid");
  if (fxGrid && efekti) {
    fxGrid.innerHTML = efekti.kartice
      .map((k, i) => `
        <a href="kontakt.html" class="fx-card reveal" style="--d:${i * 0.12}s">
          <img src="${k.slika}" alt="${altZa(k.slika, k.naslov)}" loading="lazy">
          <div class="fx-card__body">
            <h3>${k.naslov}</h3>
            <p>${k.tekst}</p>
            <span class="fx-card__link">Saznaj više →</span>
          </div>
        </a>`)
      .join("");
  }

  /* ─────── FOTOKUTAK BANER ─────── */
  const banner = document.getElementById("bannerInner");
  if (banner && foto) {
    const btn = (d) => `<a href="${d.link}" class="btn btn--${d.stil === "gold" ? "gold" : "ghost"} btn--lg">${d.tekst}</a>`;
    banner.innerHTML = `
      <p class="section__kicker section__kicker--light">Usluga ${nn(usluge.length + 1)}</p>
      <h2 class="photo-banner__title">${foto.naslov}</h2>
      <p class="photo-banner__sub">${foto.tekst}</p>
      <div class="cta__actions">${(foto.dugmad || []).map(btn).join("")}</div>`;
  }

  /* ─────── KAKO RADIMO ─────── */
  const koraciGrid = document.getElementById("koraciGrid");
  if (koraciGrid && koraci.length) {
    koraciGrid.innerHTML = koraci
      .map((k, i) => `
        <div class="step reveal" style="--d:${i * 0.1}s">
          <span class="step__num">${nn(i)}</span>
          <h3>${k.naslov}</h3>
          <p>${k.tekst}</p>
        </div>`)
      .join("");
  }
})();
