/* ═══════════════════════════════════════════
   BALLOON LAND — Prijava na dashboard
   UI ljuska za budući CMS. Prava autentikacija
   stiže sa CMS backendom — ovdje je označeno
   mjesto gdje se kači (vidi PRIJAVI_SE ispod).
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  const loginForm = document.getElementById("loginForm");
  const resetForm = document.getElementById("resetForm");
  if (!loginForm || !resetForm) return;

  /* ─────── prebacivanje panela prijava ⇄ reset ─────── */
  function show(form) {
    [loginForm, resetForm].forEach((f) => f.classList.toggle("is-active", f === form));
  }
  document.getElementById("toReset").addEventListener("click", () => show(resetForm));
  document.getElementById("toLogin").addEventListener("click", () => show(loginForm));

  /* ─────── prikaži / sakrij lozinku ─────── */
  const pass = document.getElementById("lPass");
  const eye = document.getElementById("lEye");
  eye.addEventListener("click", () => {
    const otkrij = pass.type === "password";
    pass.type = otkrij ? "text" : "password";
    eye.classList.toggle("is-on", otkrij);
    eye.setAttribute("aria-label", otkrij ? "Sakrij lozinku" : "Prikaži lozinku");
  });

  /* ─────── validacija (crveni okvir dok je polje prazno) ─────── */
  function validiraj(form) {
    let ok = true;
    form.querySelectorAll("[required]").forEach((f) => {
      const prazno = !f.value.trim();
      f.classList.toggle("is-error", prazno);
      if (prazno) ok = false;
    });
    return ok;
  }
  [loginForm, resetForm].forEach((form) =>
    form.addEventListener("input", (e) => {
      if (e.target.matches("[required]") && e.target.value.trim()) {
        e.target.classList.remove("is-error");
      }
    })
  );

  /* ─────── PRIJAVA (CMS backend: cms/server.mjs) ─────── */
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validiraj(loginForm)) return;
    const greska = document.getElementById("loginGreska");
    const napomena = document.getElementById("loginNotice");
    greska.hidden = true;
    napomena.hidden = true;
    try {
      const r = await fetch("/api/prijava", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          korisnik: document.getElementById("lUser").value.trim(),
          lozinka: pass.value,
        }),
      });
      if (r.ok) {
        location.href = "dashboard.html";
        return;
      }
      if (r.status === 401) greska.hidden = false; // pogrešni podaci
      else napomena.hidden = false; // statički server bez API-ja (404 i sl.)
    } catch (mreza) {
      napomena.hidden = false; // server nije pokrenut (statički sajt / file://)
    }
  });

  /* ─────── RESET LOZINKE ─────── */
  resetForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validiraj(resetForm)) return;
    const email = document.getElementById("rEmail");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      email.classList.add("is-error");
      return;
    }

    // ═══ RESET_LOZINKE — ovdje se kači CMS backend ═══
    // Sigurnosna praksa: ista poruka bez obzira postoji li nalog.
    document.getElementById("resetNotice").hidden = false;
    resetForm.querySelectorAll("input, button[type=submit]").forEach((el) => (el.disabled = true));
  });
})();
