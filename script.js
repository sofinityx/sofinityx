const art = document.querySelector('.brand-art');
const glow = document.getElementById("cursor-glow");

let currentX = 0;
let currentY = 0;
let targetX = 0;
let targetY = 0;

document.addEventListener('mousemove', (e) => {
  const { innerWidth, innerHeight } = window;
  targetX = (e.clientX / innerWidth - 0.5) * 18;
  targetY = (e.clientY / innerHeight - 0.5) * 18;

  const x = (e.clientX / window.innerWidth) * 100;
  const y = (e.clientY / window.innerHeight) * 100;

  glow.style.setProperty("--x", `${x}%`);
  glow.style.setProperty("--y", `${y}%`);
  glow.style.opacity = "0.35";
});

document.addEventListener("mouseleave", () => {
  glow.style.opacity = "0";
});

function animate() {
  currentX += (targetX - currentX) * 0.08;
  currentY += (targetY - currentY) * 0.08;

  art.style.transform = `translate(${currentX}px, ${currentY}px)`;
  requestAnimationFrame(animate);
}

animate();

document.addEventListener('DOMContentLoaded', () => {
  const reveals = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15 });

  reveals.forEach(el => observer.observe(el));
});
