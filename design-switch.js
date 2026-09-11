(() => {
  'use strict';
  const root = new URL('./', document.currentScript.src);
  const originalRoot = new URL('original/', root);
  const original = location.pathname.startsWith(originalRoot.pathname);
  const relative = location.pathname.slice((original ? originalRoot : root).pathname.length);
  // Netlify may serve /vespera or /vespera/ instead of /vespera.html.
  const route = relative.replace(/\/+$/, '');
  const page = !route ? 'index.html' : route.includes('.') ? route : `${route}.html`;
  const pages = new Set(['index.html','website-design.html','ux-ui-design.html','brand-identity-design.html','creative-marketing-support.html','social-media-design.html','video-editing-for-brands.html','case-studies.html','lumaro.html','lumaro-brand.html','lumaro-launch.html','trendium.html','trendium-brand.html','trendium-product-system.html','sofinityx-case-study.html','vespera.html','voltara.html','eclipse-district.html']);
  if (!pages.has(page)) return;
  const desktop = matchMedia('(min-width: 1001px) and (pointer: fine)');
  const key = 'sofinityx-design';
  const stored = () => { try { return localStorage.getItem(key); } catch { return null; } };
  function destination(design) {
    const url = new URL(page, design === 'original' ? originalRoot : root);
    url.search = location.search;
    url.hash = location.hash;
    return url.href;
  }
  function enforceDevice() {
    if (original && !desktop.matches) {
      location.replace(destination('refined'));
      return true;
    }
    return false;
  }
  if (enforceDevice()) return;
  if (desktop.matches && !original && stored() === 'original') {
    location.replace(destination('original'));
    return;
  }
  desktop.addEventListener('change', enforceDevice);
  document.addEventListener('DOMContentLoaded', () => {
    const control = document.createElement('div');
    control.className = 'design-switch';
    control.setAttribute('role', 'group');
    control.setAttribute('aria-label', 'Website design');
    const label = document.createElement('span');
    label.className = 'design-switch-label';
    label.textContent = 'View';
    control.append(label);
    for (const [value, title] of [['refined','Refined'],['original','Original']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = title;
      button.setAttribute('aria-pressed', String((original ? 'original' : 'refined') === value));
      button.addEventListener('click', () => {
        try { localStorage.setItem(key, value); } catch { /* Switching still works without storage. */ }
        if ((original ? 'original' : 'refined') !== value) location.assign(destination(value));
      });
      control.append(button);
    }
    document.body.append(control);
  });
})();
