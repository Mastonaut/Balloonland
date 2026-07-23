/* ═══════════════════════════════════════════
   BALLOON LAND — Blog (lista + pojedinačna objava)
   Crta stranice iz window.BLOG_OBJAVE (js/blog-data.js).
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  const objave = window.BLOG_OBJAVE || [];
  const altZa = (p, f) => (window.MEDIA && window.MEDIA[p] && window.MEDIA[p].alt) || f || "";

  /* ─────── LISTA OBJAVA (blog.html) ─────── */
  const list = document.getElementById("blogList");
  if (list) {
    if (!objave.length) {
      list.innerHTML = '<p class="blog__empty">Uskoro stižu prve objave! 🎈</p>';
    } else {
      list.innerHTML = objave
        .map((o, i) => `
          <a href="objava.html?id=${encodeURIComponent(o.id)}" class="b-card reveal${i === 0 ? " b-card--featured" : ""}" style="--d:${(i % 3) * 0.08}s">
            <div class="b-card__media">
              <img src="${o.slika}" alt="${altZa(o.slika, o.naslov)}" loading="lazy">
              <span class="b-card__cat">${o.kategorija}</span>
            </div>
            <div class="b-card__body">
              <p class="b-card__date">${o.datum}</p>
              <h2>${o.naslov}</h2>
              <p class="b-card__uvod">${o.uvod}</p>
              <span class="b-card__link">Pročitaj više →</span>
            </div>
          </a>`)
        .join("");
      // reveal animacije za dinamički dodane kartice
      if (window.IntersectionObserver) {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) { e.target.classList.add("is-visible"); obs.unobserve(e.target); }
          });
        }, { threshold: 0.1 });
        list.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
      }
    }
  }

  /* ─────── POJEDINAČNA OBJAVA (objava.html) ─────── */
  const article = document.getElementById("articleWrap");
  if (article) {
    const id = new URLSearchParams(location.search).get("id");
    const idx = objave.findIndex((o) => o.id === id);
    const o = objave[idx];

    if (!o) {
      article.innerHTML = `
        <div class="article__missing">
          <span>🎈</span>
          <h1>Objava nije pronađena</h1>
          <p>Možda je uklonjena ili je link pogrešan.</p>
          <a href="blog.html" class="btn btn--gold">← Nazad na blog</a>
        </div>`;
      return;
    }

    document.title = o.naslov + " — Balloon Land Blog";

    const prev = objave[idx + 1]; // starija
    const next = objave[idx - 1]; // novija
    article.innerHTML = `
      <p class="article__meta"><span class="b-card__cat">${o.kategorija}</span> <span class="article__date">${o.datum}</span></p>
      <h1 class="article__title">${o.naslov}</h1>
      <img class="article__hero" src="${o.slika}" alt="${altZa(o.slika, o.naslov)}">
      <div class="article__content">${o.sadrzaj}</div>
      <div class="article__nav">
        ${next ? `<a href="objava.html?id=${encodeURIComponent(next.id)}" class="article__navlink">← ${next.naslov}</a>` : "<span></span>"}
        ${prev ? `<a href="objava.html?id=${encodeURIComponent(prev.id)}" class="article__navlink article__navlink--right">${prev.naslov} →</a>` : "<span></span>"}
      </div>`;
  }
})();
