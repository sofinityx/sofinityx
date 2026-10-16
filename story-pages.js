/* Story layer for inner pages. Runs in <head> to set the page's facet before first paint,
   then wires up the interactions once the DOM is ready. */
(() => {
  'use strict';
  const doc = document.documentElement;
  // Which of the three pieces (design, build, video) each page belongs to; the first one leads.
  const FACETS = {
    'website-design': ['build', 'design'], 'ux-ui-design': ['design'], 'brand-identity-design': ['design'],
    'creative-marketing-support': ['video', 'design'], 'social-media-design': ['video', 'design'], 'video-editing-for-brands': ['video'],
    lumaro: ['design'], 'lumaro-brand': ['design'], 'lumaro-launch': ['build', 'design'],
    trendium: ['design'], 'trendium-brand': ['design'], 'trendium-product-system': ['design'],
    'sofinityx-case-study': ['build', 'design'], vespera: ['design'], voltara: ['design'], 'eclipse-district': ['video', 'design'],
  };
  const slug = (href) => (new URL(href, location.href).pathname.split('/').pop() || 'index').replace(/\.html$/, '');
  const page = slug(location.href);
  const mine = FACETS[page] || [];
  doc.dataset.facet = mine[0] || 'all';
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  doc.classList.add('js', motion ? 'motion' : 'rm');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const track = (name, props) => { try { window.posthog?.capture?.(name, props); } catch { /* optional */ } };

  function init() {
    const body = document.body;
    if (!body.classList.contains('inner-page')) return;
    const fine = matchMedia('(pointer: fine)').matches;

    /* ambience + cursor */
    const amb = document.createElement('div'); amb.className = 'sp-ambient'; amb.setAttribute('aria-hidden', 'true'); amb.innerHTML = '<i></i><i></i><i></i>';
    const grain = document.createElement('div'); grain.className = 'sp-grain'; grain.setAttribute('aria-hidden', 'true');
    body.prepend(amb, grain);
    const pointer = { x: innerWidth / 2, y: innerHeight / 2, seen: false };
    addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.seen = true; }, { passive: true });
    let cursor = null;
    if (motion && fine) {
      cursor = document.createElement('div');
      cursor.className = 'sp-cursor'; cursor.setAttribute('aria-hidden', 'true');
      cursor.innerHTML = '<span class="ring"><b class="label"></b></span><span class="dot"></span>';
      body.append(cursor);
      document.addEventListener('pointerover', (e) => {
        const t = e.target.closest('[data-cursor]');
        cursor.classList.toggle('has-label', !!t);
        if (t) $('.label', cursor).textContent = t.dataset.cursor;
      });
      document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
    }
    const ring = cursor && $('.ring', cursor), dot = cursor && $('.dot', cursor), cur = { x: pointer.x, y: pointer.y };

    /* hero: facet dots, headline reveal */
    const eyebrow = $('.hero-copy .eyebrow');
    if (eyebrow) {
      const dots = document.createElement('span');
      dots.className = 'sp-dots'; dots.setAttribute('aria-hidden', 'true');
      dots.innerHTML = ['design', 'build', 'video'].map((f) => `<i class="${mine.length === 0 || mine.includes(f) ? 'on' : ''}"></i>`).join('');
      eyebrow.prepend(dots);
    }
    const h1 = $('.hero-copy h1');
    if (h1 && motion) {
      let i = 0;
      const wrap = (node) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((tok) => {
              if (!tok) return;
              if (/^\s+$/.test(tok)) { frag.append(' '); return; }
              const w = document.createElement('span'); w.className = 'w';
              const wi = document.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++); wi.textContent = tok;
              w.append(wi); frag.append(w);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1 && n.tagName !== 'BR') wrap(n);
        });
      };
      wrap(h1);
      h1.classList.add('sp-split');
    }
    requestAnimationFrame(() => requestAnimationFrame(() => { body.classList.add('sp-ready'); h1 && h1.classList.add('is-in'); }));

    /* header */
    const header = $('.site-header');
    let lastY = scrollY;
    const updateHeader = () => {
      const y = scrollY;
      header.classList.toggle('is-scrolled', y > 20);
      if (y > lastY + 4 && y > 420 && !header.contains(document.activeElement)) header.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 160) header.classList.remove('is-hidden');
      lastY = y;
    };

    /* reveals */
    const pending = new Set();
    const reveal = (el) => { el.classList.add('is-in'); rise.unobserve(el); pending.delete(el); };
    const rise = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) reveal(e.target); }), { rootMargin: '0px 0px -10% 0px' });
    const watch = (el) => { rise.observe(el); pending.add(el); };
    $$('.case-section, .next-project, .section-heading, .footer').forEach((el) => { if (motion) el.setAttribute('data-sp-rise', ''); watch(el); });
    $$('.case-list-grid, .decision-grid, .asset-grid, .comparison-grid, .tag-list, .outcome-list, .project-showcase, .conversation-options, .eclipse-gallery, .eclipse-system-grid').forEach((grid) => {
      [...grid.children].forEach((el, i) => { if (motion) { el.setAttribute('data-sp-rise', ''); el.style.setProperty('--d', `${Math.min(i, 8) * 0.07}s`); } watch(el); });
    });
    // safety net: anything a fast jump skipped (End key, anchor links) appears once it's above the fold
    let tick = 0;
    const sweepPending = () => { if (++tick % 12 || !pending.size) return; pending.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) reveal(el); }); };
    const contact = $('.contact');
    if (contact) {
      new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && contact.classList.add('is-in')), { threshold: 0.25 }).observe(contact);
      // the rail steps aside over the lime contact panel
      new IntersectionObserver((es) => es.forEach((e) => body.classList.toggle('rail-off', e.isIntersecting)), { rootMargin: '-40% 0px -40% 0px' }).observe(contact);
    }

    /* spotlight cards */
    $$('.case-list-grid article, .decision-grid article, .eclipse-system-grid article, .conversation-option').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });

    /* tilt */
    if (motion && fine) {
      $$('.case-hero-shot, .portfolio-preview').forEach((el) => {
        const k = el.classList.contains('case-hero-shot') ? 5 : 7;
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width) - 0.5) * k}deg`);
          el.style.setProperty('--rx', `${-(((e.clientY - r.top) / r.height) - 0.5) * k}deg`);
        });
        el.addEventListener('pointerleave', () => { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
      });
    }

    /* facet visual: pieces drift with the cursor, tags light their piece */
    const fv = $('.facet-visual');
    if (fv) {
      const active = fv.dataset.active ? fv.dataset.active.split(' ') : ['design', 'build', 'video'];
      $$('.fv-piece, .fv-tag', fv).forEach((el) => el.classList.toggle('on', active.includes(el.dataset.piece)));
      $$('.fv-tag', fv).forEach((tag) => {
        const piece = $(`.fv-piece[data-piece="${tag.dataset.piece}"]`, fv);
        tag.addEventListener('pointerenter', () => piece.classList.add('peek'));
        tag.addEventListener('pointerleave', () => piece.classList.remove('peek'));
        tag.addEventListener('focus', () => piece.classList.add('peek'));
        tag.addEventListener('blur', () => piece.classList.remove('peek'));
      });
      if (motion && fine) {
        addEventListener('pointermove', (e) => {
          const r = fv.getBoundingClientRect();
          fv.style.setProperty('--px', clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1.5, 1.5).toFixed(3));
          fv.style.setProperty('--py', clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1.5, 1.5).toFixed(3));
        }, { passive: true });
      }
    }

    /* journey strips fill as you scroll */
    const journeys = $$('.journey-strip').map((el) => ({ el, steps: [...el.children], last: -1 }));
    function renderJourneys(vh) {
      journeys.forEach((j) => {
        const r = j.el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const p = motion ? clamp((vh * 0.85 - r.top) / (vh * 0.5)) : 1;
        if (Math.abs(p - j.last) < 0.002) return;
        j.last = p;
        // steps light up in reading order as the strip moves up the screen
        j.steps.forEach((s, i) => s.classList.toggle('is-on', p >= (i + 0.5) / j.steps.length - 0.04));
      });
    }

    /* chapter rail from the section kickers */
    const chapters = $$('.case-section > .section-kicker, .section-heading > .section-kicker').map((k) => ({ k, sec: k.closest('section') }));
    if (chapters.length > 2) {
      const rail = document.createElement('nav');
      rail.className = 'sp-rail'; rail.setAttribute('aria-label', 'Page sections');
      chapters.forEach((c, i) => {
        if (!c.sec.id) c.sec.id = `chapter-${i + 1}`;
        const a = document.createElement('a');
        a.href = `#${c.sec.id}`;
        a.innerHTML = `${String(i + 1).padStart(2, '0')}<span>${c.k.textContent.trim()}</span>`;
        c.a = a; rail.append(a);
      });
      body.append(rail);
      const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        chapters.forEach((c) => c.a.classList.toggle('is-active', c.sec === e.target));
      }), { rootMargin: '-45% 0px -50% 0px' });
      chapters.forEach((c) => io.observe(c.sec));
    }

    /* lightbox for every case-study image */
    const shots = $$('.asset-figure img, .case-hero-shot img, .vespera-gallery img, .eclipse-gallery img').filter((img) => !img.closest('a'));
    if (shots.length) {
      const lb = document.createElement('div');
      lb.className = 'sp-lightbox'; lb.hidden = true;
      lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Image viewer');
      lb.innerHTML = '<figure><img alt=""><figcaption><span class="lb-cap"></span><b class="lb-count"></b></figcaption></figure><button class="lb-close" type="button" aria-label="Close">✕</button><button class="lb-prev" type="button" aria-label="Previous image">←</button><button class="lb-next" type="button" aria-label="Next image">→</button>';
      body.append(lb);
      const big = $('img', lb), cap = $('.lb-cap', lb), count = $('.lb-count', lb);
      let idx = 0, opener = null;
      const show = (i) => {
        idx = (i + shots.length) % shots.length;
        const img = shots[idx];
        big.src = img.currentSrc || img.src; big.alt = img.alt;
        cap.textContent = img.closest('figure')?.querySelector('figcaption')?.textContent.trim() || img.alt;
        count.textContent = `${idx + 1} / ${shots.length}`;
      };
      const open = (i) => { opener = document.activeElement; show(i); lb.hidden = false; requestAnimationFrame(() => lb.classList.add('is-open')); body.style.overflow = 'hidden'; $('.lb-close', lb).focus(); track('case_image_opened', { page }); };
      const close = () => { lb.classList.remove('is-open'); body.style.overflow = ''; setTimeout(() => { lb.hidden = true; }, 250); opener && opener.focus && opener.focus(); };
      shots.forEach((img, i) => {
        const fig = img.closest('figure') || img;
        fig.classList.add('sp-zoomable'); fig.dataset.cursor = 'View';
        fig.tabIndex = 0; fig.setAttribute('role', 'button'); fig.setAttribute('aria-label', `Enlarge image: ${img.alt || 'project image'}`);
        fig.addEventListener('click', () => open(i));
        fig.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
      });
      $('.lb-close', lb).addEventListener('click', close);
      $('.lb-prev', lb).addEventListener('click', () => show(idx - 1));
      $('.lb-next', lb).addEventListener('click', () => show(idx + 1));
      lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
      document.addEventListener('keydown', (e) => {
        if (lb.hidden) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') show(idx - 1);
        else if (e.key === 'ArrowRight') show(idx + 1);
        else if (e.key === 'Tab') { // keep focus inside the viewer
          const btns = $$('button', lb), first = btns[0], last = btns[btns.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }

    /* cursor labels */
    $$('.portfolio-preview').forEach((a) => { a.dataset.cursor = 'Open'; });
    $$('.next-project .case-link').forEach((a) => { a.dataset.cursor = 'Next'; });

    /* work index: filter by piece */
    const grid = $('.project-showcase');
    if (grid) {
      const cards = $$('.case-card', grid).map((card) => {
        const link = $('a[href]', card), facets = FACETS[slug(link.href)] || [];
        const label = $('.package-label', card);
        if (label && facets.length) label.insertAdjacentHTML('afterbegin', `<span class="sp-facets" aria-hidden="true">${facets.map((f) => `<i data-f="${f}"></i>`).join('')}</span>`);
        return { card, facets };
      });
      const kinds = [['all', 'All work', 'var(--accent)'], ['design', 'Design', 'var(--violet)'], ['build', 'Development', 'var(--cyan)'], ['video', 'Video & story', 'var(--ember)']];
      const bar = document.createElement('div');
      bar.className = 'sp-filter'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Filter case studies');
      bar.innerHTML = kinds.map(([k, label, c]) => `<button type="button" data-k="${k}" aria-pressed="${k === 'all'}" style="--fc:${c}"><i></i>${label} <b>${k === 'all' ? cards.length : cards.filter((x) => x.facets.includes(k)).length}</b></button>`).join('');
      grid.before(bar);
      bar.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        $$('button', bar).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        cards.forEach(({ card, facets }) => card.classList.toggle('is-out', b.dataset.k !== 'all' && !facets.includes(b.dataset.k)));
        track('work_filter', { facet: b.dataset.k });
      });
    }

    /* the loop */
    const frame = () => {
      const vh = innerHeight;
      updateHeader();
      sweepPending();
      renderJourneys(vh);
      if (cursor && pointer.seen) {
        cursor.classList.add('is-on');
        cur.x = lerp(cur.x, pointer.x, 0.2); cur.y = lerp(cur.y, pointer.y, 0.2);
        ring.style.transform = `translate(${cur.x}px,${cur.y}px)`;
        dot.style.transform = `translate(${pointer.x}px,${pointer.y}px)`;
      }
      if (motion && pointer.seen) {
        doc.style.setProperty('--ax', `${((pointer.x / innerWidth - 0.5) * 60).toFixed(1)}px`);
        doc.style.setProperty('--ay', `${((pointer.y / innerHeight - 0.5) * 40).toFixed(1)}px`);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
