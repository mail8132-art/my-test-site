/* =========================================================================
   OG GROUP — Brand experience
   script.js  ·  GSAP 3 + ScrollTrigger + Lenis
   -------------------------------------------------------------------------
   Architecture
     · core     — env detection, smooth scroll, helpers
     · Preloader
     · Cursor   — dot + magnetic ring with contextual label
     · Splitter — line splitting without paid plugins
     · Intro    — hero choreography
     · Scroll   — reveals, word-fill, parallax, process rail, counters
     · Works    — filters + project overlay
     · UI       — nav, menu, form, clock
   Every module fails soft: if a library is missing the page still reads.
   ========================================================================= */

(() => {
  'use strict';

  /* ── environment ─────────────────────────────────────────────────────── */
  const html = document.documentElement;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const isSnap = /(\?|&)snap\b/.test(location.search) || html.classList.contains('snap');
  const hasGSAP = typeof window.gsap !== 'undefined';
  const hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  const hasLenis = typeof window.Lenis !== 'undefined';
  const animationEnabled = hasGSAP && !prefersReduced && !isSnap;

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const lerp = (a, b, n) => a + (b - a) * n;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  /* ── core · smooth scroll ────────────────────────────────────────────── */
  const Core = {
    lenis: null,

    initScroll() {
      if (!hasLenis || prefersReduced || isSnap) return;
      this.lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
      });

      if (hasST) {
        this.lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => this.lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (time) => { this.lenis.raf(time); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    },

    stop() { this.lenis?.stop(); },
    start() { this.lenis?.start(); },

    scrollTo(target, offset = -64) {
      const el = typeof target === 'string' ? $(target) : target;
      if (!el) return;
      if (this.lenis) {
        this.lenis.scrollTo(el, { offset, duration: 1.4 });
      } else {
        const y = el.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top: y, behavior: prefersReduced ? 'auto' : 'smooth' });
      }
    },
  };

  /* ── preloader ───────────────────────────────────────────────────────── */
  const Preloader = {
    el: null,
    count: null,
    bar: null,

    init() {
      this.el = $('#loader');
      if (!this.el) return;
      this.count = $('#loader-count');
      this.bar = $('#loader-bar');

      const seen = sessionStorage.getItem('og_seen') === '1';
      if (isSnap || prefersReduced || !animationEnabled || seen) {
        this.el.remove();
        Intro.skip();
        return;
      }

      Intro.build();
      this.run();

      /* the curtain lifts at 2.45s — a timer is used because it is the most
         reliable trigger across browsers, and a watchdog guarantees the hero
         can never stay hidden if the timeline stalls. */
      window.setTimeout(() => Intro.play(), 2450);
      window.setTimeout(() => {
        if (!html.classList.contains('is-revealed')) Intro.skip();
      }, 9000);
    },

    run() {
      /* a contour that is deliberately never finished */
      if (hasGSAP) {
        gsap.set('.loader__phoenix path', {
          strokeDasharray: (i, el) => el.getTotalLength(),
          strokeDashoffset: (i, el) => el.getTotalLength(),
        });
      }

      const state = { v: 0 };
      const tl = gsap.timeline();

      tl.to('.mark--draw circle', { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut' }, 0)
        .to('.mark--draw path', { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' }, 0.15)
        .to('.mark--draw rect', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 1.1)
        .to(state, {
          v: 100, duration: 1.9, ease: 'power2.inOut',
          onUpdate: () => {
            const n = Math.round(state.v);
            if (this.count) this.count.textContent = String(n).padStart(3, '0');
            if (this.bar) this.bar.style.width = n + '%';
          },
        }, 0)
        .to('.loader__phoenix path', {
          strokeDashoffset: (i, el) => el.getTotalLength() * 0.1,
          duration: 1.5, stagger: 0.14, ease: 'power2.inOut',
        }, 0.35)
        .to('.loader__phoenix', { opacity: 0, duration: 0.7, ease: 'power1.out' }, 1.85)
        .to('.loader__top, .loader__bottom', { opacity: 0, duration: 0.45, ease: 'power1.out' }, 1.55)
        .to('.loader__mark', { scale: 1.06, opacity: 0, duration: 0.9, ease: 'power2.inOut' }, 1.75)
        .to(this.el, {
          clipPath: 'inset(0 0 100% 0)',
          duration: 1.05,
          ease: 'expo.inOut',
          onComplete: () => {
            this.el.remove();
            this.dispose();
            sessionStorage.setItem('og_seen', '1');
          },
        }, 2.1);
    },

    dispose() { this.el = null; },
  };

  /* ── cursor ──────────────────────────────────────────────────────────── */
  const Cursor = {
    el: null, dot: null, ring: null, label: null,
    x: 0, y: 0, tx: 0, ty: 0, visible: false,

    init() {
      if (isTouch || prefersReduced || isSnap) return;
      this.el = $('.cursor');
      if (!this.el) return;
      this.dot = $('.cursor__dot', this.el);
      this.ring = $('.cursor__ring', this.el);
      this.label = $('.cursor__label', this.el);
      this.feather = $('.feather');

      window.addEventListener('pointermove', (e) => {
        this.tx = e.clientX;
        this.ty = e.clientY;
        if (!this.visible) {
          this.visible = true;
          this.x = e.clientX; this.y = e.clientY;
          this.el.classList.add('is-on');
        }
      }, { passive: true });

      document.addEventListener('pointerleave', () => this.el.classList.remove('is-on'));

      this.bindStates();
      this.bindFeather();
      this.loop();
    },

    /* 5 · a feather appears for a fifth of a second next to the cursor */
    bindFeather() {
      if (!this.feather) return;
      let timer = 0;
      document.addEventListener('pointerover', (e) => {
        if (!e.target.closest('a, button, .work, .row')) return;
        this.feather.classList.add('is-on');
        window.clearTimeout(timer);
        timer = window.setTimeout(() => this.feather.classList.remove('is-on'), 210);
      });
    },

    bindStates() {
      const hoverables = 'a, button, .filter, [data-cursor]';
      document.addEventListener('pointerover', (e) => {
        const hit = e.target.closest(hoverables);
        if (!hit) return;
        const label = hit.getAttribute('data-cursor');
        if (label) {
          this.label.textContent = label;
          this.el.classList.add('is-label');
        } else {
          this.el.classList.add('is-hover');
        }
      });
      document.addEventListener('pointerout', (e) => {
        if (!e.target.closest(hoverables)) return;
        this.el.classList.remove('is-hover', 'is-label');
      });
    },

    loop() {
      const tick = () => {
        this.x = lerp(this.x, this.tx, 0.16);
        this.y = lerp(this.y, this.ty, 0.16);
        if (this.dot) this.dot.style.transform = `translate(${this.tx}px, ${this.ty}px) translate(-50%,-50%)`;
        if (this.feather) this.feather.style.transform = `translate(${this.tx + 15}px, ${this.ty + 13}px) translate(-50%,-50%)`;
        if (this.ring) this.ring.style.transform = `translate(${this.x}px, ${this.y}px) translate(-50%,-50%)`;
        requestAnimationFrame(tick);
      };
      tick();
    },
  };

  /* ── split text (lines) ──────────────────────────────────────────────── */
  const Splitter = {
    split(el) {
      if (el.dataset.split === 'done') return $$('.line__in', el);

      /* hard line breaks are marked before tokenising, otherwise "<br>" would
         end up as a literal word inside a line */
      const source = el.innerHTML.replace(/<br\s*\/?>/gi, ' [[BR]] ');
      const tokens = source.split(/\s+/).filter((t) => t.length);

      el.innerHTML = '';
      const probes = [];

      tokens.forEach((token) => {
        if (token === '[[BR]]') {
          el.appendChild(document.createElement('br'));
          probes.push({ br: true });
          return;
        }
        const span = document.createElement('span');
        span.textContent = token;
        span.style.display = 'inline-block';
        el.appendChild(span);
        el.appendChild(document.createTextNode(' '));
        probes.push({ span, top: 0 });
      });

      probes.forEach((p) => { if (p.span) p.top = p.span.offsetTop; });

      /* group words by their visual line */
      const lines = [];
      let current = null;
      probes.forEach((p) => {
        if (p.br) { current = null; return; }
        if (!current || Math.abs(p.top - current.top) > 4) {
          current = { top: p.top, words: [] };
          lines.push(current);
        }
        current.words.push(p.span.textContent);
      });

      /* rebuild with masked lines */
      el.innerHTML = '';
      const inners = [];
      lines.forEach((line) => {
        const wrap = document.createElement('span');
        wrap.className = 'line';
        const inner = document.createElement('span');
        inner.className = 'line__in';
        inner.textContent = line.words.join(' ');
        wrap.appendChild(inner);
        el.appendChild(wrap);
        inners.push(inner);
      });

      el.dataset.split = 'done';
      return inners;
    },

    init() {
      if (!animationEnabled) return;
      $$('[data-split]').forEach((el) => {
        const inners = this.split(el);
        gsap.from(inners, {
          yPercent: 115,
          duration: 1.05,
          ease: 'expo.out',
          stagger: 0.075,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
    },
  };

  /* ── hero intro ──────────────────────────────────────────────────────── */
  /**
   * The hero reveal itself is CSS-driven (see `html.is-revealed` rules) so the
   * first screen is never dependent on the GSAP ticker. JS only decides *when*
   * to arm and fire it, and can always fall back to showing everything.
   */
  const Intro = {
    played: false,

    build() {
      if (!animationEnabled) return;
      html.classList.add('anim-armed');
    },

    play() {
      if (this.played) return;
      this.played = true;
      requestAnimationFrame(() => {
        html.classList.add('is-revealed');
        html.classList.add('is-ready');
      });
    },

    /** reveal everything immediately (reduced motion, no-JS, returning visit) */
    skip() {
      this.played = true;
      html.classList.remove('anim-armed');
      html.classList.add('is-ready', 'is-revealed');
    },
  };

  /* ── scroll choreography ─────────────────────────────────────────────── */
  const Scroll = {
    init() {
      if (!animationEnabled) return;
      this.reveals();
      this.wordFill();
      this.parallax();
      this.process();
      this.counters();
      this.marquee();
    },

    reveals() {
      $$('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          y: 34,
          autoAlpha: 0,
          duration: 1.05,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
    },

    wordFill() {
      $$('[data-fill]').forEach((el) => {
        const words = el.textContent.trim().split(/\s+/);
        el.innerHTML = words
          .map((w) => `<span class="w">${w}</span>`)
          .join(' ');

        gsap.to($$('.w', el), {
          opacity: 1,
          ease: 'none',
          stagger: 0.35,
          scrollTrigger: {
            trigger: el,
            start: 'top 78%',
            end: 'bottom 58%',
            scrub: 0.6,
          },
        });
      });
    },

    parallax() {
      $$('[data-parallax]').forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0.12;
        gsap.to(el, {
          yPercent: speed * -100,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('section') || el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.8,
          },
        });
      });
    },

    process() {
      const section = $('.process');
      const track = $('#process-track');
      const progress = $('#process-progress');
      const stations = $$('.station');
      if (!section || !track) return;

      /* desktop only: below 900px the track stacks vertically (see CSS) */
      if (!window.matchMedia('(min-width: 901px)').matches) return;

      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => '+=' + distance(),
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progress) progress.style.width = (self.progress * 100).toFixed(2) + '%';
            const i = Math.min(stations.length - 1, Math.floor(self.progress * stations.length));
            stations.forEach((s, j) => s.classList.toggle('is-current', j === i));
          },
        },
      });
    },

    counters() {
      $$('[data-count]').forEach((el) => {
        const target = parseInt(el.dataset.count, 10) || 0;
        const obj = { v: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          once: true,
          onEnter: () => {
            gsap.to(obj, {
              v: target,
              duration: 1.6,
              ease: 'power2.out',
              onUpdate: () => { el.textContent = String(Math.round(obj.v)).padStart(2, '0'); },
            });
          },
        });
      });
    },

    marquee() {
      const track = $('.logos__track');
      if (!track) return;
      track.innerHTML += track.innerHTML; // duplicate for a seamless loop
      gsap.to(track, {
        xPercent: -50,
        duration: 42,
        ease: 'none',
        repeat: -1,
      });
    },
  };

  /* ── works: index + stage ────────────────────────────────────────────── */
  const Works = {
    items: [],
    plates: [],
    active: 0,

    init() {
      this.items = $$('.work');
      this.plates = $$('.plate');
      if (!this.items.length) return;
      this.index();
      this.filters();
      this.modal();
    },

    /* hovering or focusing a row sets the project on the stage */
    index() {
      this.items.forEach((btn) => {
        const i = Number(btn.dataset.index);
        btn.addEventListener('mouseenter', () => this.setActive(i));
        btn.addEventListener('focus', () => this.setActive(i));
      });
    },

    setActive(i) {
      if (Number.isNaN(i) || i === this.active) return;
      this.active = i;
      this.items.forEach((b) => b.classList.toggle('is-active', Number(b.dataset.index) === i));
      this.plates.forEach((p) => p.classList.toggle('is-active', Number(p.dataset.plate) === i));
    },

    filters() {
      const buttons = $$('.filter');
      const empty = $('#works-empty');
      if (!buttons.length) return;

      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.filter;
          buttons.forEach((b) => {
            const on = b === btn;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
          });

          let firstVisible = null;
          this.items.forEach((item) => {
            const li = item.closest('.works__item');
            const show = key === 'all' || item.dataset.cat === key;
            li.classList.toggle('is-hidden', !show);
            if (show && firstVisible === null) firstVisible = Number(item.dataset.index);
          });

          if (empty) empty.hidden = firstVisible !== null;
          if (firstVisible !== null) {
            this.active = -1;
            this.setActive(firstVisible);
          }
        });
      });
    },

    modal() {
      const modal = $('#modal');
      if (!modal) return;
      const panel = $('.modal__panel', modal);
      const media = $('[data-modal-media]', modal);
      let lastFocus = null;

      const open = (btn) => {
        lastFocus = document.activeElement;
        const i = Number(btn.dataset.index);

        $('[data-modal-title]', modal).textContent = btn.dataset.title || '';
        $('[data-modal-cat]', modal).textContent = btn.dataset.catLabel || '';
        $('[data-modal-desc]', modal).textContent = btn.dataset.desc || '';
        $('[data-modal-year]', modal).textContent = btn.dataset.year || '';
        $('[data-modal-place]', modal).textContent = btn.dataset.place || '';
        $('[data-modal-role]', modal).textContent = btn.dataset.role || '';

        media.innerHTML = '';
        const plate = this.plates[i];
        const svg = plate && $('svg', plate);
        if (svg) media.appendChild(svg.cloneNode(true));

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('is-locked');
        Core.stop();

        setTimeout(() => $('.modal__close', modal)?.focus(), 60);
      };

      const close = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('is-locked');
        Core.start();
        Core.start();
        lastFocus?.focus?.();
      };

      this.items.forEach((btn) => {
        btn.addEventListener('click', () => open(btn));
      });

      $$('[data-close]', modal).forEach((el) => el.addEventListener('click', close));
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
      });

      /* basic focus trap */
      modal.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab' || !modal.classList.contains('is-open')) return;
        const focusable = $$('a[href], button:not([disabled])', panel);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    },
  };

  /* ── hero: silver sheen + parting curtain ────────────────────────────── */
  const Hero = {
    init() {
      this.sheen();
      this.parting();
    },

    /* the middle word is brushed metal: light follows the pointer */
    sheen() {
      const hero = $('.hero');
      const metal = $('.is-metal');
      if (!hero || !metal || isTouch) return;

      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        const x = clamp((e.clientX - r.left) / r.width, 0, 1);
        hero.style.setProperty('--sheen', (0.02 + x * 1.05).toFixed(3));

        const ph = $('.hero__phoenix-inner');
        if (ph) {
          const y = clamp((e.clientY - r.top) / r.height, 0, 1);
          ph.style.transform = `translate3d(${((x - 0.5) * 34).toFixed(1)}px, ${((y - 0.5) * 16).toFixed(1)}px, 0)`;
        }
      }, { passive: true });
    },

    /* on scroll the three lines part and the mark rises out of the gap */
    parting() {
      if (!animationEnabled || !hasST) return;
      if (!window.matchMedia('(min-width: 901px)').matches) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: '+=78%',
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
        },
      });

      tl.to('.hero__line--1', { yPercent: -125, ease: 'none' }, 0)
        .to('.hero__line--3', { yPercent: 125, ease: 'none' }, 0)
        .to('.hero__line--2', { scale: 1.06, opacity: 0, ease: 'none' }, 0)
        .to('.hero__mark', { opacity: 0.5, scale: 1.04, ease: 'none' }, 0)
        .to('.hero__place, .hero__note, .hero__foot', { opacity: 0, ease: 'none' }, 0);
    },
  };

  /* ── phoenix: eight places where it can be found ─────────────────────── */
  /**
   * The bird is never used as a logo: no lockups with the monogram, no
   * spinning, no gradients. Every instance is stroke-only, low contrast,
   * and reveals itself on hover or on scroll — a quiet signature.
   */
  const Phoenix = {
    init() {
      if (!animationEnabled) return;
      this.manifest();
      this.heroFlight();
      this.cardWing();
    },

    /* 4 · manifesto — the contour surfaces as you read ("out of ash") */
    manifest() {
      const fig = $('.manifest__phoenix');
      if (!fig || !hasGSAP) return;

      const paths = $$('path', fig);
      paths.forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
      });

      gsap.to(paths, {
        strokeDashoffset: 0,
        duration: 2.8,
        stagger: 0.11,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: fig, start: 'top 82%', once: true },
      });

      gsap.from($('figcaption', fig), {
        opacity: 0, y: 8, duration: 1.2, delay: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: fig, start: 'top 82%', once: true },
      });
    },

    /* 2 · hero — the fragment leaves the frame once you start scrolling */
    heroFlight() {
      const ph = $('.hero__phoenix');
      if (!ph || !hasST) return;

      ScrollTrigger.create({
        trigger: '.hero',
        start: 'top top-=40',
        onEnter: () => gsap.to(ph, { x: 170, y: 90, opacity: 0, duration: 1.2, ease: 'power2.out' }),
        onLeaveBack: () => gsap.to(ph, { x: 0, y: 0, opacity: 0.17, duration: 0.9, ease: 'power2.out' }),
      });
    },

    /* 6 · expertise rows — the wing opens for four tenths of a second */
    cardWing() {
      $$('.row').forEach((row) => {
        row.addEventListener('click', () => {
          row.classList.remove('is-wing');
          void row.offsetWidth; /* restart the animation */
          row.classList.add('is-wing');
          window.setTimeout(() => row.classList.remove('is-wing'), 500);
        });
      });
    },
  };

  /* ── ui: nav, menu, magnetic, anchors, clock, form ───────────────────── */
  const UI = {
    init() {
      this.nav();
      this.menu();
      this.magnetic();
      this.anchors();
      this.clock();
      this.form();
    },

    nav() {
      const nav = $('#nav');
      if (!nav) return;
      const lights = $$('.section--light');

      let ticking = false;
      const update = () => {
        const y = nav.offsetHeight / 2;
        nav.classList.toggle('is-scrolled', window.scrollY > 40);

        /* invert the bar while a light chapter passes under it */
        const onLight = lights.some((s) => {
          const r = s.getBoundingClientRect();
          return r.top <= y && r.bottom >= y;
        });
        nav.classList.toggle('nav--on-light', onLight && window.scrollY > 40);
        ticking = false;
      };

      update();
      window.addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      window.addEventListener('resize', update);
    },

    menu() {
      const burger = $('#burger');
      const menu = $('#menu');
      if (!burger || !menu) return;
      let open = false;

      const setState = (state) => {
        open = state;
        burger.setAttribute('aria-expanded', String(state));
        burger.setAttribute('aria-label', state ? 'Закрыть меню' : 'Открыть меню');
        menu.setAttribute('aria-hidden', String(!state));
        menu.classList.toggle('is-open', state);
        document.body.classList.toggle('is-locked', state);
        state ? Core.stop() : Core.start();

        if (hasGSAP && state) {
          gsap.fromTo($$('.menu__list a'), { y: 40, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.06, delay: 0.15, ease: 'expo.out' });
        }
      };

      burger.addEventListener('click', () => setState(!open));
      $$('a', menu).forEach((a) => a.addEventListener('click', (e) => {
        e.preventDefault();
        const href = a.getAttribute('href');
        setState(false);
        setTimeout(() => Core.scrollTo(href, -56), 260);
      }));

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && open) setState(false);
      });
    },

    magnetic() {
      if (isTouch || !hasGSAP || prefersReduced) return;
      $$('[data-magnetic]').forEach((el) => {
        const strength = 0.22;
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) * strength;
          const dy = (e.clientY - (r.top + r.height / 2)) * strength;
          gsap.to(el, { x: dx, y: dy, duration: 0.6, ease: 'power3.out' });
        });
        el.addEventListener('pointerleave', () => {
          gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
        });
      });
    },

    anchors() {
      $$('[data-scroll]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const href = a.getAttribute('href');
          if (!href || !href.startsWith('#') || href === '#') return;
          if (!$(href)) return;
          e.preventDefault();
          Core.scrollTo(href, -56);
        });
      });
    },

    clock() {
      const el = $('#clock');
      if (!el) return;
      const fmt = new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false,
      });
      const tick = () => { el.textContent = fmt.format(new Date()); };
      tick();
      setInterval(tick, 20000);
    },

    form() {
      const form = $('#form');
      if (!form) return;
      const status = $('#form-status');
      const success = $('#form-success');
      const reset = $('#form-reset');

      const setError = (field, message) => {
        const wrap = field.closest('.brief__row');
        const slot = $(`[data-error-for="${field.id}"]`, form);
        wrap.classList.toggle('has-error', Boolean(message));
        field.setAttribute('aria-invalid', message ? 'true' : 'false');
        if (slot) slot.textContent = message || '';
      };

      const validate = () => {
        let ok = true;
        const name = $('#f-name');
        const contact = $('#f-contact');
        const message = $('#f-message');

        if (name.value.trim().length < 2) { setError(name, 'Укажите имя'); ok = false; }
        else setError(name, '');

        const c = contact.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c) && !/^@?[a-zA-Z0-9_]{4,}$/.test(c)) {
          setError(contact, 'Укажите e-mail или Telegram'); ok = false;
        } else setError(contact, '');

        if (message.value.trim().length < 10) { setError(message, 'Опишите задачу — минимум 10 символов'); ok = false; }
        else setError(message, '');

        return ok;
      };

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validate()) {
          if (status) status.textContent = 'Проверьте выделенные поля.';
          $('.brief__row.has-error input, .brief__row.has-error textarea', form)?.focus();
          return;
        }

        const btn = $('button[type="submit"]', form);
        btn.disabled = true;
        btn.classList.add('is-loading');
        if (status) status.textContent = 'Отправляем…';

        const data = Object.fromEntries(new FormData(form).entries());

        try {
          /* Wire to a real endpoint in production. Native form action is the fallback. */
          await new Promise((r) => setTimeout(r, 900));
          if (status) status.textContent = '';
          form.hidden = true;
          if (success) {
            success.hidden = false;
            success.setAttribute('tabindex', '-1');
            success.focus({ preventScroll: true });
            if (hasGSAP) {
              gsap.from(success.children, { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' });
            }
          }
          console.info('[OG] lead captured', data);
        } catch (err) {
          if (status) status.textContent = 'Не удалось отправить. Напишите на y.ogorodov@oggroup.ru';
        } finally {
          btn.disabled = false;
          btn.classList.remove('is-loading');
        }
      });

      reset?.addEventListener('click', () => {
        if (success) success.hidden = true;
        form.hidden = false;
        form.reset();
        $$('.brief__row', form).forEach((f) => f.classList.remove('has-error'));
        $('#f-name')?.focus();
      });

      $$('input, textarea', form).forEach((field) => {
        field.addEventListener('blur', () => {
          if (field.value.trim()) setError(field, '');
        });
      });
    },
  };

  /* ── boot ────────────────────────────────────────────────────────────── */
  const boot = () => {
    Cursor.init();
    Core.initScroll();
    Hero.init();
    Phoenix.init();
    Preloader.init();
    Splitter.init();
    Scroll.init();
    Works.init();
    UI.init();

    window.addEventListener('load', () => { hasST && ScrollTrigger.refresh(); });
    window.addEventListener('resize', () => { hasST && ScrollTrigger.refresh(); });

    if (!animationEnabled) {
      html.classList.add('is-ready');
      if (html.classList.contains('no-js')) html.classList.remove('no-js');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
