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
}
function generisiBlogData(objave) {
  const glava = `/* ═══════════════════════════════════════════
   BALLOON LAND — Blog objave (CMS core)
   AUTOMATSKI GENERISANO iz CMS-a — ne uređuj ručno!
   Izvor: cms/podaci/blog.json (uređuje se kroz dashboard)
   ═══════════════════════════════════════════ */\n`;
  fs.writeFileSync(
    path.join(KORIJEN, "js", "blog-data.js"),
    glava + "window.BLOG_OBJAVE = " + JSON.stringify(objave, null, 2) + ";\n"
  );
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
      sadrzaj: o.sadrzaj,
    };
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
      ["naslov", "kategorija", "datum", "slika", "uvod", "sadrzaj"].forEach((polje) => {
        if (o[polje] !== undefined) objave[i][polje] = o[polje];
      });
      sacuvajObjave(objave);
      return json(res, 200, objave[i]);
    }
    if (metoda === "DELETE") {
      const [obrisana] = objave.splice(i, 1);
      sacuvajObjave(objave);
      return json(res, 200, obrisana);
    }
  }

  // upload slike (JSON: { ime, data } — data je data-URL ili čisti base64)
  if (putanja === "/api/upload" && metoda === "POST") {
    const { ime, data } = JSON.parse((await citajTijelo(req)).toString() || "{}");
    if (!data) return json(res, 400, { greska: "Nedostaje slika." });
    const cistBase64 = String(data).replace(/^data:[^;]+;base64,/, "");
    const bafer = Buffer.from(cistBase64, "base64");
    if (bafer.length > 12 * 1024 * 1024) return json(res, 400, { greska: "Slika je prevelika (max 12 MB)." });
    const ekstenzija = (path.extname(ime || "") || ".jpg").toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ekstenzija)) {
      return json(res, 400, { greska: "Dozvoljeni formati: jpg, png, webp, gif." });
    }
    const folder = path.join(KORIJEN, "img", "blog");
    fs.mkdirSync(folder, { recursive: true });
    const naziv = Date.now() + "-" + slug(path.basename(ime || "slika", ekstenzija)) + ekstenzija;
    fs.writeFileSync(path.join(folder, naziv), bafer);
    return json(res, 200, { putanja: "img/blog/" + naziv });
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
  console.log("🎈 Balloon Land CMS radi na http://localhost:" + PORT);
  console.log("   Sajt:      http://localhost:" + PORT + "/");
  console.log("   Prijava:   http://localhost:" + PORT + "/prijava.html");
  console.log("   Dashboard: http://localhost:" + PORT + "/dashboard.html");
});
