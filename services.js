/* Section 03 interaction only. No listeners or mutations on earlier sections. */
(() => {
  const section = document.querySelector('[data-services]');
  if (!section) return;

  const triggers = [...section.querySelectorAll('[data-service-trigger]')];
  const visual = section.querySelector('[data-service-visual]');
  const image = visual.querySelector('[data-service-image]');
  const mobile = matchMedia('(max-width: 980px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let requestId = 0;
  let swapTimer;

  function placeVisual() {
    const parent = mobile.matches ? triggers[active].closest('[data-service-item]') : section;
    if (visual.parentElement !== parent) parent.append(visual);
  }

  function activate(index) {
    const selected = triggers[index];
    if (!selected) return;

    active = index;
    triggers.forEach((trigger, current) => {
      const isActive = current === index;
      trigger.classList.toggle('is-active', isActive);
      trigger.setAttribute('aria-pressed', String(isActive));
    });
    placeVisual();

    const nextSource = selected.dataset.image;
    const currentRequest = ++requestId;
    clearTimeout(swapTimer);
    image.classList.remove('is-changing');
    if (image.getAttribute('src') === nextSource) return;

    const nextImage = new Image();
    nextImage.src = nextSource;
    nextImage.decode().then(() => {
      if (currentRequest !== requestId) return;
      const swap = () => {
        if (currentRequest !== requestId) return;
        image.src = nextSource;
        image.alt = selected.dataset.alt;
        requestAnimationFrame(() => image.classList.remove('is-changing'));
      };
      if (reducedMotion.matches) swap();
      else {
        image.classList.add('is-changing');
        swapTimer = setTimeout(swap, 170);
      }
    }).catch(() => {
      if (currentRequest === requestId) image.classList.remove('is-changing');
    });
  }

  triggers.forEach((trigger, index) => {
    trigger.addEventListener('mouseenter', () => {
      if (!mobile.matches) activate(index);
    });
    trigger.addEventListener('focus', () => activate(index));
    trigger.addEventListener('click', () => activate(index));
  });
  mobile.addEventListener('change', placeVisual);

  placeVisual();
})();
