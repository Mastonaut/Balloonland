/* ═══════════════════════════════════════════
   BALLOON LAND — main.js (vanilla JS)
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  /* ─────────── PRELOADER ─────────── */
  const preloader = document.getElementById("preloader");
  if (preloader) {
    window.addEventListener("load", () => {
      setTimeout(() => {
        preloader.classList.add("is-done");
        fireConfetti(); // BUM na ulasku
      }, 900);
    });
    // fallback ako load kasni
    setTimeout(() => preloader.classList.add("is-done"), 3500);
  }

  /* ─────────── NAVBAR ─────────── */
  const nav = document.getElementById("nav");
  const burger = document.getElementById("burger");
  const navLinks = document.getElementById("navLinks");

  window.addEventListener("scroll", () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
  }, { passive: true });

  burger.addEventListener("click", () => {
    burger.classList.toggle("is-open");
    navLinks.classList.toggle("is-open");
  });
  navLinks.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      burger.classList.remove("is-open");
      navLinks.classList.remove("is-open");
    })
  );

  // aktivni link prema sekciji
  const sections = document.querySelectorAll("section[id]");
  const linkMap = {};
  navLinks.querySelectorAll(".nav__link").forEach((l) => {
    linkMap[l.getAttribute("href").slice(1)] = l;
  });
  const sectionSpy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && linkMap[e.target.id]) {
          Object.values(linkMap).forEach((l) => l.classList.remove("is-active"));
          linkMap[e.target.id].classList.add("is-active");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => sectionSpy.observe(s));

  /* ─────────── HERO SLIDER ─────────── */
  const slides = document.querySelectorAll(".hero__slide");
  const dotsWrap = document.getElementById("heroDots");
  const progress = document.getElementById("heroProgress");
  const AUTOPLAY = 7000;
  const hero = document.querySelector(".hero");
  let current = 0;
  let timer = null;

  if (slides.length && dotsWrap && progress) {

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "hero__dot" + (i === 0 ? " is-active" : "");
    dot.setAttribute("aria-label", "Slajd " + (i + 1));
    dot.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = dotsWrap.querySelectorAll(".hero__dot");

  function restartProgress() {
    progress.classList.remove("is-running");
    // force reflow da se animacija restartuje
    void progress.offsetWidth;
    progress.classList.add("is-running");
  }

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle("is-active", i === current));
    dots.forEach((d, i) => d.classList.toggle("is-active", i === current));
    restartProgress();
    resetTimer();
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), AUTOPLAY);
  }

  document.getElementById("heroNext").addEventListener("click", () => goTo(current + 1));
  document.getElementById("heroPrev").addEventListener("click", () => goTo(current - 1));

  // swipe na mobitelu
  let touchX = null;
  hero.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  hero.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) goTo(current + (dx < 0 ? 1 : -1));
    touchX = null;
  }, { passive: true });

  restartProgress();
  resetTimer();

  } // kraj hero slider bloka

  /* ─────────── KONFETI (canvas) ─────────── */
  const canvas = document.getElementById("confetti");
  const ctx = canvas ? canvas.getContext("2d") : null;
  let particles = [];
  let confettiRunning = false;

  function sizeCanvas() {
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }
  window.addEventListener("resize", sizeCanvas);
  sizeCanvas();

  const COLORS = ["#c9a24b", "#e8c877", "#faf7f2", "#e8b4b8", "#a37f2e"];

  function fireConfetti() {
    if (!ctx) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    // dvije "eksplozije" — lijevo i desno dolje
    [[W * 0.12, H * 0.85], [W * 0.88, H * 0.85]].forEach(([x, y], side) => {
      for (let i = 0; i < 90; i++) {
        const angle = (side === 0 ? -80 : -100) + (Math.random() - 0.5) * 60;
        const rad = (angle * Math.PI) / 180;
        const speed = 9 + Math.random() * 13;
        particles.push({
          x, y,
          vx: Math.cos(rad) * speed,
          vy: Math.sin(rad) * speed,
          w: 5 + Math.random() * 7,
          h: 3 + Math.random() * 5,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          life: 1,
          decay: 0.005 + Math.random() * 0.006,
        });
      }
    });
    if (!confettiRunning) {
      confettiRunning = true;
      requestAnimationFrame(tickConfetti);
    }
  }

  function tickConfetti() {
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    particles.forEach((p) => {
      p.vy += 0.25; // gravitacija
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.decay;
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    particles = particles.filter((p) => p.life > 0 && p.y < canvas.offsetHeight + 40);
    if (particles.length > 0) {
      requestAnimationFrame(tickConfetti);
    } else {
      confettiRunning = false;
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    }
  }

  // bonus BUM na klik po hero-u (mimo dugmadi)
  if (hero && ctx) hero.addEventListener("click", (e) => {
    if (e.target.closest("a, button")) return;
    const W = canvas.offsetWidth;
    for (let i = 0; i < 50; i++) {
      const rad = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      particles.push({
        x: e.clientX, y: e.clientY,
        vx: Math.cos(rad) * speed,
        vy: Math.sin(rad) * speed - 4,
        w: 5 + Math.random() * 6,
        h: 3 + Math.random() * 4,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1,
        decay: 0.008 + Math.random() * 0.008,
      });
    }
    if (!confettiRunning) {
      confettiRunning = true;
      requestAnimationFrame(tickConfetti);
    }
  });

  /* ─────────── REVEAL ON SCROLL ─────────── */
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          revealObs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));

  /* ─────────── BROJAČI ─────────── */
  const counterObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = +el.dataset.count;
        const dur = 1800;
        const t0 = performance.now();
        (function step(t) {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
        })(t0);
        counterObs.unobserve(el);
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll(".stat__num").forEach((el) => counterObs.observe(el));

  /* ─────────── PARALLAX ─────────── */
  const parallaxEls = document.querySelectorAll(".parallax");
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      parallaxEls.forEach((el) => {
        const speed = +el.dataset.speed || 0.2;
        const rect = el.parentElement.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
        el.style.transform = "translateY(" + offset.toFixed(1) + "px)";
      });
      ticking = false;
    });
  }, { passive: true });

  /* ─────────── TESTIMONIALS ─────────── */
  const tSlides = document.querySelectorAll(".testi__slide");
  const tDotsWrap = document.getElementById("testiDots");
  let tCurrent = 0;
  let tTimer = null;

  if (tSlides.length && tDotsWrap) {

  tSlides.forEach((_, i) => {
    const d = document.createElement("button");
    d.className = "testi__dot" + (i === 0 ? " is-active" : "");
    d.setAttribute("aria-label", "Utisak " + (i + 1));
    d.addEventListener("click", () => tGo(i));
    tDotsWrap.appendChild(d);
  });
  const tDots = tDotsWrap.querySelectorAll(".testi__dot");

  function tGo(i) {
    tCurrent = (i + tSlides.length) % tSlides.length;
    tSlides.forEach((s, j) => s.classList.toggle("is-active", j === tCurrent));
    tDots.forEach((d, j) => d.classList.toggle("is-active", j === tCurrent));
    clearInterval(tTimer);
    tTimer = setInterval(() => tGo(tCurrent + 1), 6500);
  }
  document.getElementById("testiNext").addEventListener("click", () => tGo(tCurrent + 1));
  document.getElementById("testiPrev").addEventListener("click", () => tGo(tCurrent - 1));
  tTimer = setInterval(() => tGo(tCurrent + 1), 6500);

  } // kraj testimonials bloka

  /* ─────────── GALERIJA: FILTER + LIGHTBOX ─────────── */
  const masonry = document.getElementById("masonry");
  if (masonry) {
    const items = Array.from(masonry.querySelectorAll(".g-item"));
    const filterWrap = document.getElementById("galleryFilters");
    const emptyMsg = document.getElementById("galleryEmpty");

    // filtriranje
    if (filterWrap) {
      filterWrap.addEventListener("click", (e) => {
        const btn = e.target.closest(".pill");
        if (!btn) return;
        filterWrap.querySelectorAll(".pill").forEach((p) => p.classList.remove("is-active"));
        btn.classList.add("is-active");
        const cat = btn.dataset.filter;
        let visible = 0;
        items.forEach((item) => {
          const show = cat === "all" || item.dataset.cat === cat;
          item.classList.toggle("is-hidden", !show);
          if (show) visible++;
        });
        if (emptyMsg) emptyMsg.hidden = visible > 0;
      });
    }

    // lightbox
    const lightbox = document.getElementById("lightbox");
    const lbImg = document.getElementById("lbImg");
    const lbCaption = document.getElementById("lbCaption");
    let lbIndex = 0;

    function visibleItems() {
      return items.filter((i) => !i.classList.contains("is-hidden"));
    }

    function openLightbox(item) {
      const vis = visibleItems();
      lbIndex = vis.indexOf(item);
      renderLightbox();
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function renderLightbox() {
      const vis = visibleItems();
      if (!vis.length) return;
      lbIndex = (lbIndex + vis.length) % vis.length;
      const item = vis[lbIndex];
      const img = item.querySelector("img");
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      const title = item.querySelector("figcaption h3");
      const cat = item.querySelector("figcaption span");
      lbCaption.textContent = title ? (cat ? cat.textContent + " — " : "") + title.textContent : "";
    }

    function closeLightbox() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    items.forEach((item) => item.addEventListener("click", () => openLightbox(item)));
    document.getElementById("lbClose").addEventListener("click", closeLightbox);
    document.getElementById("lbPrev").addEventListener("click", () => { lbIndex--; renderLightbox(); });
    document.getElementById("lbNext").addEventListener("click", () => { lbIndex++; renderLightbox(); });
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") { lbIndex--; renderLightbox(); }
      if (e.key === "ArrowRight") { lbIndex++; renderLightbox(); }
    });
  }

  /* ─────────── KONTAKT FORMA ─────────── */
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    const success = document.getElementById("formSuccess");
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;
      contactForm.querySelectorAll("[required]").forEach((field) => {
        const empty = !field.value.trim();
        field.classList.toggle("is-error", empty);
        if (empty) valid = false;
      });
      const email = document.getElementById("cfEmail");
      if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        email.classList.add("is-error");
        valid = false;
      } else {
        email.classList.remove("is-error");
      }
      if (!valid) return;
      // NAPOMENA: ovdje u produkciji ide slanje na backend / email servis
      success.hidden = false;
      contactForm.querySelectorAll("input, select, textarea, button").forEach((el) => (el.disabled = true));
    });
    contactForm.addEventListener("input", (e) => {
      if (e.target.matches("[required]") && e.target.value.trim()) {
        e.target.classList.remove("is-error");
      }
    });
  }
})();
