/* ═══════════════════════════════════════════
   BALLOON LAND — Primjena globalnih postavki
   Popunjava telefon, email, adresu, radno vrijeme,
   društvene mreže i mapu iz postavke-data.js
   na svakoj stranici (tel:/mailto: linkovi, footer...).
   ═══════════════════════════════════════════ */
(function () {
  "use strict";
  const P = window.POSTAVKE;
  if (!P) return;

  const telHref = "tel:" + (P.telefon || "").replace(/[^+\d]/g, "");
  const phoneRe = /\+?\d[\d\s]{6,}\d/;
  const emailRe = /[\w.+-]+@[\w-]+\.[\w.]+/;

  // mijenja samo tekstualne čvorove — emoji i struktura ostaju netaknuti
  function replaceInTextNodes(root, re, val) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (re.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(re, val);
    }
  }

  // telefoni: međunarodni zapis ostaje međunarodni, kratki ostaje kratki
  document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
    a.setAttribute("href", telHref);
    const val = a.textContent.includes("+") ? P.telefon : P.telefonPrikaz;
    replaceInTextNodes(a, phoneRe, val);
  });

  // emailovi
  document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
    a.setAttribute("href", "mailto:" + P.email);
    replaceInTextNodes(a, emailRe, P.email);
  });

  // društvene mreže
  const mreze = P.mreze || {};
  const drustvene = { Instagram: mreze.instagram, Facebook: mreze.facebook, TikTok: mreze.tiktok };
  Object.keys(drustvene).forEach((ime) => {
    document.querySelectorAll('a[aria-label="' + ime + '"]').forEach((a) => {
      a.setAttribute("href", drustvene[ime] || "#");
      if (drustvene[ime] && drustvene[ime] !== "#") {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener");
      }
    });
  });

  // kontakt stranica: adresa, radno vrijeme, mapa
  const adresa = document.getElementById("kAdresa");
  if (adresa) adresa.textContent = P.adresa;
  const radno = document.getElementById("kRadno");
  if (radno) radno.textContent = P.radnoVrijeme;
  const mapa = document.getElementById("kMapa");
  if (mapa && P.mapa) mapa.src = P.mapa;
})();
