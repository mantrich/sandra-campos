/* Section 04 reveal only; no mutations to earlier sections. */
(() => {
  const section = document.querySelector('[data-final-cta]');
  if (!section || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  section.classList.add('has-reveal');
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    section.classList.add('is-visible');
    observer.disconnect();
  }, { threshold: 0.08 });
  observer.observe(section);
})();
