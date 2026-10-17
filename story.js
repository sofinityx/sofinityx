/* SofinityX homepage story engine.
   One rAF loop reads scroll position and renders each chapter from its progress (0–1).
   Everything degrades to the static layout in story.css when motion is reduced. */
(() => {
  'use strict';
  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const motion = doc.classList.contains('motion');
  const finePointer = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const E = {
    o3: (t) => 1 - Math.pow(1 - t, 3),
    io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    i3: (t) => t * t * t,
    oB: (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  };
  const track = (name, props) => { try { window.posthog?.capture?.(name, props); } catch { /* analytics is optional */ } };

  /* ---------- pointer ---------- */
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, seen: false };
  addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.seen = true; }, { passive: true });

  /* ---------- header + chapters ---------- */
  const header = $('.site-header');
  let lastY = scrollY;
  function updateHeader() {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 30);
    const down = y > lastY + 4, up = y < lastY - 4;
    if (down && y > 500 && !header.contains(document.activeElement)) header.classList.add('is-hidden');
    else if (up || y < 200) header.classList.remove('is-hidden');
    lastY = y;
  }
  const railLinks = $$('[data-chapter-link]');
  const chapterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const name = entry.target.dataset.chapter;
      document.body.dataset.chapter = name;
      railLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.chapterLink === name));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main [data-chapter]').forEach((s) => chapterObserver.observe(s));

  /* ---------- reveal on enter ---------- */
  const risePending = new Set();
  const rise = (el) => { el.classList.add('is-in'); riseObserver.unobserve(el); risePending.delete(el); };
  const riseObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) rise(entry.target); });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('.services .section-head, .service-row, .about-grid > *, .faq > *, .experience-strip, .contact-options, .inquiry-layout').forEach((el) => {
    if (motion) el.setAttribute('data-rise', '');
    riseObserver.observe(el);
    risePending.add(el);
  });
  // safety net: anything a fast jump skipped (End key, anchor links) appears once it's above the fold
  let riseTick = 0;
  const sweepRise = () => { if (++riseTick % 12 || !risePending.size) return; risePending.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) rise(el); }); };
  const contact = $('.contact');
  new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && contact.classList.add('is-in')), { threshold: 0.25 }).observe(contact);
  new IntersectionObserver((entries) => entries.forEach((e) => document.body.classList.toggle('rail-off', e.isIntersecting)), { rootMargin: '-40% 0px -40% 0px' }).observe(contact);

  /* ---------- cursor companion ---------- */
  const cursor = $('.cursor');
  const cur = { x: innerWidth / 2, y: innerHeight / 2 };
  const ring = $('.cursor-ring'), dot = $('.cursor-dot'), label = $('.cursor-label');
  if (motion && finePointer) {
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor]');
      cursor.classList.toggle('has-label', !!t);
      cursor.classList.toggle('is-small', !!t && t.dataset.cursorSize === 'sm');
      if (t) label.textContent = t.dataset.cursor;
    });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
    document.addEventListener('pointerenter', () => cursor.classList.add('is-on'));
  }
  function renderCursor() {
    if (!(motion && finePointer) || !pointer.seen) return;
    cursor.classList.add('is-on');
    cur.x = lerp(cur.x, pointer.x, 0.2); cur.y = lerp(cur.y, pointer.y, 0.2);
    ring.style.transform = `translate(${cur.x}px,${cur.y}px)`;
    dot.style.transform = `translate(${pointer.x}px,${pointer.y}px)`;
  }

  /* ---------- magnetic buttons ---------- */
  if (motion && finePointer) {
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* =========================================================
     OPENING: the pieces, the hand-offs, one partner
     ========================================================= */
  const opening = $('.opening'), opPin = $('.opening-pin');
  const hero = $('.op-hero'), facetsWrap = $('.facets');
  const facetEls = $$('.facet'), roleEls = $$('.role'), bubbleEls = $$('.bubble'), stEls = $$('.st');
  const reveal = $('.op-reveal'), tally = $('.op-tally'), impact = $('.op-impact');
  const cue = $('.scroll-cue'), playHint = $('.op-play-hint');
  const lines = $$('.op-line'), packets = $$('.op-packet'), linesSvg = $('.op-lines');
  // facet centroids inside the 130-unit Crosscut box (design arm, main stroke, video arm)
  const CENT = [[79, 37.25], [64.75, 64], [49, 92.75]];
  const SCATTER_HERO = [[0.42, -0.4, 22, 0.82], [-0.04, 0.05, -14, 0.88], [-0.44, 0.42, 28, 0.8]];
  const SCATTER_PIVOT = [[0.36, -0.3, 16, 0.86], [0, 0.02, -8, 0.9], [-0.36, 0.3, 20, 0.84]];
  const TAGS = [['86%', '14%'], ['98%', '86%'], ['4%', '90%']];
  const phys = facetEls.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, drag: null, hot: false, lift: 0 }));
  let L = null;
  let impactArmed = true;

  function layoutOpening() {
    const W = opPin.clientWidth, H = opPin.clientHeight, narrow = W < 900;
    const S = narrow ? Math.min(W * 0.66, H * 0.36) : Math.min(W * 0.31, H * 0.6);
    facetEls.forEach((f, i) => {
      f.style.width = f.style.height = `${S}px`;
      f.style.transformOrigin = `${(CENT[i][0] / 130) * S}px ${(CENT[i][1] / 130) * S}px`;
      f.style.setProperty('--tx', TAGS[i][0]); f.style.setProperty('--ty', TAGS[i][1]);
    });
    const cw = narrow ? Math.min(W * 0.86, 400) : Math.min(W * 0.24, 320);
    const gap = narrow ? 10 : Math.min(W * 0.035, 54);
    roleEls.forEach((r) => { r.style.setProperty('--cw', `${cw}px`); });
    const ch = Math.max(...roleEls.map((r) => r.offsetHeight));
    const cards = roleEls.map((_, i) => (narrow
      ? { x: (W - cw) / 2, y: Math.max(H * 0.25, 205) + i * (ch + gap) }
      : { x: W / 2 + (i - 1) * (cw + gap) - cw / 2, y: H * 0.33 }));
    // Bubbles never sit on the cards: a row underneath on desktop, one shared slot on phones.
    const bw = bubbleEls.map((b) => b.offsetWidth);
    const below = cards[narrow ? 2 : 0].y + ch + (narrow ? 14 : 18);
    const bub = narrow
      ? bw.map((w) => [(W - w) / 2, below])
      : [[cards[1].x, below], [cards[2].x, below], [cards[0].x, below], [(W - bw[3]) / 2, below + 58]];
    // phones: each piece lands on its card's avatar; desktop: top-right corner
    const icons = cards.map((c, i) => {
      if (!narrow) return [c.x + cw - 46, c.y + 44];
      const av = $('.role-avatar', roleEls[i]);
      return [c.x + av.offsetLeft + av.offsetWidth / 2, c.y + av.offsetTop + av.offsetHeight / 2];
    });
    linesSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const ln = narrow
      ? [[cards[0].x + 24, cards[0].y + ch, cards[1].x + 24, cards[1].y], [cards[1].x + 24, cards[1].y + ch, cards[2].x + 24, cards[2].y]]
      : [[cards[0].x + cw, cards[0].y + ch / 2, cards[1].x, cards[1].y + ch / 2], [cards[1].x + cw, cards[1].y + ch / 2, cards[2].x, cards[2].y + ch / 2]];
    lines.forEach((l, i) => {
      const [x1, y1, x2, y2] = ln[i];
      const my = narrow ? (y1 + y2) / 2 : Math.min(y1, y2) - 30;
      l.setAttribute('d', narrow ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} Q${(x1 + x2) / 2} ${my} ${x2} ${y2}`);
    });
    L = {
      W, H, S, narrow, cw, ch, cards, bub, icons,
      heroC: narrow ? [W * 0.5, H * 0.76] : [W * 0.71, H * 0.53],
      asmC: narrow ? [W * 0.5, H * 0.43] : [W * 0.5, H * 0.47],
      revC: [W * 0.5, H * 0.3],
      sA: narrow ? 0.86 : 0.78,
      sR: narrow ? 0.5 : 0.48,
      iconS: (narrow ? 34 : 92) / S,
      lineLen: lines.map((l) => l.getTotalLength()),
    };
    impact.style.setProperty('--iy', `${(L.asmC[1] / H) * 100}%`);
  }

  // "See how it comes together" glides into the first chapter of the pinned story.
  $$('a[href="#story"]').forEach((a) => a.addEventListener('click', (e) => {
    if (!motion) return;
    e.preventDefault();
    const top = opening.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + (opening.offsetHeight - innerHeight) * 0.2, behavior: 'smooth' });
    track('hero_story_link');
  }));

  // Drag & throw the pieces while the hero is on screen.
  facetEls.forEach((f, i) => {
    f.dataset.cursor = 'drag';
    f.dataset.cursorSize = 'sm';
    f.addEventListener('pointerenter', () => { phys[i].hot = true; f.classList.add('is-hot'); });
    f.addEventListener('pointerleave', () => { phys[i].hot = false; if (!phys[i].drag) f.classList.remove('is-hot'); });
    f.addEventListener('pointerdown', (e) => {
      if (!facetsWrap.classList.contains('is-live')) return;
      e.preventDefault();
      f.setPointerCapture(e.pointerId);
      phys[i].drag = { px: e.clientX, py: e.clientY, ox: phys[i].x, oy: phys[i].y, lx: e.clientX, ly: e.clientY };
      track('hero_piece_dragged', { piece: ['design', 'development', 'marketing'][i] });
    });
    f.addEventListener('pointermove', (e) => {
      const d = phys[i].drag; if (!d) return;
      phys[i].vx = (e.clientX - d.lx) * 0.6; phys[i].vy = (e.clientY - d.ly) * 0.6;
      d.lx = e.clientX; d.ly = e.clientY;
      phys[i].x = d.ox + e.clientX - d.px; phys[i].y = d.oy + e.clientY - d.py;
    });
    const release = () => { if (!phys[i].drag) return; phys[i].drag = null; phys[i].vr += clamp(phys[i].vx * 0.5, -14, 14); if (!phys[i].hot) f.classList.remove('is-hot'); };
    f.addEventListener('pointerup', release);
    f.addEventListener('pointercancel', release);
  });

  function stepPhysics(t, live) {
    facetEls.forEach((f, i) => {
      const s = phys[i];
      s.lift += ((live && (s.hot || s.drag) ? 1 : 0) - s.lift) * 0.15;
      if (s.drag) return;
      let tx = 0, ty = 0;
      if (live && pointer.seen) {
        // pieces lean toward the cursor, like they want to be picked up (the pin sits at the viewport origin here)
        const [bx, by] = [L.heroC[0] + SCATTER_HERO[i][0] * L.S, L.heroC[1] + SCATTER_HERO[i][1] * L.S];
        const dx = pointer.x - bx, dy = pointer.y - by;
        const dist = Math.hypot(dx, dy), reach = L.S * 0.9;
        if (dist < reach) { const k = (1 - dist / reach) * 0.32; tx = dx * k; ty = dy * k; }
      }
      s.vx += (tx - s.x) * 0.05; s.vy += (ty - s.y) * 0.05; s.vr += (0 - s.r) * 0.04;
      s.vx *= 0.86; s.vy *= 0.86; s.vr *= 0.9;
      s.x += s.vx; s.y += s.vy; s.r += s.vr;
    });
  }

  function facetPose(i, p, t) {
    const S = L.S, c = CENT[i];
    const ax = ((c[0] - 65) / 130) * S, ay = ((c[1] - 65) / 130) * S;
    const s0 = phys[i], live = 1 - E.io3(seg(p, 0.03, 0.12));
    const fl = [Math.sin(t / 1600 + i * 2.1) * 10, Math.cos(t / 1900 + i) * 12, Math.sin(t / 2300 + i) * 4];
    let pose = {
      x: L.heroC[0] + SCATTER_HERO[i][0] * S + (fl[0] + s0.x) * live,
      y: L.heroC[1] + SCATTER_HERO[i][1] * S + (fl[1] + s0.y) * live,
      r: SCATTER_HERO[i][2] + (fl[2] + s0.r) * live,
      s: SCATTER_HERO[i][3] * (1 + 0.08 * s0.lift * live),
    };
    const role = { x: L.icons[i][0], y: L.icons[i][1], r: 0, s: L.iconS };
    const wob = seg(p, 0.3, 0.55);
    role.r = Math.sin(t / 500 + i) * 6 * wob;
    const pivot = { x: L.asmC[0] + SCATTER_PIVOT[i][0] * S, y: L.asmC[1] + SCATTER_PIVOT[i][1] * S, r: SCATTER_PIVOT[i][2], s: SCATTER_PIVOT[i][3] };
    const asm = { x: L.asmC[0] + ax * L.sA, y: L.asmC[1] + ay * L.sA, r: 0, s: L.sA };
    const rev = { x: L.revC[0] + ax * L.sR, y: L.revC[1] + ay * L.sR, r: 0, s: L.sR };
    const mix = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), r: lerp(a.r, b.r, k), s: lerp(a.s, b.s, k) });
    pose = mix(pose, role, E.io3(seg(p, 0.09 + i * 0.012, 0.21 + i * 0.012)));
    pose = mix(pose, pivot, E.io3(seg(p, 0.56, 0.64)));
    pose = mix(pose, asm, E.io3(seg(p, 0.645, 0.735)));
    pose = mix(pose, rev, E.io3(seg(p, 0.8, 0.88)));
    return pose;
  }

  const fadeWin = (p, a, b, c, d) => seg(p, a, b) * (1 - seg(p, c, d));
  const ST_WIN = [[0.12, 0.17, 0.3, 0.335], [0.335, 0.38, 0.425, 0.455], [0.455, 0.5, 0.55, 0.58], [0.585, 0.625, 0.765, 0.8]];
  const BUBBLE_AT = [0.3, 0.36, 0.42, 0.48];
  let roleState = -1;

  function renderOpening(p, t) {
    if (!L) layoutOpening();
    const live = p < 0.035;
    facetsWrap.classList.toggle('is-live', live);
    stepPhysics(t, live);

    const hx = E.io3(seg(p, 0.035, 0.12));
    hero.style.opacity = (1 - hx).toFixed(3);
    hero.style.transform = `${L.narrow ? '' : 'translateY(-46%) '}translateY(${(-hx * 70).toFixed(1)}px)`;
    hero.style.visibility = hx >= 1 ? 'hidden' : '';
    cue.style.opacity = (1 - seg(p, 0.005, 0.04)).toFixed(3);
    playHint.style.opacity = (1 - seg(p, 0.01, 0.05)).toFixed(3);

    facetEls.forEach((f, i) => {
      const q = facetPose(i, p, t);
      const S = L.S;
      f.style.transform = `translate(${(q.x - (CENT[i][0] / 130) * S).toFixed(1)}px,${(q.y - (CENT[i][1] / 130) * S).toFixed(1)}px) rotate(${q.r.toFixed(2)}deg) scale(${q.s.toFixed(4)})`;
      f.style.setProperty('--fs', q.s.toFixed(3));
    });
    const tagsOn = p > 0.705 && p < 0.79;
    facetEls.forEach((f) => f.classList.toggle('is-hot', tagsOn || (live && f.matches(':hover'))));

    // role cards: enter, get messy, fall away
    const exit = E.io3(seg(p, 0.555, 0.62));
    const wob = seg(p, 0.3, 0.55);
    roleEls.forEach((r, i) => {
      const enter = E.o3(seg(p, 0.12 + i * 0.02, 0.22 + i * 0.02));
      const c = L.cards[i];
      const jx = Math.sin(t / 700 + i * 3) * 8 * wob, rot = (i - 1) * 4 * wob + Math.sin(t / 900 + i) * 1.5 * wob;
      r.style.opacity = (enter * (1 - exit)).toFixed(3);
      r.style.transform = `translate(${(c.x + jx).toFixed(1)}px,${(c.y + (1 - enter) * 70 + exit * 60).toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${(1 - exit * 0.08).toFixed(3)})`;
    });
    const state = p < 0.31 ? 0 : p < 0.43 ? 1 : 2;
    if (state !== roleState) {
      roleState = state;
      roleEls.forEach((r) => {
        r.classList.toggle('is-stressed', state === 2);
        $$('[data-states]', r).forEach((el) => { el.textContent = el.dataset.states.split('|')[state]; });
      });
    }
    bubbleEls.forEach((b, i) => {
      // phones show one message at a time in a shared slot; desktop lets them pile up
      const outAt = L.narrow && i < BUBBLE_AT.length - 1 ? BUBBLE_AT[i + 1] - 0.015 : 0.55;
      const a = E.oB(seg(p, BUBBLE_AT[i], BUBBLE_AT[i] + 0.035)) * (1 - E.io3(seg(p, outAt, outAt + 0.03)));
      const [bx, by] = L.bub[i];
      b.style.opacity = clamp(a).toFixed(3);
      b.style.transform = `translate(${bx}px,${(by + (1 - a) * 18).toFixed(1)}px) scale(${(0.7 + 0.3 * clamp(a)).toFixed(3)})`;
    });
    const lo = fadeWin(p, 0.26, 0.31, 0.55, 0.59);
    lines.forEach((l) => { l.style.opacity = lo.toFixed(3); });
    packets.forEach((pk, i) => {
      const run = p > 0.3 && p < 0.56;
      pk.style.opacity = run ? lo.toFixed(3) : '0';
      if (run) {
        const len = L.lineLen[i], f = ((p - 0.3) / 0.06 + i * 0.5) % 1;
        const pt = lines[i].getPointAtLength(f * len);
        pk.setAttribute('cx', pt.x); pk.setAttribute('cy', pt.y);
      }
    });
    const ta = fadeWin(p, 0.38, 0.43, 0.55, 0.59);
    tally.style.opacity = ta.toFixed(3);
    tally.style.transform = `translate(-50%,${((1 - ta) * 14).toFixed(1)}px)`;

    stEls.forEach((s, i) => {
      const [a, b, c, d] = ST_WIN[i];
      const inn = E.o3(seg(p, a, b)), out = E.io3(seg(p, c, d));
      s.style.opacity = (inn * (1 - out)).toFixed(3);
      s.style.transform = `translate(-50%,${((1 - inn) * 40 - out * 40).toFixed(1)}px)`;
    });

    if (p > 0.735 && impactArmed) { impactArmed = false; impact.classList.remove('is-on'); void impact.offsetWidth; impact.classList.add('is-on'); }
    if (p < 0.7) impactArmed = true;

    const rv = E.o3(seg(p, 0.82, 0.9));
    reveal.style.opacity = rv.toFixed(3);
    reveal.style.transform = `translate(-50%,${((1 - rv) * 40).toFixed(1)}px)`;
    if (!facetsWrap.classList.contains('is-ready')) requestAnimationFrame(() => facetsWrap.classList.add('is-ready'));
  }

  /* =========================================================
     ACT 01 · DESIGN: wireframe to final, and a playground
     ========================================================= */
  const designAct = $('.act-design'), mock = $('.mock'), mockState = $('.mock-state');
  const mkEls = $$('[data-mk]', mock), mkWire = $('.mk-wire', mock);
  const noteH = $('.note-h', mock), noteGap = $('.note-gap', mock);
  let wfEls = [], mockStateIdx = -1, designDirty = true;
  // Each wireframe block is measured from the element it will become, so the morph happens in place.
  function layoutDesign() {
    designDirty = false;
    const mr = mock.getBoundingClientRect();
    if (!mr.width) return;
    const rel = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - mr.left, y: r.top - mr.top, w: r.width, h: r.height }; };
    mkWire.textContent = '';
    wfEls = mkEls.map((el) => {
      const r = rel(el), d = document.createElement('i');
      d.className = el.classList.contains('mk-art') ? 'wf wf-art' : 'wf';
      Object.assign(d.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
      mkWire.append(d);
      return d;
    });
    const h = rel($('.mk-h', mock)), pp = rel($('.mk-p', mock));
    noteH.textContent = `H1 · ${Math.round(parseFloat(getComputedStyle($('.mk-h', mock)).fontSize) / mr.width * 1440)}px`;
    Object.assign(noteH.style, { left: `${h.x + h.w - noteH.offsetWidth}px`, top: `${Math.max(0, h.y - noteH.offsetHeight - 4)}px` });
    noteGap.textContent = 'spacing · 24';
    Object.assign(noteGap.style, { left: `${pp.x + pp.w + 10}px`, top: `${pp.y}px` });
  }
  function renderDesign(p) {
    if (designDirty) layoutDesign();
    mock.style.setProperty('--grid', (seg(p, 0.04, 0.14) * (1 - seg(p, 0.62, 0.74)) * 0.9).toFixed(3));
    mock.style.setProperty('--notes', (seg(p, 0.3, 0.38) * (1 - seg(p, 0.62, 0.7))).toFixed(3));
    mock.style.setProperty('--style', E.io3(seg(p, 0.16, 0.5)).toFixed(3));
    mkEls.forEach((el, i) => {
      const draw = E.o3(seg(p, 0.02 + i * 0.012, 0.12 + i * 0.012));
      const a = 0.2 + i * 0.04, k = E.io3(seg(p, a, a + 0.12));
      el.style.opacity = k.toFixed(3);
      el.style.filter = k > 0 && k < 1 ? `blur(${((1 - k) * 6).toFixed(2)}px)` : '';
      const wf = wfEls[i];
      if (wf) { wf.style.opacity = (1 - k).toFixed(3); wf.style.transform = `scaleX(${draw.toFixed(3)})`; }
    });
    const idx = p < 0.2 ? 0 : p < 0.72 ? 1 : 2;
    if (idx !== mockStateIdx) { mockStateIdx = idx; mockState.textContent = mockState.dataset.states.split('|')[idx]; }
  }
  $$('.pg-swatch').forEach((b) => b.addEventListener('click', () => {
    $$('.pg-swatch').forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    mock.dataset.palette = b.dataset.palette;
    track('playground_palette', { palette: b.dataset.palette });
  }));
  $$('.act-design .pg-toggle').forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    if (b.dataset.toggle === 'type') mock.dataset.type = on ? 'editorial' : '';
    if (b.dataset.toggle === 'shape') mock.dataset.shape = on ? 'soft' : '';
    designDirty = true;
    track('playground_toggle', { control: b.dataset.toggle, on });
  }));

  /* =========================================================
     ACT 02 · BUILD: code types itself, the site assembles
     ========================================================= */
  const buildAct = $('.act-build'), buildStage = $('.build-stage'), codeEl = $('.code'), statusText = $('.status-text');
  const CODE = [
    ['nav', [['p', '<'], ['t', 'header'], ['a', ' class'], ['p', '='], ['s', '"nav"'], ['p', '>']]],
    ['nav', [['x', '  '], ['p', '<'], ['t', 'a'], ['a', ' class'], ['p', '='], ['s', '"logo"'], ['p', '>'], ['x', 'yourbrand'], ['p', '</'], ['t', 'a'], ['p', '>']]],
    ['nav', [['x', '  '], ['p', '<'], ['t', 'a'], ['a', ' href'], ['p', '='], ['s', '"/call"'], ['p', '>'], ['x', 'Book a call'], ['p', '</'], ['t', 'a'], ['p', '>']]],
    ['nav', [['p', '</'], ['t', 'header'], ['p', '>']]],
    ['h1', [['p', '<'], ['t', 'h1'], ['p', '>'], ['x', 'Built to be '], ['p', '<'], ['t', 'em'], ['p', '>'], ['x', 'chosen.'], ['p', '</'], ['t', 'em'], ['p', '></'], ['t', 'h1'], ['p', '>']]],
    ['p', [['p', '<'], ['t', 'p'], ['p', '>'], ['x', 'Fast, responsive and made to convert.'], ['p', '</'], ['t', 'p'], ['p', '>']]],
    ['btn', [['p', '<'], ['t', 'a'], ['a', ' class'], ['p', '='], ['s', '"button"'], ['p', '>'], ['x', 'Get started →'], ['p', '</'], ['t', 'a'], ['p', '>']]],
    ['cards', [['p', '<'], ['t', 'section'], ['a', ' class'], ['p', '='], ['s', '"cards"'], ['p', '>'], ['x', '…'], ['p', '</'], ['t', 'section'], ['p', '>']]],
  ];
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lineLens = CODE.map(([, toks]) => toks.reduce((n, [, s]) => n + s.length, 0));
  const totalChars = lineLens.reduce((a, b) => a + b, 0);
  const lineEls = CODE.map(([ref]) => { const s = document.createElement('span'); s.className = 'ln'; s.dataset.ref = ref; codeEl.append(s); return s; });
  const pvRefs = $$('.pv-site [data-ref]');
  let typedChars = -1, lastLive = null;
  function renderCode(chars) {
    let left = chars, caretLine = -1;
    const shows = lineLens.map((len) => { const s = Math.min(left, len); left -= s; return s; });
    caretLine = shows.findIndex((s, i) => s < lineLens[i]);
    if (caretLine === -1) caretLine = lineEls.length - 1;
    lineEls.forEach((el, i) => {
      const show = shows[i], key = `${show}|${i === caretLine}`;
      if (el.dataset.shown === key) return;
      el.dataset.shown = key;
      el.style.display = show > 0 || i === caretLine ? '' : 'none';
      let html = '', rest = show;
      for (const [cls, s] of CODE[i][1]) { if (rest <= 0) break; const part = s.slice(0, rest); rest -= part.length; html += `<span class="tk-${cls}">${esc(part)}</span>`; }
      el.innerHTML = html + (i === caretLine ? '<span class="caret"></span>' : '');
    });
    // a preview element appears once every line that builds it has been typed
    const done = {};
    let acc = 0;
    CODE.forEach(([ref], i) => { acc += lineLens[i]; done[ref] = chars >= acc; });
    pvRefs.forEach((el) => el.classList.toggle('is-typed', !motion || !!done[el.dataset.ref]));
  }
  const pvFrame = $('.pv-frame'), pvSite = $('.pv-site');
  const VW = { desktop: 1100, tablet: 720, phone: 390 };
  const pvSize = { w: 0, h: 0 };
  // read phase: frame width animates while switching devices, so sample it every frame
  function measurePreview() { pvSize.w = pvFrame.clientWidth; pvSize.h = pvSite.offsetHeight; }
  function fitPreview() {
    const vw = VW[pvFrame.dataset.device] || 1100, k = pvSize.w / vw;
    pvSite.style.setProperty('--vw', `${vw}px`);
    pvSite.style.setProperty('--k', k.toFixed(4));
    pvFrame.style.setProperty('--fh', `${Math.round(pvSize.h * k)}px`);
  }
  function renderBuild(p) {
    fitPreview();
    const chars = Math.round(E.io3(seg(p, 0.06, 0.62)) * totalChars);
    if (chars !== typedChars) { typedChars = chars; renderCode(chars); }
    const live = p > 0.7;
    if (live !== lastLive) {
      lastLive = live;
      buildStage.classList.toggle('is-live', live);
      statusText.textContent = live ? 'Deployed · yourbrand.com is live' : 'Writing code…';
    }
  }
  $$('[data-device]').forEach((b) => b.tagName === 'BUTTON' && b.addEventListener('click', () => {
    $$('.pg-devices .pg-toggle').forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
    $('.pv-frame').dataset.device = b.dataset.device;
    track('playground_device', { device: b.dataset.device });
  }));
  const linkRef = (ref, on) => {
    lineEls.forEach((l) => l.classList.toggle('is-linked', on && l.dataset.ref === ref));
    pvRefs.forEach((el) => el.classList.toggle('is-linked', on && el.dataset.ref === ref));
  };
  [codeEl, $('.pv-site')].forEach((root) => {
    root.addEventListener('pointerover', (e) => { const t = e.target.closest('[data-ref]'); if (t) linkRef(t.dataset.ref, true); });
    root.addEventListener('pointerleave', () => linkRef(null, false));
  });
  if (!motion) renderCode(totalChars);

  /* =========================================================
     ACT 03 · GROW: the ad as a case in point, with a timeline you can drag
     ========================================================= */
  const filmStage = $('.film-stage'), video = $('.film');
  const playBtn = $('.film-play'), soundBtn = $('.film-sound'), bigPlay = $('.film-big-play');
  const timeEl = $('.film-time'), range = $('.tl-range'), head = $('.tl-head'), strip = $('.tl-strip'), timeline = $('.timeline');
  const ICON = {
    play: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>',
    muted: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    sound: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  };
  let lang = 'en', userPaused = false, scrubbing = false, wasPlaying = false, filmVisible = false;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function ensureSrc() { if (!video.getAttribute('src')) { video.src = video.dataset[`src${lang === 'en' ? 'En' : 'Ar'}`]; } }
  function syncButtons() {
    const playing = !video.paused;
    playBtn.innerHTML = playing ? ICON.pause : ICON.play;
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    soundBtn.innerHTML = video.muted ? ICON.muted : ICON.sound;
    soundBtn.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
    soundBtn.setAttribute('aria-pressed', String(!video.muted));
    filmStage.classList.toggle('is-playing', playing);
  }
  function play() { ensureSrc(); const r = video.play(); if (r && r.catch) r.catch(() => syncButtons()); }
  let tlWidth = 0;
  function renderFilmHead() {
    const d = video.duration || 32, t = video.currentTime || 0;
    head.style.setProperty('--head', `${(t / d) * tlWidth}px`);
    if (!scrubbing) range.value = t.toFixed(2);
    timeEl.textContent = `${fmt(t)} / ${fmt(d)}`;
  }
  ['play', 'pause', 'volumechange'].forEach((ev) => video.addEventListener(ev, syncButtons));
  ['timeupdate', 'seeked', 'loadedmetadata'].forEach((ev) => video.addEventListener(ev, renderFilmHead));
  const userPlay = () => { userPaused = false; play(); track('ad_video_play', { lang }); };
  bigPlay.addEventListener('click', userPlay);
  playBtn.addEventListener('click', () => { if (video.paused) userPlay(); else { userPaused = true; video.pause(); } });
  video.addEventListener('click', () => { if (video.paused) userPlay(); else { userPaused = true; video.pause(); } });
  // Sound starts at a comfortable level; the slider and the mute button stay in sync.
  const volume = $('.film-volume');
  video.volume = Number(volume.value);
  const syncVolume = () => volume.style.setProperty('--vol', `${(video.muted ? 0 : video.volume) * 100}%`);
  volume.addEventListener('input', () => {
    video.volume = Number(volume.value);
    video.muted = video.volume === 0;
    if (!video.muted) { userPaused = false; play(); }
    syncVolume();
  });
  soundBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    if (!video.muted) {
      if (video.volume === 0) { video.volume = 0.4; volume.value = '0.4'; }
      userPaused = false; play();
    }
    track('ad_video_sound', { on: !video.muted });
  });
  video.addEventListener('volumechange', syncVolume);
  syncVolume();
  range.addEventListener('pointerdown', () => { scrubbing = true; wasPlaying = !video.paused; ensureSrc(); video.pause(); });
  range.addEventListener('input', () => { ensureSrc(); video.currentTime = Number(range.value); renderFilmHead(); });
  const endScrub = () => { if (!scrubbing) return; scrubbing = false; if (wasPlaying) play(); };
  range.addEventListener('pointerup', endScrub);
  range.addEventListener('change', endScrub);
  timeline.dataset.cursor = 'Drag';
  $$('.film-lang button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.lang === lang) return;
    const t = video.currentTime, playing = !video.paused;
    lang = b.dataset.lang;
    $$('.film-lang button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    video.poster = video.dataset[`poster${lang === 'en' ? 'En' : 'Ar'}`];
    strip.style.setProperty('--strip', `url('assets/film/sofinityx-ad-strip-${lang}.webp')`);
    // pick up at the same moment in the other language
    const resume = () => { video.currentTime = Math.min(t, (video.duration || 32) - 0.1); renderFilmHead(); if (playing || !userPaused) play(); };
    video.addEventListener('loadedmetadata', resume, { once: true });
    video.src = video.dataset[`src${lang === 'en' ? 'En' : 'Ar'}`];
    video.load();
    track('ad_video_language', { lang });
  }));
  syncButtons();
  new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      filmVisible = e.intersectionRatio > 0.45;
      if (filmVisible && motion && !userPaused) play();
      if (e.intersectionRatio < 0.15 && !video.paused) video.pause();
    });
  }, { threshold: [0, 0.15, 0.45, 0.8] }).observe(filmStage);
  function renderGrow(p) { filmStage.style.setProperty('--enter', E.o3(seg(p, 0, 0.3)).toFixed(3)); if (!video.paused) renderFilmHead(); }

  /* =========================================================
     PROOF: work moves sideways as you scroll down
     ========================================================= */
  const work = $('.work'), workPin = $('.work-pin'), workTrack = $('.work-track'), workBar = $('.work-progress');
  let workShift = 0, workPinned = false;
  function layoutWork() {
    workPinned = motion && getComputedStyle(workPin).position === 'sticky';
    if (!workPinned) { work.style.height = ''; workTrack.style.transform = ''; return; }
    workShift = Math.max(0, workTrack.scrollWidth - workPin.clientWidth);
    work.style.height = `${workShift + innerHeight * 1.15}px`;
  }
  function renderWork(p) {
    if (!workPinned) return;
    workTrack.style.transform = `translate3d(${(-E.io3(p) * workShift).toFixed(1)}px,0,0)`;
    workBar.style.setProperty('--wp', p.toFixed(4));
  }
  workTrack.addEventListener('scroll', () => { if (!workPinned) workBar.style.setProperty('--wp', (workTrack.scrollLeft / Math.max(1, workTrack.scrollWidth - workTrack.clientWidth)).toFixed(4)); }, { passive: true });
  if (motion && finePointer) {
    $$('.wcard .wcard-media').forEach((m) => {
      m.addEventListener('pointermove', (e) => {
        const r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        m.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`); m.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
        m.style.setProperty('--ix', `${(-x * 14).toFixed(1)}px`); m.style.setProperty('--iy', `${(-y * 10).toFixed(1)}px`);
      });
      m.addEventListener('pointerleave', () => { ['--rx', '--ry', '--ix', '--iy'].forEach((v) => m.style.removeProperty(v)); });
    });
  }

  /* =========================================================
     SERVICES: a preview follows the cursor
     ========================================================= */
  const preview = $('.service-preview'), previewImg = $('img', preview);
  const pv = { x: 0, y: 0, on: false };
  if (motion && finePointer) {
    $$('.service-row').forEach((row) => {
      row.addEventListener('pointerenter', () => { previewImg.src = row.dataset.preview; preview.style.borderColor = getComputedStyle(row).getPropertyValue('--c'); preview.classList.add('is-on'); pv.on = true; });
      row.addEventListener('pointerleave', () => { preview.classList.remove('is-on'); pv.on = false; });
    });
  }
  function renderPreview() {
    if (!pv.on && !preview.classList.contains('is-on')) return;
    pv.x = lerp(pv.x || pointer.x, pointer.x + 170, 0.14); pv.y = lerp(pv.y || pointer.y, pointer.y - 10, 0.14);
    preview.style.transform = `translate(${pv.x.toFixed(1)}px,${pv.y.toFixed(1)}px) translate(-50%,-50%) rotate(${((pointer.x + 170 - pv.x) * 0.03).toFixed(2)}deg)`;
  }

  /* =========================================================
     ABOUT: hello, in a few languages
     ========================================================= */
  const chatOut = $('.chat-out'), words = $$('.chat-words > span');
  let word = 0, chatVisible = false;
  // the bubble resizes to fit each greeting
  const fitWord = () => { chatOut.style.width = `${words[word].scrollWidth + 44}px`; };
  const nextWord = () => { word = (word + 1) % words.length; chatOut.style.setProperty('--w', word); fitWord(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWord);
  fitWord();
  chatOut.addEventListener('pointerenter', nextWord);
  new IntersectionObserver((entries) => entries.forEach((e) => { chatVisible = e.isIntersecting; }), { threshold: 0.6 }).observe(chatOut);
  if (motion) setInterval(() => { if (chatVisible && !document.hidden) nextWord(); }, 1600);

  /* =========================================================
     PROCESS: a route from A to Z
     ========================================================= */
  const process = $('.process'), routeSvg = $('.route-svg'), routeLine = $('.route-line'), routeDot = $('.route-dot');
  const routeBase = $('.route-base'), routeA = $('.route-a'), routeZ = $('.route-z');
  const steps = $$('.step');
  // the route is drawn in real pixels so the line, the dot and the A/Z ends share one geometry
  const ROUTE = [[10, 150], [120, 150, 140, 60, 250, 60], [380, 160, 500, 160], [640, 60, 750, 60], [880, 150, 990, 150]];
  const route = { visible: false, w: 0, h: 0, len: 0, stepAt: [] };
  function layoutProcess() {
    route.visible = getComputedStyle(routeSvg).display !== 'none';
    if (!route.visible) return;
    const w = routeSvg.clientWidth, h = routeSvg.clientHeight, sx = w / 1000, sy = h / 220;
    const pt = (x, y) => `${(x * sx).toFixed(1)} ${(y * sy).toFixed(1)}`;
    const [s, c, ...rest] = ROUTE;
    const d = `M${pt(...s)} C${pt(c[0], c[1])} ${pt(c[2], c[3])} ${pt(c[4], c[5])} ${rest.map((r) => `S${pt(r[0], r[1])} ${pt(r[2], r[3])}`).join(' ')}`;
    routeBase.setAttribute('d', d); routeLine.setAttribute('d', d);
    Object.assign(route, { w, h, len: routeLine.getTotalLength() });
    routeLine.style.strokeDasharray = `${route.len} ${route.len}`;
    const a = routeLine.getPointAtLength(0), z = routeLine.getPointAtLength(route.len);
    Object.assign(routeA.style, { left: `${a.x}px`, top: `${a.y}px` });
    Object.assign(routeZ.style, { left: `${z.x}px`, top: `${z.y}px` });
    routeFlag.style.setProperty('--fx', `${z.x}px`); routeFlag.style.setProperty('--fy', `${z.y}px`);
    const pin = $('.process-pin').getBoundingClientRect(), zr = routeZ.getBoundingClientRect();
    process.style.setProperty('--zx', `${zr.left + zr.width / 2 - pin.left}px`);
    process.style.setProperty('--zy', `${zr.top + zr.height / 2 - pin.top}px`);
    const rr = routeSvg.getBoundingClientRect();
    route.stepAt = steps.map((st) => { const r = st.getBoundingClientRect(); return (r.left + 12 - rr.left) / w; });
  }

  // Arrival at Z: the logo's own pieces burst out like confetti.
  const routeEl = $('.route'), routeFlag = $('.route-flag');
  steps.forEach((s, i) => s.style.setProperty('--n', i));
  const PIECE_PATHS = ['M72 22H105L78 67 61 38Z', 'M25 22H58L104 106H72Z', 'M48 65L65 94 58 106H25Z'].map((d) => new Path2D(d));
  const PIECE_CENT = [[79, 37], [65, 64], [49, 93]];
  let burstCanvas = null, burstParts = [], burstRunning = false, launched = false;
  function burst(x, y, scale = 1) {
    if (!burstCanvas) {
      burstCanvas = document.createElement('canvas');
      burstCanvas.className = 'burst-canvas'; burstCanvas.setAttribute('aria-hidden', 'true');
      document.body.append(burstCanvas);
    }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    burstCanvas.width = innerWidth * dpr; burstCanvas.height = innerHeight * dpr;
    const css = getComputedStyle(document.body);
    const colors = [css.getPropertyValue('--violet'), css.getPropertyValue('--cyan'), css.getPropertyValue('--ember'), css.getPropertyValue('--accent'), '#f5f4f1'].map((c) => c.trim());
    const narrow = innerWidth < 700;
    for (let i = 0; i < Math.round((narrow ? 80 : 170) * scale); i++) {
      // mostly up and back along the route, with a few flying everywhere
      const a = i % 7 === 0 ? Math.random() * Math.PI * 2 : -Math.PI * (0.18 + Math.random() * 0.8);
      const v = ((narrow ? 5 : 7) + Math.random() * (narrow ? 9 : 16)) * (scale < 1 ? 1.25 : 1);
      const piece = Math.random() < 0.78;
      burstParts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.35,
        s: piece ? 0.07 + Math.random() * 0.1 : 2 + Math.random() * 2.5, kind: piece ? i % 3 : -1,
        c: colors[i % colors.length], life: 0, max: 90 + Math.random() * 70,
      });
    }
    if (!burstRunning) { burstRunning = true; requestAnimationFrame(stepBurst); }
  }
  function stepBurst() {
    const ctx = burstCanvas.getContext('2d'), dpr = burstCanvas.width / innerWidth;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    burstParts = burstParts.filter((q) => q.life < q.max);
    for (const q of burstParts) {
      q.life++; q.vy += 0.24; q.vx *= 0.985; q.vy *= 0.985; q.x += q.vx; q.y += q.vy; q.r += q.vr;
      ctx.globalAlpha = Math.min(1, (q.max - q.life) / 30);
      ctx.fillStyle = q.c;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r);
      if (q.kind < 0) { ctx.beginPath(); ctx.arc(0, 0, q.s, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.scale(q.s, q.s); ctx.translate(-PIECE_CENT[q.kind][0], -PIECE_CENT[q.kind][1]); ctx.fill(PIECE_PATHS[q.kind]); }
      ctx.restore();
    }
    if (burstParts.length) requestAnimationFrame(stepBurst);
    else { burstRunning = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function setLaunched(on) {
    if (on === launched) return;
    launched = on;
    routeEl.classList.toggle('is-done', on);
    process.classList.toggle('is-launched', on);
    if (!on || !motion) return;
    // desktop: from Z; phones: from the "Launched" stamp on the last step
    const origin = (route.visible ? routeZ : steps[steps.length - 1]).getBoundingClientRect();
    const ox = route.visible ? origin.left + origin.width / 2 : origin.right - 50;
    const oy = route.visible ? origin.top + origin.height / 2 : origin.top + 30;
    burst(ox, oy);
    setTimeout(() => { if (launched) burst(ox, oy, 0.45); }, 260); // a second, faster pop
    track('process_launch_moment');
  }

  function renderProcess(p) {
    const rp = E.io3(seg(p, 0.06, 0.74));
    // fires once on arrival, re-arms when the visitor scrolls back
    if (route.visible) { if (rp >= 0.999) setLaunched(true); else if (rp < 0.85) setLaunched(false); }
    else if (motion) { const last = steps[steps.length - 1].getBoundingClientRect(); if (last.top < innerHeight * 0.65) setLaunched(true); else if (last.top > innerHeight * 0.9) setLaunched(false); }
    else setLaunched(true);
    let at = rp;
    if (route.visible && route.len) {
      routeLine.style.strokeDashoffset = `${((1 - rp) * route.len).toFixed(1)}`;
      routeLine.style.opacity = rp > 0.001 ? '1' : '0';
      const pt = routeLine.getPointAtLength(rp * route.len);
      routeDot.style.setProperty('--dx', `${pt.x.toFixed(1)}px`);
      routeDot.style.setProperty('--dy', `${pt.y.toFixed(1)}px`);
      at = pt.x / route.w;
    }
    steps.forEach((s, i) => s.classList.toggle('is-on', !route.visible || at >= route.stepAt[i] - 0.01));
  }

  /* =========================================================
     the loop
     ========================================================= */
  const scenes = [
    { el: opening, render: renderOpening, enabled: motion },
    { el: designAct, render: renderDesign, stage: $('.act-design .act-stage'), enabled: true },
    { el: buildAct, render: renderBuild, stage: buildStage, measure: measurePreview, enabled: true },
    { el: $('.act-grow'), render: renderGrow, stage: filmStage, enabled: true },
    { el: work, render: renderWork, enabled: true },
    { el: process, render: renderProcess, stage: $('.route'), enabled: true },
  ];
  function progressOf(s, vh) {
    const r = s.el.getBoundingClientRect();
    if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return null;
    if (!motion) return 1;
    const total = r.height - vh;
    if (s.pinned && total > 0) return clamp(-r.top / total);
    const st = (s.stage || s.el).getBoundingClientRect();
    return clamp((vh * 0.92 - st.top) / (vh * 0.62));
  }
  // Each frame reads all layout first, then writes, so the browser lays out at most once.
  function frame(t) {
    const vh = innerHeight;
    for (const s of scenes) {
      s.p = s.enabled ? progressOf(s, vh) : null;
      if (s.p !== null && s.measure) s.measure();
    }
    updateHeader();
    sweepRise();
    for (const s of scenes) if (s.p !== null) s.render(s.p, t);
    renderCursor();
    renderPreview();
    if (motion && pointer.seen) {
      doc.style.setProperty('--ax', `${((pointer.x / innerWidth - 0.5) * 60).toFixed(1)}px`);
      doc.style.setProperty('--ay', `${((pointer.y / innerHeight - 0.5) * 40).toFixed(1)}px`);
    }
    requestAnimationFrame(frame);
  }

  function layoutAll() {
    designDirty = true;
    if (motion) layoutOpening();
    layoutWork();
    layoutProcess();
    tlWidth = timeline.clientWidth;
    scenes.forEach((s) => { const pin = $('.pin', s.el); s.pinned = !!pin && getComputedStyle(pin).position === 'sticky'; });
  }
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(layoutAll, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutAll);
  addEventListener('load', layoutAll);
  layoutAll();
  requestAnimationFrame(frame);
})();
