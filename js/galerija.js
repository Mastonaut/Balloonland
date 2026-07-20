/* ═══════════════════════════════════════════
   BALLOON LAND — Galerija render
   Crta masonry iz window.GALERIJA_STAVKE.
   MORA se učitati PRIJE main.js (filter + lightbox
   iz main.js rade nad već nacrtanim stavkama).
   ═══════════════════════════════════════════ */
(function () {
  "use strict";
  const masonry = document.getElementById("masonry");
  if (!masonry || !window.GALERIJA_STAVKE) return;

  const kat = window.GALERIJA_KATEGORIJE || {};
  masonry.innerHTML = window.GALERIJA_STAVKE
    .map((s) => `
      <figure class="g-item reveal" data-cat="${s.kategorija}">
        <img src="${s.slika}" alt="${s.naslov}" loading="lazy">
        <figcaption><span>${kat[s.kategorija] || s.kategorija}</span><h3>${s.naslov}</h3></figcaption>
      </figure>`)
    .join("");
})();
