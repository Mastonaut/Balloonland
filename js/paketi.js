/* ═══════════════════════════════════════════
   BALLOON LAND — Paketi render
   Crta kartice paketa (#paketiGrid — i na početnoj i na
   stranici Paketi), tabelu poređenja (#poredjenjeWrap),
   dodatke (#dodaciGrid) i FAQ (#faqList) iz paketi-data.js.
   MORA se učitati PRIJE main.js (zbog reveal animacija).
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  const paketi = window.PAKETI || [];

  /* ─────── KARTICE PAKETA ─────── */
  const grid = document.getElementById("paketiGrid");
  if (grid && paketi.length) {
    grid.innerHTML = paketi
      .map((p, i) => `
        <article class="package${p.istaknut ? " package--featured" : ""} reveal" style="--d:${i * 0.12}s">
          ${p.istaknut && p.bedz ? `<span class="package__badge">${p.bedz}</span>` : ""}
          <div class="package__head">
            <h3>${p.ime} <span>BUM</span></h3>
            <p class="package__tag">${p.tag}</p>
          </div>
          <div class="package__price"><sup>od</sup> ${p.cijena} <span>KM</span></div>
          <ul class="package__list">
            ${p.stavke.map((s) => `<li${s.off ? ' class="off"' : ""}>${s.t}</li>`).join("")}
          </ul>
          <a href="kontakt.html" class="btn ${p.istaknut ? "btn--gold" : "btn--outline"} package__btn">
            ${p.istaknut ? "Rezerviši odmah" : "Rezerviši"}
          </a>
        </article>`)
      .join("");
  }

  /* ─────── TABELA POREĐENJA ─────── */
  const cmpWrap = document.getElementById("poredjenjeWrap");
  const rows = window.PAKETI_POREDJENJE || [];
  if (cmpWrap && rows.length && paketi.length) {
    const cell = (v, featured) => {
      const cls = (featured ? " is-featured" : "");
      if (v === true) return `<td class="yes${cls}">✦</td>`;
      if (v === false) return `<td class="no${cls}">—</td>`;
      return `<td class="${cls.trim()}">${v}</td>`;
    };
    cmpWrap.innerHTML = `
      <table class="compare__table">
        <thead>
          <tr>
            <th>Stavka</th>
            ${paketi.map((p) => `<th${p.istaknut ? ' class="is-featured"' : ""}>${p.ime} <em>BUM</em></th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td>${r.stavka}</td>
              ${paketi.map((p) => cell(r[p.id], p.istaknut)).join("")}
            </tr>`).join("")}
          <tr class="compare__cta-row">
            <td></td>
            ${paketi.map((p) => `
              <td${p.istaknut ? ' class="is-featured"' : ""}>
                <a href="kontakt.html" class="btn ${p.istaknut ? "btn--gold" : "btn--outline"} btn--sm">Rezerviši</a>
              </td>`).join("")}
          </tr>
        </tbody>
      </table>`;
  }

  /* ─────── DODACI ─────── */
  const dodaciGrid = document.getElementById("dodaciGrid");
  const dodaci = window.PAKETI_DODACI || [];
  if (dodaciGrid && dodaci.length) {
    dodaciGrid.innerHTML = dodaci
      .map((d, i) => `
        <div class="addon reveal" style="--d:${i * 0.05}s">
          <span class="addon__icon">${d.ikona}</span>
          <h3>${d.naziv}</h3>
          <p>${d.opis}</p>
          <span class="addon__price">${d.cijena}</span>
        </div>`)
      .join("");
  }

  /* ─────── FAQ ─────── */
  const faqList = document.getElementById("faqList");
  const faq = window.PAKETI_FAQ || [];
  if (faqList && faq.length) {
    faqList.innerHTML = faq
      .map((f, i) => `
        <details class="faq__item reveal" style="--d:${i * 0.05}s">
          <summary>${f.pitanje}</summary>
          <p>${f.odgovor}</p>
        </details>`)
      .join("");
  }
})();
