const brandIntro = document.querySelector('.brand-intro');

if (brandIntro) {
  const retireIntro = () => brandIntro.remove();
  brandIntro.addEventListener('animationend', (event) => {
    if (event.target === brandIntro && event.animationName === 'intro-reveal') retireIntro();
  });
  document.addEventListener('focusin', retireIntro, { once: true });
  window.setTimeout(retireIntro, 1500);
}

const menu = document.querySelector('#mobile-menu');
const menuToggle = document.querySelector('.menu-toggle');
const desktopViewport = window.matchMedia('(min-width: 1024px)');

function syncScrollLock() {
  document.body.classList.toggle('has-dialog', menu.open);
}

function closeMenu() {
  if (menu.open) menu.close();
}

menuToggle.addEventListener('click', () => {
  menu.showModal();
  menuToggle.setAttribute('aria-expanded', 'true');
  syncScrollLock();
});

document.querySelector('[data-close-menu]').addEventListener('click', closeMenu);
menu.addEventListener('close', () => {
  menuToggle.setAttribute('aria-expanded', 'false');
  syncScrollLock();
  (desktopViewport.matches ? document.querySelector('.brand') : menuToggle).focus({ preventScroll: true });
});

menu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

// The native dialog provides Escape dismissal and contains keyboard focus.
menu.addEventListener('click', (event) => {
  if (event.target !== menu) return;
  const bounds = menu.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
    closeMenu();
  }
});

desktopViewport.addEventListener('change', ({ matches }) => {
  if (matches && menu.open) closeMenu();
});

const finalSection = document.querySelector('#proximo-evento');
const finalButton = finalSection.querySelector('.final-cta__button');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let anchorFrame = 0;
let anchorController = null;
let anchorDestination = null;

function stopAnchorScroll() {
  cancelAnimationFrame(anchorFrame);
  anchorController?.abort();
  anchorController = null;
  anchorDestination = null;
  anchorFrame = 0;
}

function finalScrollPosition() {
  const sectionTop = finalSection.getBoundingClientRect().top + window.scrollY;
  const buttonBottom = finalButton.getBoundingClientRect().bottom + window.scrollY;
  const withButtonVisible = Math.max(sectionTop, buttonBottom - window.innerHeight + 40);
  return Math.min(withButtonVisible, document.documentElement.scrollHeight - window.innerHeight);
}

function anchorPosition(target) {
  const position = target === finalSection
    ? finalScrollPosition()
    : target.getBoundingClientRect().top + window.scrollY;
  return Math.max(0, Math.min(position, document.documentElement.scrollHeight - window.innerHeight));
}

function finishAnchorScroll(target, hash) {
  stopAnchorScroll();
  if (location.hash !== hash) history.pushState(null, '', hash);
  const focusTarget = target === finalSection ? finalButton : target;
  if (focusTarget === target && !focusTarget.hasAttribute('tabindex')) {
    focusTarget.setAttribute('tabindex', '-1');
    focusTarget.addEventListener('blur', () => focusTarget.removeAttribute('tabindex'), { once: true });
  }
  focusTarget.focus({ preventScroll: true });
}

function startAnchorScroll(target, hash) {
  stopAnchorScroll();
  anchorDestination = { target, hash };
  const start = window.scrollY;
  const end = anchorPosition(target);

  if (reducedMotion.matches || Math.abs(end - start) < 2) {
    window.scrollTo(0, end);
    finishAnchorScroll(target, hash);
    return;
  }

  anchorController = new AbortController();
  const { signal } = anchorController;
  window.addEventListener('wheel', stopAnchorScroll, { passive: true, signal });
  window.addEventListener('touchstart', stopAnchorScroll, { passive: true, signal });
  window.addEventListener('pointerdown', stopAnchorScroll, { signal });
  window.addEventListener('keydown', stopAnchorScroll, { signal });
  window.addEventListener('popstate', stopAnchorScroll, { signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAnchorScroll();
  }, { signal });

  const duration = Math.min(1600, Math.max(700, 460 + Math.abs(end - start) / window.innerHeight * 200));
  const startedAt = performance.now();

  function step(now) {
    if (!anchorController) return;
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = progress * progress * (3 - 2 * progress);
    window.scrollTo(0, start + (end - start) * eased);
    if (progress < 1) anchorFrame = requestAnimationFrame(step);
    else finishAnchorScroll(target, hash);
  }

  anchorFrame = requestAnimationFrame(step);
}

document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach((link) => {
  const hash = link.getAttribute('href');
  const target = document.getElementById(hash.slice(1));
  if (!target) return;
  link.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (menu.contains(link)) {
      requestAnimationFrame(() => startAnchorScroll(target, hash));
    } else {
      startAnchorScroll(target, hash);
    }
  });
});

reducedMotion.addEventListener('change', ({ matches }) => {
  if (!matches || !anchorDestination) return;
  const { target, hash } = anchorDestination;
  window.scrollTo(0, anchorPosition(target));
  finishAnchorScroll(target, hash);
});

document.documentElement.classList.add('has-js');
