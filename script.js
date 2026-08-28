const root = document.documentElement;
const canvas = document.querySelector('.aura-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const cursor = document.querySelector('.cursor-glow');
const toggle = document.querySelector('.psychedelic-toggle');
const themeBrush = document.querySelector('.theme-brush');
const hireHanger = document.querySelector('.hire-hanger');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileQuery = window.matchMedia('(max-width: 700px), (pointer: coarse)');

let mouseX = 0;
let mouseY = 0;
let cursorX = 0;
let cursorY = 0;
let intensity = 1;
let particles = [];
let isMobile = mobileQuery.matches;
let tickingScroll = false;
let auraFrame = null;
let lastScrollY = window.scrollY || 0;
let hireAngle = 0;
let hireVelocity = 0;
let hireLift = 0;
let hireLiftVelocity = 0;
let hireFloatX = 0;
let hireFloatVelocityX = 0;
let hireFloatY = 0;
let hireFloatVelocityY = 0;
let hireFloatSeed = 0;
const colorThemes = [
  { name: 'default', label: 'Original spectrum' },
  { name: 'violet', label: 'Violet dream' },
  { name: 'ember', label: 'Ember glow' },
  { name: 'forest', label: 'Forest signal' },
  { name: 'cyan', label: 'Cyan pulse' },
];
let currentThemeIndex = 0;

function applyColorTheme(themeName) {
  colorThemes.forEach((theme) => {
    document.body.classList.toggle(`theme-${theme.name}`, theme.name !== 'default' && theme.name === themeName);
  });

  currentThemeIndex = Math.max(0, colorThemes.findIndex((theme) => theme.name === themeName));
  const activeTheme = colorThemes[currentThemeIndex] || colorThemes[0];

  if (themeBrush) {
    themeBrush.setAttribute('aria-label', `Change website color theme. Current theme: ${activeTheme.label}`);
    themeBrush.setAttribute('title', `Theme: ${activeTheme.label}`);
  }
}

try {
  const savedTheme = localStorage.getItem('sofinityx-color-theme');
  if (savedTheme && colorThemes.some((theme) => theme.name === savedTheme)) {
    applyColorTheme(savedTheme);
  } else {
    applyColorTheme('default');
  }
} catch (error) {
  applyColorTheme('default');
}

function setMotionVars() {
  const scrollShift = window.scrollY || 0;
  const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const scrollProgress = Math.max(0, Math.min(1, scrollShift / scrollMax));

  root.style.setProperty('--scroll-shift', isMobile ? '0px' : `${scrollShift}px`);
  root.style.setProperty('--scroll-progress', scrollProgress.toFixed(4));

  if (!isMobile) {
    root.style.setProperty('--mouse-x', `${mouseX}px`);
    root.style.setProperty('--mouse-y', `${mouseY}px`);
  }
}

function handlePointerMove(event) {
  if (isMobile) return;

  const x = event.clientX / window.innerWidth - 0.5;
  const y = event.clientY / window.innerHeight - 0.5;
  mouseX = x * 34;
  mouseY = y * 34;
  cursorX = event.clientX;
  cursorY = event.clientY;
  if (document.body.classList.contains('psychedelic-mode')) {
    document.body.classList.add('cursor-active');
  }
  setMotionVars();
}

document.addEventListener('mousemove', handlePointerMove);

function handleScroll() {
  if (tickingScroll) return;

  tickingScroll = true;
  requestAnimationFrame(() => {
    const currentScrollY = window.scrollY || 0;
    const scrollDelta = currentScrollY - lastScrollY;
    lastScrollY = currentScrollY;

    if (hireHanger && !reduceMotion) {
      hireFloatSeed += Math.abs(scrollDelta) * 0.012 + 0.17;
      const drift = Math.sin(hireFloatSeed) * 0.55 + Math.sin(hireFloatSeed * 0.47 + 1.8) * 0.45;
      const direction = scrollDelta >= 0 ? 1 : -1;

      hireVelocity += Math.max(-0.95, Math.min(0.95, scrollDelta * 0.006 + drift * 0.32));
      hireFloatVelocityX += Math.max(-1.15, Math.min(1.15, direction * drift * 0.62 + scrollDelta * 0.0024));
      hireFloatVelocityY += Math.max(-0.52, Math.min(0.52, Math.abs(scrollDelta) * 0.0018 + Math.cos(hireFloatSeed * 0.8) * 0.14));
      hireLiftVelocity += Math.max(-0.7, Math.min(0.7, Math.abs(scrollDelta) * 0.003));
    }

    setMotionVars();
    tickingScroll = false;
  });
}

document.addEventListener('scroll', handleScroll, { passive: true });
setMotionVars();

function animateCursor() {
  if (!cursor || reduceMotion || isMobile) return;

  cursor.style.transform = `translate3d(${cursorX - 11}px, ${cursorY - 11}px, 0)`;
  requestAnimationFrame(animateCursor);
}

animateCursor();

function animateHireHanger() {
  if (!hireHanger || reduceMotion) return;

  const stiffness = isMobile ? 0.035 : 0.028;
  const damping = isMobile ? 0.82 : 0.86;
  hireVelocity += (0 - hireAngle) * stiffness;
  hireVelocity *= damping;
  hireAngle += hireVelocity;
  hireAngle = Math.max(-5.5, Math.min(5.5, hireAngle));

  hireLiftVelocity += (0 - hireLift) * 0.08;
  hireLiftVelocity *= 0.78;
  hireLift += hireLiftVelocity;
  hireLift = Math.max(0, Math.min(5, hireLift));

  hireFloatVelocityX += (0 - hireFloatX) * 0.045;
  hireFloatVelocityX *= isMobile ? 0.78 : 0.84;
  hireFloatX += hireFloatVelocityX;
  hireFloatX = Math.max(isMobile ? -3 : -8, Math.min(isMobile ? 3 : 8, hireFloatX));

  hireFloatVelocityY += (0 - hireFloatY) * 0.055;
  hireFloatVelocityY *= 0.8;
  hireFloatY += hireFloatVelocityY;
  hireFloatY = Math.max(isMobile ? -1 : -3, Math.min(isMobile ? 4 : 6, hireFloatY));

  const x = Math.sin(hireAngle * Math.PI / 180) * (isMobile ? 1.5 : 3) + hireFloatX;
  const y = hireLift + hireFloatY;
  hireHanger.style.setProperty('--hire-rotate', `${hireAngle.toFixed(3)}deg`);
  hireHanger.style.setProperty('--hire-x', `${x.toFixed(3)}px`);
  hireHanger.style.setProperty('--hire-y', `${y.toFixed(3)}px`);

  requestAnimationFrame(animateHireHanger);
}

animateHireHanger();

document.querySelectorAll('a, button, .tilt-card').forEach((element) => {
  element.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
  element.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});

if (toggle) {
  toggle.addEventListener('click', () => {
    const enabled = document.body.classList.toggle('psychedelic-mode');
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? 'Soft Mode' : 'Intensify';
    intensity = enabled ? 1.45 : 1;
    document.body.classList.toggle('cursor-active', enabled);
    if (!enabled) {
      document.body.classList.remove('cursor-hover');
    }
  });
}

if (themeBrush) {
  themeBrush.addEventListener('click', () => {
    currentThemeIndex = (currentThemeIndex + 1) % colorThemes.length;
    const nextTheme = colorThemes[currentThemeIndex];
    applyColorTheme(nextTheme.name);
    themeBrush.classList.remove('theme-brush-pop');
    void themeBrush.offsetWidth;
    themeBrush.classList.add('theme-brush-pop');

    try {
      localStorage.setItem('sofinityx-color-theme', nextTheme.name);
    } catch (error) {
      // Theme switching still works even when storage is unavailable.
    }
  });
}

function resizeCanvas() {
  if (!canvas || !ctx) return;

  isMobile = mobileQuery.matches;
  if (isMobile || reduceMotion) {
    canvas.width = 1;
    canvas.height = 1;
    particles = [];
    if (auraFrame) {
      cancelAnimationFrame(auraFrame);
      auraFrame = null;
    }
    return;
  }

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * pixelRatio);
  canvas.height = Math.floor(window.innerHeight * pixelRatio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const count = 30;
  particles = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    radius: 70 + Math.random() * 150,
    speed: 0.12 + Math.random() * 0.28,
    phase: Math.random() * Math.PI * 2,
    hue: [318, 174, 48, 252, 105][index % 5],
  }));
}

function drawAura(time = 0) {
  if (!canvas || !ctx || isMobile || reduceMotion) {
    auraFrame = null;
    return;
  }

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  particles.forEach((particle, index) => {
    const drift = time * 0.00012 * particle.speed;
    const x = particle.x + Math.sin(drift + particle.phase) * 60 + mouseX * (index % 3);
    const y = particle.y + Math.cos(drift + particle.phase) * 46 + window.scrollY * particle.speed * 0.08;
    const wrappedY = ((y % (window.innerHeight + 240)) + window.innerHeight + 240) % (window.innerHeight + 240) - 120;
    const gradient = ctx.createRadialGradient(x, wrappedY, 0, x, wrappedY, particle.radius);

    gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 68%, ${0.18 * intensity})`);
    gradient.addColorStop(0.5, `hsla(${particle.hue}, 100%, 58%, ${0.065 * intensity})`);
    gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 50%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, wrappedY, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  auraFrame = requestAnimationFrame(drawAura);
}

if (canvas && ctx) {
  resizeCanvas();
  if (!isMobile && !reduceMotion) {
    drawAura();
  }
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('resize', setMotionVars);
  mobileQuery.addEventListener('change', resizeCanvas);
  mobileQuery.addEventListener('change', () => {
    isMobile = mobileQuery.matches;
    if (!isMobile && !reduceMotion && !auraFrame) {
      resizeCanvas();
      drawAura();
    }
    setMotionVars();
  });
}

if (!reduceMotion && !isMobile) {
  document.querySelectorAll('.living-section').forEach((section) => {
    section.addEventListener('mousemove', (event) => {
      const rect = section.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;
      const angle = Math.atan2(y - rect.height / 2, x - rect.width / 2) * 180 / Math.PI;

      section.style.setProperty('--section-x', `${xPercent}%`);
      section.style.setProperty('--section-y', `${yPercent}%`);
      section.style.setProperty('--section-angle', `${angle}deg`);
    });

    section.addEventListener('mouseleave', () => {
      section.style.setProperty('--section-x', '50%');
      section.style.setProperty('--section-y', '50%');
      section.style.setProperty('--section-angle', '0deg');
    });
  });

  document.querySelectorAll('.tilt-card').forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateY = ((x / rect.width) - 0.5) * 10;
      const rotateX = ((y / rect.height) - 0.5) * -10;

      card.style.setProperty('--card-x', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--card-y', `${(y / rect.height) * 100}%`);
      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  document.querySelectorAll('.visual-card').forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const xOffset = ((x / rect.width) - 0.5) * 5;
      const yOffset = ((y / rect.height) - 0.5) * 5;

      card.style.setProperty('--visual-x', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--visual-y', `${(y / rect.height) * 100}%`);
      card.style.setProperty('--visual-dx', `${xOffset}px`);
      card.style.setProperty('--visual-dy', `${yOffset}px`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--visual-x', '50%');
      card.style.setProperty('--visual-y', '50%');
      card.style.setProperty('--visual-dx', '0px');
      card.style.setProperty('--visual-dy', '0px');
    });
  });

  document.querySelectorAll('.magnetic').forEach((button) => {
    button.addEventListener('mousemove', (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate(${x * 0.12}px, ${y * 0.18}px)`;
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = '';
    });
  });

  const brandMarquee = document.querySelector('.brand-marquee');

  if (brandMarquee) {
    const pills = Array.from(brandMarquee.querySelectorAll('.brand-pill'));
    const state = {
      x: 0,
      y: 0,
      tiltX: 0,
      tiltY: 0,
      targetX: 0,
      targetY: 0,
      targetTiltX: 0,
      targetTiltY: 0,
      glowX: 50,
      glowY: 50,
      isNear: false,
    };
    const pillStates = pills.map(pill => ({
      pill,
      x: 0,
      y: 0,
      tiltX: 0,
      tiltY: 0,
      vx: 0,
      vy: 0,
      vTiltX: 0,
      vTiltY: 0,
      targetX: 0,
      targetY: 0,
      targetTiltX: 0,
      targetTiltY: 0,
      pull: 0,
    }));

    const resetBrandMarquee = () => {
      state.targetX = 0;
      state.targetY = 0;
      state.targetTiltX = 0;
      state.targetTiltY = 0;
      state.isNear = false;
      brandMarquee.classList.remove('is-reacting');
      pillStates.forEach((pillState) => {
        pillState.targetX = 0;
        pillState.targetY = 0;
        pillState.targetTiltX = 0;
        pillState.targetTiltY = 0;
        pillState.pull = 0;
        pillState.pill.classList.remove('is-pulled');
      });
    };

    const updateBrandTarget = (event) => {
      const rect = brandMarquee.getBoundingClientRect();
      const reach = 84;
      const isNear = (
        event.clientX >= rect.left - reach &&
        event.clientX <= rect.right + reach &&
        event.clientY >= rect.top - reach &&
        event.clientY <= rect.bottom + reach
      );

      if (!isNear) {
        resetBrandMarquee();
        return;
      }

      const clampedX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const clampedY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
      const distanceX = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
      const distanceY = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
      const distance = Math.hypot(distanceX, distanceY);
      const strength = Math.max(0, Math.min(1, 1 - distance / reach));
      const x = clampedX - 0.5;
      const y = clampedY - 0.5;

      state.targetX = x * 7 * strength;
      state.targetY = y * 3 * strength;
      state.targetTiltX = y * -1.8 * strength;
      state.targetTiltY = x * 2.4 * strength;
      state.glowX = clampedX * 100;
      state.glowY = clampedY * 100;
      state.isNear = true;
      brandMarquee.classList.add('is-reacting');

      pillStates.forEach((pillState) => {
        const pillRect = pillState.pill.getBoundingClientRect();
        const centerX = pillRect.left + pillRect.width / 2;
        const centerY = pillRect.top + pillRect.height / 2;
        const dx = event.clientX - centerX;
        const dy = event.clientY - centerY;
        const influenceX = Math.max(0, 1 - Math.abs(dx) / 240);
        const influenceY = Math.max(0, 1 - Math.abs(dy) / 140);
        const influence = Math.pow(influenceX * influenceY, 1.65);
        const clampedPullY = Math.max(-16, Math.min(16, dy * 0.22));
        const clampedPullX = Math.max(-8, Math.min(8, dx * 0.055));

        pillState.targetX = clampedPullX * influence;
        pillState.targetY = clampedPullY * influence;
        pillState.targetTiltX = Math.max(-7, Math.min(7, dy * -0.12)) * influence;
        pillState.targetTiltY = Math.max(-5, Math.min(5, dx * 0.055)) * influence;
        pillState.pull = influence;
        pillState.pill.classList.toggle('is-pulled', influence > 0.34);
      });
    };

    const animateBrandMarquee = () => {
      state.x += (state.targetX - state.x) * 0.06;
      state.y += (state.targetY - state.y) * 0.06;
      state.tiltX += (state.targetTiltX - state.tiltX) * 0.06;
      state.tiltY += (state.targetTiltY - state.tiltY) * 0.06;

      brandMarquee.style.setProperty('--brand-shift-x', `${state.x.toFixed(3)}px`);
      brandMarquee.style.setProperty('--brand-shift-y', `${state.y.toFixed(3)}px`);
      brandMarquee.style.setProperty('--brand-tilt-x', `${state.tiltX.toFixed(3)}deg`);
      brandMarquee.style.setProperty('--brand-tilt-y', `${state.tiltY.toFixed(3)}deg`);
      brandMarquee.style.setProperty('--brand-glow-x', `${state.glowX.toFixed(2)}%`);
      brandMarquee.style.setProperty('--brand-glow-y', `${state.glowY.toFixed(2)}%`);

      pillStates.forEach((pillState) => {
        pillState.vx = (pillState.vx + (pillState.targetX - pillState.x) * 0.09) * 0.78;
        pillState.vy = (pillState.vy + (pillState.targetY - pillState.y) * 0.09) * 0.78;
        pillState.vTiltX = (pillState.vTiltX + (pillState.targetTiltX - pillState.tiltX) * 0.09) * 0.78;
        pillState.vTiltY = (pillState.vTiltY + (pillState.targetTiltY - pillState.tiltY) * 0.09) * 0.78;
        pillState.x += pillState.vx;
        pillState.y += pillState.vy;
        pillState.tiltX += pillState.vTiltX;
        pillState.tiltY += pillState.vTiltY;

        pillState.pill.style.setProperty('--pill-shift-x', `${pillState.x.toFixed(3)}px`);
        pillState.pill.style.setProperty('--pill-shift-y', `${pillState.y.toFixed(3)}px`);
        pillState.pill.style.setProperty('--pill-tilt-x', `${pillState.tiltX.toFixed(3)}deg`);
        pillState.pill.style.setProperty('--pill-tilt-y', `${pillState.tiltY.toFixed(3)}deg`);
      });

      requestAnimationFrame(animateBrandMarquee);
    };

    document.addEventListener('mousemove', updateBrandTarget);
    document.addEventListener('mouseleave', resetBrandMarquee);
    window.addEventListener('scroll', resetBrandMarquee, { passive: true });
    animateBrandMarquee();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const reveals = document.querySelectorAll('.reveal');
  const navLinks = document.querySelectorAll('.site-nav a[href^="#"]');
  const navTargets = Array.from(navLinks)
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const createRevealObserver = threshold => new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold });

  const defaultRevealObserver = createRevealObserver(0.16);
  const tallSectionRevealObserver = createRevealObserver(0.045);

  reveals.forEach(el => {
    const observer = el.classList.contains('selected-work')
      ? tallSectionRevealObserver
      : defaultRevealObserver;

    observer.observe(el);
  });

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      navLinks.forEach(link => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-35% 0px -55% 0px', threshold: 0.01 });

  navTargets.forEach(target => navObserver.observe(target));
});
