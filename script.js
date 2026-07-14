const root = document.documentElement;
const canvas = document.querySelector('.aura-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const cursor = document.querySelector('.cursor-glow');
const toggle = document.querySelector('.psychedelic-toggle');
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

function setMotionVars() {
  const scrollShift = window.scrollY || 0;
  root.style.setProperty('--scroll-shift', `${scrollShift}px`);
  root.style.setProperty('--mouse-x', `${mouseX}px`);
  root.style.setProperty('--mouse-y', `${mouseY}px`);
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
  if (isMobile) return;
  if (tickingScroll) return;

  tickingScroll = true;
  requestAnimationFrame(() => {
    setMotionVars();
    tickingScroll = false;
  });
}

document.addEventListener('scroll', handleScroll, { passive: true });
setMotionVars();

function animateCursor() {
  if (!cursor || reduceMotion) return;

  cursor.style.transform = `translate3d(${cursorX - 11}px, ${cursorY - 11}px, 0)`;
  requestAnimationFrame(animateCursor);
}

animateCursor();

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

function resizeCanvas() {
  if (!canvas || !ctx) return;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * pixelRatio);
  canvas.height = Math.floor(window.innerHeight * pixelRatio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  isMobile = mobileQuery.matches;
  const count = isMobile ? 10 : 38;
  particles = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    radius: isMobile ? 90 + Math.random() * 120 : 70 + Math.random() * 150,
    speed: isMobile ? 0.04 + Math.random() * 0.1 : 0.12 + Math.random() * 0.28,
    phase: Math.random() * Math.PI * 2,
    hue: [318, 174, 48, 252, 105][index % 5],
  }));
}

function drawAura(time = 0) {
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  particles.forEach((particle, index) => {
    const drift = time * 0.00012 * particle.speed;
    const x = particle.x + Math.sin(drift + particle.phase) * (isMobile ? 28 : 60) + mouseX * (index % 3);
    const y = particle.y + Math.cos(drift + particle.phase) * (isMobile ? 22 : 46) + (isMobile ? 0 : window.scrollY * particle.speed * 0.08);
    const wrappedY = ((y % (window.innerHeight + 240)) + window.innerHeight + 240) % (window.innerHeight + 240) - 120;
    const gradient = ctx.createRadialGradient(x, wrappedY, 0, x, wrappedY, particle.radius);

    gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 68%, ${(isMobile ? 0.1 : 0.18) * intensity})`);
    gradient.addColorStop(0.5, `hsla(${particle.hue}, 100%, 58%, ${(isMobile ? 0.035 : 0.065) * intensity})`);
    gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 50%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, wrappedY, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  if (!reduceMotion) {
    requestAnimationFrame(drawAura);
  }
}

if (canvas && ctx) {
  resizeCanvas();
  drawAura();
  window.addEventListener('resize', resizeCanvas);
  mobileQuery.addEventListener('change', resizeCanvas);
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
}

document.addEventListener('DOMContentLoaded', () => {
  const reveals = document.querySelectorAll('.reveal');
  const navLinks = document.querySelectorAll('.site-nav a[href^="#"]');
  const navTargets = Array.from(navLinks)
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.16 });

  reveals.forEach(el => observer.observe(el));

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
