/* ═══════════════════════════════════════════
   BALLOON LAND CMS — server (Node, bez biblioteka)
   Pokretanje:  node cms/server.mjs   →  http://localhost:8200

   - servira statički sajt (cijeli projekat)
   - API: prijava/odjava (sesije), CRUD blog objava, upload slika
   - izvor istine: cms/podaci/blog.json
   - nakon svake izmjene generiše js/blog-data.js (javni sajt
     ostaje statičan i radi bez servera)
   ═══════════════════════════════════════════ */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const CMS_DIR = path.dirname(fileURLToPath(import.meta.url));
const KORIJEN = path.dirname(CMS_DIR);
const PODACI = path.join(CMS_DIR, "podaci");
const BLOG_JSON = path.join(PODACI, "blog.json");
const KORISNICI = path.join(CMS_DIR, "korisnici.json");
const PORT = process.env.PORT || 8200;

/* ─────── korisnici (auto-kreiranje pri prvom startu) ─────── */
function hashLozinke(lozinka, salt) {
  return crypto.scryptSync(lozinka, salt, 64).toString("hex");
}
if (!fs.existsSync(KORISNICI)) {
  const salt = crypto.randomBytes(16).toString("hex");
  const podrazumijevana = "balloonland2026";
  fs.writeFileSync(KORISNICI, JSON.stringify([{
    korisnik: "admin",
    salt,
    hash: hashLozinke(podrazumijevana, salt),
  }], null, 2));
  console.log("⚠️  Kreiran nalog: admin / " + podrazumijevana + " — promijenite lozinku u cms/korisnici.json!");
}
const korisnici = JSON.parse(fs.readFileSync(KORISNICI, "utf8"));

/* ─────── sesije (u memoriji) ─────── */
const sesije = new Map();
function korisnikIzZahtjeva(req) {
  const kolacici = Object.fromEntries(
    (req.headers.cookie || "").split(";").map((c) => c.trim().split("=").map(decodeURIComponent)).filter((p) => p[0])
  );
  return sesije.get(kolacici.bl_sesija) || null;
}

/* ─────── blog podaci ─────── */
function ucitajObjave() {
  return JSON.parse(fs.readFileSync(BLOG_JSON, "utf8"));
}
function sacuvajObjave(objave) {
  fs.writeFileSync(BLOG_JSON, JSON.stringify(objave, null, 2));
  generisiBlogData(objave);
  generisiObjaveHtml();
  generisiSitemap();
}
function generisiBlogData(objave) {
  // na javni sajt idu SAMO objavljene (skice i zakazane ostaju u CMS-u)
  const javne = objave.filter((o) => (o.status || "objavljeno") === "objavljeno");
  const glava = `/* ═══════════════════════════════════════════
   BALLOON LAND — Blog objave (CMS core)
   AUTOMATSKI GENERISANO iz CMS-a — ne uređuj ručno!
   Izvor: cms/podaci/blog.json (uređuje se kroz dashboard)
   ═══════════════════════════════════════════ */\n`;
  fs.writeFileSync(
    path.join(KORIJEN, "js", "blog-data.js"),
    glava + "window.BLOG_OBJAVE = " + JSON.stringify(javne, null, 2) + ";\n"
  );
}

/* ─────── zakazane objave: automatska objava kad dođe vrijeme ─────── */
function formatirajDatum(d) {
  return d.getDate() + ". " + MJESECI[d.getMonth()] + " " + d.getFullYear() + ".";
}
function objaviZakazane() {
  const objave = ucitajObjave();
  const sada = new Date();
  let promjena = false;
  objave.forEach((o) => {
    if (o.status === "zakazano" && o.objaviU && new Date(o.objaviU) <= sada) {
      o.status = "objavljeno";
      o.datum = formatirajDatum(new Date(o.objaviU));
      delete o.objaviU;
      promjena = true;
      console.log("🕐 Zakazana objava je objavljena: " + o.naslov);
    }
  });
  if (promjena) sacuvajObjave(objave);
}

/* ─────── galerija podaci ─────── */
const GAL_JSON = path.join(PODACI, "galerija.json");
function ucitajGaleriju() {
  return JSON.parse(fs.readFileSync(GAL_JSON, "utf8"));
}
function sacuvajGaleriju(stavke) {
  fs.writeFileSync(GAL_JSON, JSON.stringify(stavke, null, 2));
  const glava = `/* ═══════════════════════════════════════════
   BALLOON LAND — Galerija (CMS core)
   AUTOMATSKI GENERISANO iz CMS-a — ne uređuj ručno!
   Izvor: cms/podaci/galerija.json (uređuje se kroz dashboard)
   ═══════════════════════════════════════════ */\n`;
  const kategorije = `\nwindow.GALERIJA_KATEGORIJE = {
  vjencanja: "Vjenčanja",
  rodjendani: "Rođendani",
  djecije: "Dječije",
  efekti: "Efekti",
};\n`;
  fs.writeFileSync(
    path.join(KORIJEN, "js", "galerija-data.js"),
    glava + "window.GALERIJA_STAVKE = " + JSON.stringify(stavke, null, 2) + ";\n" + kategorije
  );
}

/* ─────── postavke sajta ─────── */
const POSTAVKE_JSON = path.join(PODACI, "postavke.json");
function sacuvajPostavke(p) {
  fs.writeFileSync(POSTAVKE_JSON, JSON.stringify(p, null, 2));
  const glava = `/* ═══════════════════════════════════════════
   BALLOON LAND — Globalne postavke sajta (CMS core)
   AUTOMATSKI GENERISANO iz CMS-a — ne uređuj ručno!
   Izvor: cms/podaci/postavke.json (uređuje se kroz dashboard)
   ═══════════════════════════════════════════ */\n`;
  fs.writeFileSync(
    path.join(KORIJEN, "js", "postavke-data.js"),
    glava + "window.POSTAVKE = " + JSON.stringify(p, null, 2) + ";\n"
  );
  generisiSitemap();
  azurirajSveStranice();
}

/* ─────── statičke HTML stranice po blog objavi (SEO + social preview) ─────── */
function htmlEsc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function generisiObjaveHtml() {
  let template;
  try { template = fs.readFileSync(path.join(KORIJEN, "objava.html"), "utf8"); } catch (e) { return; }
  const javne = ucitajObjave().filter((o) => (o.status || "objavljeno") === "objavljeno");
  let seo = {}, naziv = "Balloon Land";
  try { const P = JSON.parse(fs.readFileSync(POSTAVKE_JSON, "utf8")); seo = P.seo || {}; naziv = seo.nazivSajta || "Balloon Land"; } catch (e) { /* nema postavki */ }
  const base = (seo.sajtUrl || "").replace(/\/+$/, "");
  const abs = (u) => (!u ? "" : /^https?:\/\//.test(u) ? u : base ? base + "/" + u.replace(/^\//, "") : u);
  const mediaAlt = {};
  try { ucitajMediju().forEach((m) => { if (m.tip === "slika" && m.alt) mediaAlt[m.putanja] = m.alt; }); } catch (e) { /* nema medija */ }

  javne.forEach((o, idx) => {
    const noviji = javne[idx - 1];
    const stariji = javne[idx + 1];
    const seoTitle = (o.seoNaslov || o.naslov || "").trim();
    const opis = (o.seoOpis || o.uvod || seo.opis || "").trim();
    const alt = mediaAlt[o.slika] || o.naslov;
    const staticUrl = (base ? base + "/" : "") + "objava-" + o.id + ".html";
    const absSlika = abs(o.slika);

    const article = {
      "@context": "https://schema.org", "@type": "Article",
      headline: o.naslov, image: absSlika || undefined, description: opis || undefined,
      author: { "@type": "Organization", name: naziv },
      publisher: { "@type": "Organization", name: naziv, logo: { "@type": "ImageObject", url: abs("img/logo-black.png") } },
    };
    const seoBlok =
      `  <title>${htmlEsc(seoTitle)} — ${htmlEsc(naziv)} Blog</title>\n` +
      `  <meta name="description" content="${htmlEsc(opis)}">\n` +
      `  <link rel="canonical" href="${htmlEsc(staticUrl)}">\n` +
      `  <meta property="og:type" content="article">\n` +
      `  <meta property="og:site_name" content="${htmlEsc(naziv)}">\n` +
      `  <meta property="og:title" content="${htmlEsc(seoTitle)}">\n` +
      `  <meta property="og:description" content="${htmlEsc(opis)}">\n` +
      `  <meta property="og:url" content="${htmlEsc(staticUrl)}">\n` +
      `  <meta property="og:image" content="${htmlEsc(absSlika)}">\n` +
      `  <meta property="og:locale" content="bs_BA">\n` +
      `  <meta name="twitter:card" content="summary_large_image">\n` +
      `  <meta name="twitter:title" content="${htmlEsc(seoTitle)}">\n` +
      `  <meta name="twitter:description" content="${htmlEsc(opis)}">\n` +
      `  <meta name="twitter:image" content="${htmlEsc(absSlika)}">\n` +
      `  <script type="application/ld+json">${JSON.stringify(article)}</script>`;

    const nav = `<div class="article__nav">\n` +
      `        ${noviji ? `<a href="objava-${noviji.id}.html" class="article__navlink">← ${htmlEsc(noviji.naslov)}</a>` : "<span></span>"}\n` +
      `        ${stariji ? `<a href="objava-${stariji.id}.html" class="article__navlink article__navlink--right">${htmlEsc(stariji.naslov)} →</a>` : "<span></span>"}\n` +
      `      </div>`;
    const clanak =
      `<p class="article__meta"><span class="b-card__cat">${htmlEsc(o.kategorija)}</span> <span class="article__date">${htmlEsc(o.datum)}</span></p>\n` +
      `      <h1 class="article__title">${htmlEsc(o.naslov)}</h1>\n` +
      `      <img class="article__hero" src="${htmlEsc(o.slika)}" alt="${htmlEsc(alt)}">\n` +
      `      <div class="article__content">${o.sadrzaj}</div>\n` +
      `      ${nav}`;

    let html = template
      .replace(/  <title>[\s\S]*?<meta name="twitter:image"[^>]*>/, seoBlok)
      .replace(/<article class="article" id="articleWrap">\s*<\/article>/, `<article class="article">${clanak}</article>`)
      .replace(/\s*<script src="js\/blog-data\.js[^>]*><\/script>/, "")
      .replace(/\s*<script src="js\/media-data\.js[^>]*><\/script>/, "")
      .replace(/\s*<script src="js\/blog\.js[^>]*><\/script>/, "");
    fs.writeFileSync(path.join(KORIJEN, "objava-" + o.id + ".html"), html);
  });

  // ukloni zastarjele static stranice (obrisane/povučene objave)
  const validni = new Set(javne.map((o) => "objava-" + o.id + ".html"));
  try {
    fs.readdirSync(KORIJEN).forEach((f) => {
      if (/^objava-.+\.html$/.test(f) && !validni.has(f)) { try { fs.unlinkSync(path.join(KORIJEN, f)); } catch (e) { /* već obrisano */ } }
    });
  } catch (e) { /* ignore */ }
}

/* ─────── SEO po fiksnim stranicama (prepisuje <head> u usluge.html / paketi.html) ─────── */
const STRANICE_SEO_DEFAULT = {
  usluge: { url: "/usluge.html", naslov: "Usluge — Balloon Land | Lux Weddings & Events", opis: "Vjenčanja, rođendani, dječije proslave, gender reveal, prskalice, dimni efekti i fotokutak — sve usluge Balloon Land na jednom mjestu.", ogSlika: "img/wedding-aisle.jpg" },
  paketi: { url: "/paketi.html", naslov: "Paketi — Balloon Land | Lux Weddings & Events", opis: "Mini BUM, Veliki BUM i Lux BUM — transparentni paketi dekoracija sa cjenovnikom dodataka. Izaberite svoj BUM.", ogSlika: "img/packages-bg.jpg" },
};
function azurirajStranicuSeo(kljuc) {
  const DEF = STRANICE_SEO_DEFAULT[kljuc];
  if (!DEF) return;
  const fajl = path.join(KORIJEN, DEF.url.replace(/^\//, ""));
  let html;
  try { html = fs.readFileSync(fajl, "utf8"); } catch (e) { return; }
  let S = {}, stranice = {}, base = "", naziv = "Balloon Land";
  try { const P = JSON.parse(fs.readFileSync(POSTAVKE_JSON, "utf8")); S = P.seo || {}; base = (S.sajtUrl || "").replace(/\/+$/, ""); naziv = S.nazivSajta || "Balloon Land"; stranice = S.stranice || {}; } catch (e) { /* nema postavki */ }
  const p = stranice[kljuc] || {};
  const naslov = (p.naslov || "").trim() || DEF.naslov;
  const opis = (p.opis || "").trim() || DEF.opis;
  const slika = (p.ogSlika || "").trim() || DEF.ogSlika;
  const ogSlika = /^https?:\/\//.test(slika) ? slika : (base ? base + "/" + slika.replace(/^\//, "") : slika);
  const url = base ? base + DEF.url : DEF.url;
  const blok =
    `  <title>${htmlEsc(naslov)}</title>\n` +
    `  <meta name="description" content="${htmlEsc(opis)}">\n` +
    `  <link rel="canonical" href="${htmlEsc(url)}">\n` +
    `  <meta property="og:type" content="website">\n` +
    `  <meta property="og:site_name" content="${htmlEsc(naziv)}">\n` +
    `  <meta property="og:title" content="${htmlEsc(naslov)}">\n` +
    `  <meta property="og:description" content="${htmlEsc(opis)}">\n` +
    `  <meta property="og:url" content="${htmlEsc(url)}">\n` +
    `  <meta property="og:image" content="${htmlEsc(ogSlika)}">\n` +
    `  <meta property="og:locale" content="bs_BA">\n` +
    `  <meta name="twitter:card" content="summary_large_image">\n` +
    `  <meta name="twitter:title" content="${htmlEsc(naslov)}">\n` +
    `  <meta name="twitter:description" content="${htmlEsc(opis)}">\n` +
    `  <meta name="twitter:image" content="${htmlEsc(ogSlika)}">`;
  const novi = html.replace(/  <title>[\s\S]*?<meta name="twitter:image"[^>]*>/, blok);
  if (novi !== html) fs.writeFileSync(fajl, novi);
}
function azurirajSveStranice() { Object.keys(STRANICE_SEO_DEFAULT).forEach(azurirajStranicuSeo); }

/* ─────── sitemap.xml + robots.txt (SEO) ─────── */
function xmlEsc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function generisiSitemap() {
  let sajtUrl = "";
  try { sajtUrl = ((JSON.parse(fs.readFileSync(POSTAVKE_JSON, "utf8")).seo) || {}).sajtUrl || ""; } catch (e) { /* nema postavki */ }
  sajtUrl = sajtUrl.trim().replace(/\/+$/, "");
  const robots = "User-agent: *\nAllow: /\nDisallow: /cms/\nDisallow: /dashboard.html\nDisallow: /prijava.html\n" +
    (sajtUrl ? "\nSitemap: " + sajtUrl + "/sitemap.xml\n" : "");
  fs.writeFileSync(path.join(KORIJEN, "robots.txt"), robots);
  if (!sajtUrl) return; // bez domene nema smislenog sitemap-a
  const danas = new Date().toISOString().slice(0, 10);
  const fiksne = [
    ["/", "1.0"], ["/usluge.html", "0.9"], ["/paketi.html", "0.9"],
    ["/galerija.html", "0.8"], ["/blog.html", "0.7"], ["/onama.html", "0.6"],
    ["/kontakt.html", "0.8"], ["/kreiraj.html", "0.6"],
  ];
  let objave = [];
  try { objave = ucitajObjave().filter((o) => (o.status || "objavljeno") === "objavljeno"); } catch (e) { /* nema bloga */ }
  const url = (loc, prio) => `  <url>\n    <loc>${xmlEsc(loc)}</loc>\n    <lastmod>${danas}</lastmod>\n    <priority>${prio}</priority>\n  </url>`;
  const stavke = fiksne.map(([u, p]) => url(sajtUrl + u, p))
    .concat(objave.map((o) => url(sajtUrl + "/objava-" + o.id + ".html", "0.6")));
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    stavke.join("\n") + "\n</urlset>\n";
  fs.writeFileSync(path.join(KORIJEN, "sitemap.xml"), xml);
}

/* ─────── paketi (kartice, tabela poređenja, dodaci, FAQ) ─────── */
const PAKETI_JSON = path.join(PODACI, "paketi.json");
function ucitajPakete() {
  return JSON.parse(fs.readFileSync(PAKETI_JSON, "utf8"));
}
function normalizujPakete(ulaz) {
  const paketi = (Array.isArray(ulaz.paketi) ? ulaz.paketi : []).map((p, i) => {
    const id = slug(String(p.id || p.ime || "paket-" + (i + 1)));
    return {
      id,
      ime: String(p.ime || "").trim() || "Paket",
      tag: String(p.tag || "").trim(),
      cijena: Number(p.cijena) || 0,
      istaknut: !!p.istaknut,
      bedz: String(p.bedz || "").trim(),
      stavke: (Array.isArray(p.stavke) ? p.stavke : [])
        .map((s) => {
          const t = String(s && s.t || "").trim();
          if (!t) return null;
          return s && s.off ? { t, off: true } : { t };
        })
        .filter(Boolean),
    };
  });
  // jedinstveni id-evi
  const vidjeni = new Set();
  paketi.forEach((p) => { while (vidjeni.has(p.id)) p.id += "-2"; vidjeni.add(p.id); });
  const idevi = paketi.map((p) => p.id);

  const poredjenje = (Array.isArray(ulaz.poredjenje) ? ulaz.poredjenje : [])
    .map((r) => {
      const stavka = String(r && r.stavka || "").trim();
      if (!stavka) return null;
      const red = { stavka };
      idevi.forEach((id) => {
        const v = r[id];
        red[id] = (v === true || v === false) ? v : (v == null ? false : String(v));
      });
      return red;
    })
    .filter(Boolean);

  const dodaci = (Array.isArray(ulaz.dodaci) ? ulaz.dodaci : [])
    .map((d) => {
      const naziv = String(d && d.naziv || "").trim();
      if (!naziv) return null;
      return {
        ikona: String(d.ikona || "🎈").trim() || "🎈",
        naziv,
        opis: String(d.opis || "").trim(),
        cijena: String(d.cijena || "").trim(),
      };
    })
    .filter(Boolean);

  const faq = (Array.isArray(ulaz.faq) ? ulaz.faq : [])
    .map((f) => {
      const pitanje = String(f && f.pitanje || "").trim();
      if (!pitanje) return null;
      return { pitanje, odgovor: String(f.odgovor || "").trim() };
    })
    .filter(Boolean);

  return { paketi, poredjenje, dodaci, faq };
}
function sacuvajPakete(ulaz) {
  const p = normalizujPakete(ulaz);
  fs.writeFileSync(PAKETI_JSON, JSON.stringify(p, null, 2));
  const glava = `/* ═══════════════════════════════════════════
   BALLOON LAND — Paketi, poređenje, dodaci i FAQ (CMS core)
   AUTOMATSKI GENERISANO iz CMS-a — ne uređuj ručno!
   Izvor: cms/podaci/paketi.json (uređuje se kroz dashboard)
   ═══════════════════════════════════════════ */\n`;
  const tijelo =
    "window.PAKETI = " + JSON.stringify(p.paketi, null, 2) + ";\n\n" +
    "window.PAKETI_POREDJENJE = " + JSON.stringify(p.poredjenje, null, 2) + ";\n\n" +
    "window.PAKETI_DODACI = " + JSON.stringify(p.dodaci, null, 2) + ";\n\n" +
    "window.PAKETI_FAQ = " + JSON.stringify(p.faq, null, 2) + ";\n";
  fs.writeFileSync(path.join(KORIJEN, "js", "paketi-data.js"), glava + tijelo);
  return p;
}

/* ─────── usluge (glavne usluge, efekti, fotokutak, koraci) ─────── */
const USLUGE_JSON = path.join(PODACI, "usluge.json");
function ucitajUsluge() {
  return JSON.parse(fs.readFileSync(USLUGE_JSON, "utf8"));
}
function normalizujUsluge(ulaz) {
  const cist = (s) => String(s == null ? "" : s).trim();
  const usluge = (Array.isArray(ulaz.usluge) ? ulaz.usluge : []).map((u, i) => {
    const id = slug(cist(u.id) || cist(u.pill) || "usluga-" + (i + 1));
    const sekTekst = u.sekundarno && cist(u.sekundarno.tekst);
    return {
      id,
      emoji: cist(u.emoji) || "🎈",
      pill: cist(u.pill) || "Usluga",
      naslov: cist(u.naslov) || "Usluga",
      tag: cist(u.tag),
      slika: cist(u.slika) || "img/gold-balloons-gift.jpg",
      tekst: cist(u.tekst),
      chips: (Array.isArray(u.chips) ? u.chips : []).map(cist).filter(Boolean),
      sekundarno: sekTekst ? { tekst: sekTekst, link: cist(u.sekundarno.link) || "kontakt.html" } : null,
    };
  });
  const vidjeni = new Set();
  usluge.forEach((u) => { while (vidjeni.has(u.id)) u.id += "-2"; vidjeni.add(u.id); });

  const e = ulaz.efekti || {};
  const efekti = {
    emoji: cist(e.emoji) || "✨",
    pill: cist(e.pill) || "Specijalni efekti",
    naslov: cist(e.naslov) || "Specijalni efekti",
    podnaslov: cist(e.podnaslov),
    kartice: (Array.isArray(e.kartice) ? e.kartice : []).map((k) => ({
      slika: cist(k.slika) || "img/gold-balloons-gift.jpg",
      naslov: cist(k.naslov),
      tekst: cist(k.tekst),
    })).filter((k) => k.naslov),
  };

  const f = ulaz.fotokutak || {};
  const fotokutak = {
    emoji: cist(f.emoji) || "📸",
    pill: cist(f.pill) || "Fotokutak",
    naslov: cist(f.naslov) || "Fotokutak",
    tekst: cist(f.tekst),
    dugmad: (Array.isArray(f.dugmad) ? f.dugmad : []).map((d) => ({
      tekst: cist(d.tekst),
      link: cist(d.link) || "kontakt.html",
      stil: d.stil === "ghost" ? "ghost" : "gold",
    })).filter((d) => d.tekst),
  };

  const koraci = (Array.isArray(ulaz.koraci) ? ulaz.koraci : []).map((k) => ({
    naslov: cist(k.naslov),
    tekst: cist(k.tekst),
  })).filter((k) => k.naslov);

  return { usluge, efekti, fotokutak, koraci };
}
function sacuvajUsluge(ulaz) {
  const u = normalizujUsluge(ulaz);
  fs.writeFileSync(USLUGE_JSON, JSON.stringify(u, null, 2));
  const glava = `/* ═══════════════════════════════════════════
   BALLOON LAND — Usluge (CMS core)
   AUTOMATSKI GENERISANO iz CMS-a — ne uređuj ručno!
   Izvor: cms/podaci/usluge.json (uređuje se kroz dashboard)
   ═══════════════════════════════════════════ */\n`;
  const tijelo =
    "window.USLUGE = " + JSON.stringify(u.usluge, null, 2) + ";\n\n" +
    "window.USLUGE_EFEKTI = " + JSON.stringify(u.efekti, null, 2) + ";\n\n" +
    "window.USLUGE_FOTOKUTAK = " + JSON.stringify(u.fotokutak, null, 2) + ";\n\n" +
    "window.USLUGE_KORACI = " + JSON.stringify(u.koraci, null, 2) + ";\n";
  fs.writeFileSync(path.join(KORIJEN, "js", "usluge-data.js"), glava + tijelo);
  return u;
}

/* ─────── media biblioteka (slike, video, dokumenti) ─────── */
const MEDIA_JSON = path.join(PODACI, "media.json");
const MEDIA_EKST = {
  slika: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"],
  dokument: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv"],
  video: [".mp4", ".webm", ".mov"],
};
const MEDIA_LIMIT = { slika: 12 * 1024 * 1024, dokument: 25 * 1024 * 1024, video: 60 * 1024 * 1024 };
function ucitajMediju() {
  if (!fs.existsSync(MEDIA_JSON)) return [];
  return JSON.parse(fs.readFileSync(MEDIA_JSON, "utf8"));
}
function sacuvajMediju(stavke) {
  fs.writeFileSync(MEDIA_JSON, JSON.stringify(stavke, null, 2));
  // javni sajt dobija mapu putanja→{alt,naslov,opis} za SEO na <img>
  const mapa = {};
  stavke.forEach((s) => {
    if (s.tip === "slika") mapa[s.putanja] = { alt: s.alt || s.naslov || "", naslov: s.naslov || "", opis: s.opis || "" };
  });
  const glava = `/* ═══════════════════════════════════════════
   BALLOON LAND — Media biblioteka (mapa za SEO alt/naslov)
   AUTOMATSKI GENERISANO iz CMS-a — ne uređuj ručno!
   Izvor: cms/podaci/media.json (uređuje se kroz dashboard)
   ═══════════════════════════════════════════ */\n`;
  fs.writeFileSync(path.join(KORIJEN, "js", "media-data.js"), glava + "window.MEDIA = " + JSON.stringify(mapa, null, 2) + ";\n");
}
function sacuvajMediaFajl(tip, ime, dataUrl) {
  const cistBase64 = String(dataUrl).replace(/^data:[^;]+;base64,/, "");
  const bafer = Buffer.from(cistBase64, "base64");
  const ekst = (path.extname(ime || "") || "").toLowerCase();
  if (!(MEDIA_EKST[tip] || []).includes(ekst)) {
    throw { status: 400, greska: "Nedozvoljen format za " + tip + " (" + (MEDIA_EKST[tip] || []).join(", ") + ")." };
  }
  if (bafer.length > (MEDIA_LIMIT[tip] || MEDIA_LIMIT.slika)) {
    throw { status: 400, greska: "Fajl je prevelik (max " + Math.round((MEDIA_LIMIT[tip]) / 1024 / 1024) + " MB)." };
  }
  const podfolder = tip === "slika" ? path.join("img", "media") : path.join("media", tip === "video" ? "video" : "dokumenti");
  const folder = path.join(KORIJEN, podfolder);
  fs.mkdirSync(folder, { recursive: true });
  const naziv = Date.now() + "-" + slug(path.basename(ime || "fajl", ekst)) + ekst;
  fs.writeFileSync(path.join(folder, naziv), bafer);
  return { putanja: podfolder.replace(/\\/g, "/") + "/" + naziv, velicina: bafer.length };
}

const MJESECI = ["januar", "februar", "mart", "april", "maj", "jun", "jul", "avgust", "septembar", "oktobar", "novembar", "decembar"];
function danasnjiDatum() {
  const d = new Date();
  return d.getDate() + ". " + MJESECI[d.getMonth()] + " " + d.getFullYear() + ".";
}

function slug(tekst) {
  const mapa = { š: "s", đ: "dj", č: "c", ć: "c", ž: "z" };
  return tekst.toLowerCase()
    .replace(/[šđčćž]/g, (s) => mapa[s])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "objava";
}

/* ─────── pomoćne ─────── */
function json(res, status, podaci, dodatniHeaderi = {}) {
  const tijelo = JSON.stringify(podaci);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...dodatniHeaderi });
  res.end(tijelo);
}
function citajTijelo(req, limit = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const dijelovi = [];
    let velicina = 0;
    req.on("data", (d) => {
      velicina += d.length;
      if (velicina > limit) { reject(new Error("preveliko")); req.destroy(); return; }
      dijelovi.push(d);
    });
    req.on("end", () => resolve(Buffer.concat(dijelovi)));
    req.on("error", reject);
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".gif": "image/gif", ".ico": "image/x-icon", ".pdf": "application/pdf",
  ".avif": "image/avif", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
};

/* ─────── API ─────── */
async function api(req, res, putanja) {
  const metoda = req.method;

  // prijava
  if (putanja === "/api/prijava" && metoda === "POST") {
    const { korisnik, lozinka } = JSON.parse((await citajTijelo(req)).toString() || "{}");
    const nadjen = korisnici.find((k) => k.korisnik === korisnik);
    if (!nadjen || !crypto.timingSafeEqual(
      Buffer.from(nadjen.hash, "hex"),
      Buffer.from(hashLozinke(String(lozinka || ""), nadjen.salt), "hex")
    )) {
      return json(res, 401, { greska: "Pogrešno korisničko ime ili lozinka." });
    }
    const token = crypto.randomBytes(24).toString("hex");
    sesije.set(token, nadjen.korisnik);
    return json(res, 200, { ok: true, korisnik: nadjen.korisnik }, {
      "Set-Cookie": "bl_sesija=" + token + "; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400",
    });
  }

  // ko sam ja
  if (putanja === "/api/ja" && metoda === "GET") {
    const korisnik = korisnikIzZahtjeva(req);
    return korisnik ? json(res, 200, { korisnik }) : json(res, 401, { greska: "Niste prijavljeni." });
  }

  // odjava
  if (putanja === "/api/odjava" && metoda === "POST") {
    const kolacici = (req.headers.cookie || "");
    const token = (kolacici.match(/bl_sesija=([^;]+)/) || [])[1];
    if (token) sesije.delete(token);
    return json(res, 200, { ok: true }, { "Set-Cookie": "bl_sesija=; Path=/; Max-Age=0" });
  }

  // sve ispod traži prijavu
  if (!korisnikIzZahtjeva(req)) return json(res, 401, { greska: "Niste prijavljeni." });

  // lista objava
  if (putanja === "/api/objave" && metoda === "GET") {
    return json(res, 200, ucitajObjave());
  }

  // nova objava
  if (putanja === "/api/objave" && metoda === "POST") {
    const o = JSON.parse((await citajTijelo(req)).toString() || "{}");
    if (!o.naslov || !o.sadrzaj) return json(res, 400, { greska: "Naslov i sadržaj su obavezni." });
    const objave = ucitajObjave();
    let id = slug(o.naslov);
    while (objave.some((x) => x.id === id)) id += "-2";
    const nova = {
      id,
      naslov: o.naslov,
      kategorija: o.kategorija || "Novosti",
      datum: o.datum || danasnjiDatum(),
      slika: o.slika || "img/gold-balloons-gift.jpg",
      uvod: o.uvod || "",
      seoNaslov: (o.seoNaslov || "").trim(),
      seoOpis: (o.seoOpis || "").trim(),
      sadrzaj: o.sadrzaj,
      status: ["objavljeno", "skica", "zakazano"].includes(o.status) ? o.status : "objavljeno",
      objaviU: o.status === "zakazano" ? (o.objaviU || null) : undefined,
      slider: !!o.slider,
      sliderElementi: Array.isArray(o.sliderElementi) ? o.sliderElementi : [],
    };
    if (nova.status === "zakazano" && !nova.objaviU) {
      return json(res, 400, { greska: "Za zakazanu objavu odaberite datum i vrijeme." });
    }
    objave.unshift(nova);
    sacuvajObjave(objave);
    return json(res, 200, nova);
  }

  // izmjena / brisanje pojedinačne objave
  const pojedinacna = putanja.match(/^\/api\/objave\/([\w-]+)$/);
  if (pojedinacna) {
    const objave = ucitajObjave();
    const i = objave.findIndex((x) => x.id === pojedinacna[1]);
    if (i < 0) return json(res, 404, { greska: "Objava nije pronađena." });

    if (metoda === "PUT") {
      const o = JSON.parse((await citajTijelo(req)).toString() || "{}");
      ["naslov", "kategorija", "datum", "slika", "uvod", "seoNaslov", "seoOpis", "sadrzaj", "status", "objaviU", "slider", "sliderElementi"].forEach((polje) => {
        if (o[polje] !== undefined) objave[i][polje] = o[polje];
      });
      if (objave[i].status === "zakazano" && !objave[i].objaviU) {
        return json(res, 400, { greska: "Za zakazanu objavu odaberite datum i vrijeme." });
      }
      if (objave[i].status !== "zakazano") delete objave[i].objaviU;
      sacuvajObjave(objave);
      return json(res, 200, objave[i]);
    }
    if (metoda === "DELETE") {
      const [obrisana] = objave.splice(i, 1);
      sacuvajObjave(objave);
      return json(res, 200, obrisana);
    }
  }

  // postavke sajta
  if (putanja === "/api/postavke" && metoda === "GET") {
    return json(res, 200, JSON.parse(fs.readFileSync(POSTAVKE_JSON, "utf8")));
  }
  if (putanja === "/api/postavke" && metoda === "PUT") {
    const p = JSON.parse((await citajTijelo(req)).toString() || "{}");
    if (!p.telefon || !p.email) return json(res, 400, { greska: "Telefon i email su obavezni." });
    const postavke = {
      telefon: p.telefon,
      telefonPrikaz: p.telefonPrikaz || p.telefon,
      email: p.email,
      adresa: p.adresa || "",
      radnoVrijeme: {
        ponPet: (p.radnoVrijeme && p.radnoVrijeme.ponPet) || "",
        subota: (p.radnoVrijeme && p.radnoVrijeme.subota) || "",
        nedjelja: (p.radnoVrijeme && p.radnoVrijeme.nedjelja) || "",
      },
      mreze: {
        instagram: (p.mreze && p.mreze.instagram) || "#",
        facebook: (p.mreze && p.mreze.facebook) || "#",
        tiktok: (p.mreze && p.mreze.tiktok) || "#",
      },
      mapa: p.mapa || "",
      seo: {
        nazivSajta: (p.seo && p.seo.nazivSajta || "").trim() || "Balloon Land",
        sajtUrl: (p.seo && p.seo.sajtUrl || "").trim().replace(/\/+$/, ""),
        opis: (p.seo && p.seo.opis || "").trim(),
        ogSlika: (p.seo && p.seo.ogSlika || "").trim(),
        grad: (p.seo && p.seo.grad || "").trim(),
        drzava: (p.seo && p.seo.drzava || "").trim(),
        lat: (p.seo && p.seo.lat || "").toString().trim(),
        lng: (p.seo && p.seo.lng || "").toString().trim(),
        stranice: (() => {
          const izv = (p.seo && p.seo.stranice) || {};
          const jedna = (k) => ({
            naslov: ((izv[k] || {}).naslov || "").trim(),
            opis: ((izv[k] || {}).opis || "").trim(),
            ogSlika: ((izv[k] || {}).ogSlika || "").trim(),
          });
          return { usluge: jedna("usluge"), paketi: jedna("paketi") };
        })(),
      },
    };
    sacuvajPostavke(postavke);
    return json(res, 200, postavke);
  }

  // galerija: lista / dodavanje / izmjena / brisanje
  if (putanja === "/api/galerija" && metoda === "GET") {
    return json(res, 200, ucitajGaleriju());
  }
  if (putanja === "/api/galerija" && metoda === "POST") {
    const s = JSON.parse((await citajTijelo(req)).toString() || "{}");
    if (!s.slika || !s.naslov) return json(res, 400, { greska: "Slika i naslov su obavezni." });
    const stavke = ucitajGaleriju();
    let id = slug(s.naslov);
    while (stavke.some((x) => x.id === id)) id += "-2";
    const nova = {
      id,
      slika: s.slika,
      kategorija: ["vjencanja", "rodjendani", "djecije", "efekti"].includes(s.kategorija) ? s.kategorija : "rodjendani",
      naslov: s.naslov,
      datum: new Date().toISOString().slice(0, 10), // datum upload-a
    };
    stavke.unshift(nova);
    sacuvajGaleriju(stavke);
    return json(res, 200, nova);
  }
  const galPojedinacna = putanja.match(/^\/api\/galerija\/([\w-]+)$/);
  if (galPojedinacna) {
    const stavke = ucitajGaleriju();
    const i = stavke.findIndex((x) => x.id === galPojedinacna[1]);
    if (i < 0) return json(res, 404, { greska: "Stavka nije pronađena." });
    if (metoda === "PUT") {
      const s = JSON.parse((await citajTijelo(req)).toString() || "{}");
      ["slika", "kategorija", "naslov", "datum"].forEach((p) => { if (s[p] !== undefined) stavke[i][p] = s[p]; });
      sacuvajGaleriju(stavke);
      return json(res, 200, stavke[i]);
    }
    if (metoda === "DELETE") {
      const [obrisana] = stavke.splice(i, 1);
      sacuvajGaleriju(stavke);
      return json(res, 200, obrisana);
    }
  }

  // paketi: cijeli dokument (kartice + poređenje + dodaci + FAQ)
  if (putanja === "/api/paketi" && metoda === "GET") {
    return json(res, 200, ucitajPakete());
  }
  if (putanja === "/api/paketi" && metoda === "PUT") {
    const ulaz = JSON.parse((await citajTijelo(req)).toString() || "{}");
    if (!Array.isArray(ulaz.paketi) || ulaz.paketi.length === 0) {
      return json(res, 400, { greska: "Potreban je barem jedan paket." });
    }
    if (ulaz.paketi.some((p) => !String(p.ime || "").trim())) {
      return json(res, 400, { greska: "Svaki paket mora imati ime." });
    }
    const sacuvano = sacuvajPakete(ulaz);
    return json(res, 200, sacuvano);
  }

  // usluge: cijeli dokument (glavne usluge + efekti + fotokutak + koraci)
  if (putanja === "/api/usluge" && metoda === "GET") {
    return json(res, 200, ucitajUsluge());
  }
  if (putanja === "/api/usluge" && metoda === "PUT") {
    const ulaz = JSON.parse((await citajTijelo(req)).toString() || "{}");
    if (!Array.isArray(ulaz.usluge) || ulaz.usluge.length === 0) {
      return json(res, 400, { greska: "Potrebna je barem jedna usluga." });
    }
    if (ulaz.usluge.some((u) => !String(u.pill || "").trim() || !String(u.naslov || "").trim())) {
      return json(res, 400, { greska: "Svaka usluga mora imati naziv (pill) i naslov." });
    }
    const sacuvano = sacuvajUsluge(ulaz);
    return json(res, 200, sacuvano);
  }

  // media biblioteka: lista
  if (putanja === "/api/media" && metoda === "GET") {
    return json(res, 200, ucitajMediju());
  }
  // media: nova stavka (upload fajla ili video link)
  if (putanja === "/api/media" && metoda === "POST") {
    const b = JSON.parse((await citajTijelo(req, 85 * 1024 * 1024)).toString() || "{}");
    const tip = ["slika", "video", "dokument"].includes(b.tip) ? b.tip : "slika";
    let putanjaFajla, izvor, velicina = 0;
    if (tip === "video" && b.izvor === "link") {
      const url = String(b.link || "").trim();
      if (!/^https?:\/\//i.test(url)) return json(res, 400, { greska: "Unesite ispravan video link (http/https)." });
      putanjaFajla = url; izvor = "link";
    } else {
      if (!b.data) return json(res, 400, { greska: "Nedostaje fajl." });
      try {
        const r = sacuvajMediaFajl(tip, b.ime, b.data);
        putanjaFajla = r.putanja; velicina = r.velicina; izvor = "upload";
      } catch (e) { return json(res, e.status || 400, { greska: e.greska || "Greška pri uploadu." }); }
    }
    const stavke = ucitajMediju();
    const nova = {
      id: "m-" + crypto.randomBytes(6).toString("hex"),
      tip,
      putanja: putanjaFajla,
      izvor,
      naslov: String(b.naslov || "").trim(),
      opis: String(b.opis || "").trim(),
      alt: String(b.alt || "").trim(),
      originalnoIme: String(b.ime || "").trim(),
      dimenzije: String(b.dimenzije || "").trim(),
      velicina,
      datum: new Date().toISOString().slice(0, 10),
    };
    stavke.unshift(nova);
    sacuvajMediju(stavke);
    return json(res, 200, nova);
  }
  // media: izmjena metapodataka / crop (nova slika) / brisanje
  const medPoj = putanja.match(/^\/api\/media\/([\w-]+)$/);
  if (medPoj) {
    const stavke = ucitajMediju();
    const i = stavke.findIndex((x) => x.id === medPoj[1]);
    if (i < 0) return json(res, 404, { greska: "Stavka nije pronađena." });
    if (metoda === "PUT") {
      const b = JSON.parse((await citajTijelo(req, 20 * 1024 * 1024)).toString() || "{}");
      ["naslov", "opis", "alt"].forEach((p) => { if (b[p] !== undefined) stavke[i][p] = String(b[p]).trim(); });
      // crop: nova verzija slike prepisuje isti fajl (reference ostaju važeće)
      if (b.data && stavke[i].tip === "slika" && stavke[i].izvor === "upload") {
        const cist = String(b.data).replace(/^data:[^;]+;base64,/, "");
        const bafer = Buffer.from(cist, "base64");
        if (bafer.length > MEDIA_LIMIT.slika) return json(res, 400, { greska: "Slika je prevelika." });
        const apsolutna = path.join(KORIJEN, stavke[i].putanja);
        if (!apsolutna.startsWith(path.join(KORIJEN, "img", "media"))) return json(res, 400, { greska: "Neispravna putanja." });
        fs.writeFileSync(apsolutna, bafer);
        stavke[i].velicina = bafer.length;
        if (b.dimenzije) stavke[i].dimenzije = String(b.dimenzije).trim();
      }
      sacuvajMediju(stavke);
      return json(res, 200, stavke[i]);
    }
    if (metoda === "DELETE") {
      const [obrisana] = stavke.splice(i, 1);
      if (obrisana.izvor === "upload") {
        const apsolutna = path.join(KORIJEN, obrisana.putanja);
        if (apsolutna.startsWith(KORIJEN) && !apsolutna.startsWith(CMS_DIR)) { try { fs.unlinkSync(apsolutna); } catch (e) { /* fajl već nestao */ } }
      }
      sacuvajMediju(stavke);
      return json(res, 200, obrisana);
    }
  }

  // upload slike (JSON: { ime, data, folder } — data je data-URL ili čisti base64)
  if (putanja === "/api/upload" && metoda === "POST") {
    const { ime, data, folder: zeljeni } = JSON.parse((await citajTijelo(req)).toString() || "{}");
    if (!data) return json(res, 400, { greska: "Nedostaje slika." });
    const cistBase64 = String(data).replace(/^data:[^;]+;base64,/, "");
    const bafer = Buffer.from(cistBase64, "base64");
    if (bafer.length > 12 * 1024 * 1024) return json(res, 400, { greska: "Slika je prevelika (max 12 MB)." });
    const ekstenzija = (path.extname(ime || "") || ".jpg").toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ekstenzija)) {
      return json(res, 400, { greska: "Dozvoljeni formati: jpg, png, webp, gif." });
    }
    const pod = ["blog", "galerija", "usluge"].includes(zeljeni) ? zeljeni : "blog";
    const folder = path.join(KORIJEN, "img", pod);
    fs.mkdirSync(folder, { recursive: true });
    const naziv = Date.now() + "-" + slug(path.basename(ime || "slika", ekstenzija)) + ekstenzija;
    fs.writeFileSync(path.join(folder, naziv), bafer);
    return json(res, 200, { putanja: "img/" + pod + "/" + naziv });
  }

  return json(res, 404, { greska: "Nepoznata ruta." });
}

/* ─────── statički fajlovi ─────── */
function staticni(req, res, putanja) {
  let fajl = decodeURIComponent(putanja);
  if (fajl === "/") fajl = "/index.html";
  const puna = path.join(KORIJEN, fajl);
  if (!puna.startsWith(KORIJEN) || puna.startsWith(CMS_DIR)) {
    res.writeHead(403); return res.end("Zabranjeno");
  }
  fs.readFile(puna, (gr, sadrzaj) => {
    if (gr) { res.writeHead(404); return res.end("Nije pronađeno"); }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(puna).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(sadrzaj);
  });
}

/* ─────── server ─────── */
http.createServer(async (req, res) => {
  const putanja = new URL(req.url, "http://x").pathname;
  try {
    if (putanja.startsWith("/api/")) await api(req, res, putanja);
    else staticni(req, res, putanja);
  } catch (gr) {
    console.error(gr);
    json(res, 500, { greska: "Greška na serveru." });
  }
}).listen(PORT, () => {
  objaviZakazane();                       // odmah pri startu
  setInterval(objaviZakazane, 60 * 1000); // pa svake minute
  generisiObjaveHtml();                   // statičke stranice objava
  generisiSitemap();                      // sitemap.xml + robots.txt
  azurirajSveStranice();                  // SEO <head> u usluge.html/paketi.html
  console.log("🎈 Balloon Land CMS radi na http://localhost:" + PORT);
  console.log("   Sajt:      http://localhost:" + PORT + "/");
  console.log("   Prijava:   http://localhost:" + PORT + "/prijava.html");
  console.log("   Dashboard: http://localhost:" + PORT + "/dashboard.html");
});
