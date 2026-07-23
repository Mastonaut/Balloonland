/* ═══════════════════════════════════════════
   BALLOON LAND — SEO (JSON-LD + osvježavanje meta tagova)
   - ubacuje strukturirane podatke (schema.org) koje Google čita:
     LocalBusiness (svugdje) + Service / FAQPage / Article po stranici
   - osvježava Open Graph / Twitter iz CMS postavki (za konzistentnost;
     statični OG u <head> pokriva social scrapere koji ne izvršavaju JS)
   Učitava se POSLIJE svih *-data.js skripti.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";
  const P = window.POSTAVKE || {};
  const S = P.seo || {};
  const base = (S.sajtUrl || "").replace(/\/+$/, "");
  const naziv = S.nazivSajta || "Balloon Land";
  const abs = (u) => (!u ? "" : /^https?:\/\//.test(u) ? u : base ? base + "/" + u.replace(/^\//, "") : u);

  function setMeta(prop, val, attr) {
    if (!val) return;
    attr = attr || "property";
    let el = document.head.querySelector('meta[' + attr + '="' + prop + '"]');
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, prop); document.head.appendChild(el); }
    el.setAttribute("content", val);
  }
  function ldSkripta(obj) {
    cistiPrazno(obj);
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  }
  function cistiPrazno(o) {
    Object.keys(o).forEach((k) => {
      const v = o[k];
      if (v === undefined || v === null || v === "") delete o[k];
      else if (typeof v === "object" && !Array.isArray(v)) cistiPrazno(v);
    });
    return o;
  }

  const naslov = document.title;
  const opisEl = document.head.querySelector('meta[name="description"]');
  const opis = (opisEl && opisEl.content) || S.opis || "";
  const ogSlika = abs(S.ogSlika) || abs("img/hero-gold-arch.jpg");
  const put = location.pathname;

  /* ─── OG/Twitter: samo dopuni ako fiksna stranica NEMA statične tagove
     (statični <head> pokriva social scrapere; ne gazimo per-page sliku) ─── */
  if (!document.head.querySelector('meta[property="og:title"]')) {
    setMeta("og:site_name", naziv);
    setMeta("og:title", naslov);
    setMeta("og:description", opis);
    setMeta("og:url", location.href.split(/[?#]/)[0]);
    if (ogSlika) setMeta("og:image", ogSlika);
    setMeta("twitter:card", "summary_large_image", "name");
    setMeta("twitter:title", naslov, "name");
    setMeta("twitter:description", opis, "name");
    if (ogSlika) setMeta("twitter:image", ogSlika, "name");
  }

  /* ─── LocalBusiness (svaka stranica) ─── */
  const lb = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: naziv,
    description: opis,
    url: base || location.origin,
    telephone: P.telefon || "",
    email: P.email || "",
    image: ogSlika,
  };
  if (P.adresa || S.grad || S.drzava) {
    lb.address = { "@type": "PostalAddress", streetAddress: P.adresa || "", addressLocality: S.grad || "", addressCountry: S.drzava || "" };
  }
  if (S.lat && S.lng) lb.geo = { "@type": "GeoCoordinates", latitude: S.lat, longitude: S.lng };
  const m = P.mreze || {};
  const sameAs = [m.instagram, m.facebook, m.tiktok].filter((u) => u && u !== "#");
  if (sameAs.length) lb.sameAs = sameAs;
  ldSkripta(lb);

  /* ─── Service (usluge.html) ─── */
  if (/usluge\.html$/.test(put) && Array.isArray(window.USLUGE)) {
    window.USLUGE.forEach((u) => ldSkripta({
      "@context": "https://schema.org",
      "@type": "Service",
      name: (u.pill || "").trim(),
      description: (u.tekst || "").slice(0, 300),
      provider: { "@type": "LocalBusiness", name: naziv },
      areaServed: S.drzava || "",
    }));
  }

  /* ─── FAQPage (paketi.html) ─── */
  if (/paketi\.html$/.test(put) && Array.isArray(window.PAKETI_FAQ) && window.PAKETI_FAQ.length) {
    ldSkripta({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: window.PAKETI_FAQ.map((f) => ({
        "@type": "Question",
        name: f.pitanje,
        acceptedAnswer: { "@type": "Answer", text: f.odgovor },
      })),
    });
  }

  /* ─── Article (objava.html) ─── */
  if (/objava\.html$/.test(put) && Array.isArray(window.BLOG_OBJAVE)) {
    const id = new URLSearchParams(location.search).get("id");
    const o = window.BLOG_OBJAVE.find((x) => x.id === id);
    if (o) {
      const oOpis = o.seoOpis || o.uvod || opis;
      ldSkripta({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: o.naslov,
        image: abs(o.slika),
        description: oOpis,
        author: { "@type": "Organization", name: naziv },
        publisher: { "@type": "Organization", name: naziv, logo: { "@type": "ImageObject", url: abs("img/logo-black.png") } },
      });
      // OG za konkretnu objavu (Google; social preview → statičke stranice, korak 3)
      setMeta("og:type", "article");
      setMeta("og:title", (o.seoNaslov || o.naslov) + " — " + naziv);
      setMeta("og:description", oOpis);
      if (abs(o.slika)) setMeta("og:image", abs(o.slika));
    }
  }
})();
