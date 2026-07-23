/* ═══════════════════════════════════════════
   BALLOON LAND — Vijesti na hero slideru
   Objave označene u CMS-u (slider: true) dodaju se
   kao slajdovi na početnoj, sa grafičkim elementima
   pozicioniranim kako su prevučeni u dashboardu.
   MORA se učitati PRIJE main.js.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";
  const kontejner = document.querySelector(".hero__slides");
  const objave = (window.BLOG_OBJAVE || []).filter((o) => o.slider);
  if (!kontejner || !objave.length) return;

  const PODRAZUMIJEVANO = {
    krug:  { velicina: 30, boja: "#2A2730" },
    traka: { velicina: 15, boja: "#2A2730" },
    pill:  { velicina: 14, boja: "#E8C877" },
  };
  const stil = (el) => {
    const d = PODRAZUMIJEVANO[el.tip] || {};
    return "left:" + el.x + "%; top:" + el.y + "%;" +
      " font-size:" + (el.velicina || d.velicina) + "px;" +
      " color:" + (el.boja || d.boja) + ";";
  };

  objave.forEach((o) => {
    const slajd = document.createElement("div");
    slajd.className = "hero__slide";
    slajd.innerHTML = `
      <div class="hero__bg" style="background-image:url('${o.slika}')"></div>
      <div class="hero__overlay"></div>
      <div class="hero__content container">
        <p class="hero__kicker"><span>${o.kategorija}</span></p>
        <h1 class="hero__title">${o.naslov}</h1>
        <p class="hero__sub">${o.uvod || ""}</p>
        <div class="hero__actions">
          <a href="objava-${o.id}.html" class="btn btn--gold">Pročitaj više</a>
        </div>
      </div>
      ${(o.sliderElementi || [])
        .map((el) => `<span class="hv-el hv-el--${el.tip}" style="${stil(el)}">${el.tekst}</span>`)
        .join("")}`;
    kontejner.appendChild(slajd);
  });
})();
