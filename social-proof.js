/* Original comments live once in HTML. All marquee copies are decorative. */
(() => {
  const section = document.querySelector('[data-social-proof]');
  if (!section) return;

  const originals = [...section.querySelectorAll('[data-proof-card]')];
  const wall = section.querySelector('[data-proof-wall]');
  if (!originals.length || !wall) return;

  const mobile = matchMedia('(max-width: 700px)');
  const intermediate = matchMedia('(max-width: 1100px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const phases = [.18, .42, .28, .56];
  let intersecting = false;
  let mobileCycle = 0;
  let mobileFrame = 0;
  let lastFrame = 0;
  let mobileRemainder = 0;
  let manualUntil = 0;
  let mouseDrag = null;
  let normalizing = false;
  let lastMobileWidth = window.innerWidth;

  function cloneCard(original) {
    const card = original.cloneNode(true);
    card.removeAttribute('data-proof-card');
    return card;
  }

  function normalizeMobileScroll() {
    if (!mobile.matches || !mobileCycle || normalizing) return;
    const position = wall.scrollLeft;
    if (position >= mobileCycle * .5 && position <= mobileCycle * 1.5) return;
    normalizing = true;
    const shift = position < mobileCycle * .5 ? mobileCycle : -mobileCycle;
    wall.scrollLeft = position + shift;
    if (mouseDrag) mouseDrag.scroll += shift;
    normalizing = false;
  }

  function mobileTick(now) {
    mobileFrame = requestAnimationFrame(mobileTick);
    if (lastFrame && now >= manualUntil && !mouseDrag) {
      mobileRemainder += Math.min(now - lastFrame, 64) * .018;
      const step = Math.floor(mobileRemainder);
      if (step) {
        wall.scrollLeft += step;
        mobileRemainder -= step;
        normalizeMobileScroll();
      }
    }
    lastFrame = now;
  }

  function syncMobileMotion() {
    const shouldRun = mobile.matches && !reducedMotion.matches && intersecting && !document.hidden;
    if (shouldRun && !mobileFrame) {
      lastFrame = 0;
      mobileFrame = requestAnimationFrame(mobileTick);
    } else if (!shouldRun && mobileFrame) {
      cancelAnimationFrame(mobileFrame);
      mobileFrame = 0;
    }
  }

  function renderMobile() {
    const track = document.createElement('div');
    track.className = 'social-proof__mobile-track';
    for (let index = 0; index < 3; index++) {
      const set = document.createElement('div');
      set.className = 'social-proof__mobile-set';
      originals.forEach(card => set.append(cloneCard(card)));
      track.append(set);
    }
    wall.replaceChildren(track);
    mobileCycle = track.children[1].offsetLeft - track.children[0].offsetLeft;
    wall.scrollLeft = mobileCycle;
    mobileRemainder = 0;
  }

  function render() {
    if (mobile.matches) {
      renderMobile();
      section.classList.add('is-ready');
      syncMobileMotion();
      return;
    }
    mobileCycle = 0;
    const columnCount = mobile.matches ? 2 : intermediate.matches ? 3 : 4;
    const plane = document.createElement('div');
    plane.className = 'social-proof__plane';
    wall.replaceChildren(plane);

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      const assigned = originals.filter((_, index) => index % columnCount === columnIndex);
      if (!assigned.length) assigned.push(originals[columnIndex % originals.length]);

      const column = document.createElement('div');
      column.className = 'social-proof__column';
      const track = document.createElement('div');
      track.className = 'social-proof__track';
      const set = document.createElement('div');
      set.className = 'social-proof__set';
      assigned.forEach((card) => set.append(cloneCard(card)));
      track.append(set);
      column.append(track);
      plane.append(column);

      let repeat = 0;
      while (set.offsetHeight < wall.clientHeight + 24 && repeat < 20) {
        set.append(cloneCard(assigned[repeat % assigned.length]));
        repeat++;
      }
      track.append(set.cloneNode(true));

      const gap = parseFloat(getComputedStyle(track).rowGap) || 16;
      const distance = set.offsetHeight + gap;
      const pixelsPerSecond = columnCount === 2 ? 12 : columnCount === 3 ? 15 : 18;
      const duration = Math.max(48, Math.round(distance / pixelsPerSecond));
      track.style.setProperty('--duration', duration + 's');
      track.style.setProperty('--delay', (-duration * phases[columnIndex]).toFixed(1) + 's');
    }

    section.classList.add('is-ready');
    syncMobileMotion();
  }

  render();
  mobile.addEventListener('change', render);
  intermediate.addEventListener('change', render);
  reducedMotion.addEventListener('change', syncMobileMotion);
  window.addEventListener('resize', () => {
    if (!mobile.matches || window.innerWidth === lastMobileWidth) return;
    lastMobileWidth = window.innerWidth;
    render();
  });

  wall.addEventListener('scroll', normalizeMobileScroll, { passive: true });
  wall.addEventListener('touchstart', () => { manualUntil = Infinity; }, { passive: true });
  wall.addEventListener('touchend', () => { manualUntil = performance.now() + 1800; }, { passive: true });
  wall.addEventListener('touchcancel', () => { manualUntil = performance.now() + 1800; }, { passive: true });
  wall.addEventListener('wheel', () => { manualUntil = performance.now() + 1800; }, { passive: true });
  wall.addEventListener('pointerdown', event => {
    if (!mobile.matches || event.pointerType !== 'mouse' || event.button !== 0) return;
    mouseDrag = { id: event.pointerId, x: event.clientX, scroll: wall.scrollLeft };
    manualUntil = Infinity;
    wall.setPointerCapture(event.pointerId);
    wall.classList.add('is-dragging');
  });
  wall.addEventListener('pointermove', event => {
    if (!mouseDrag || mouseDrag.id !== event.pointerId) return;
    event.preventDefault();
    wall.scrollLeft = mouseDrag.scroll - (event.clientX - mouseDrag.x);
    normalizeMobileScroll();
  });
  function endMouseDrag(event) {
    if (!mouseDrag || mouseDrag.id !== event.pointerId) return;
    mouseDrag = null;
    wall.classList.remove('is-dragging');
    if (wall.hasPointerCapture(event.pointerId)) wall.releasePointerCapture(event.pointerId);
    manualUntil = performance.now() + 1800;
  }
  wall.addEventListener('pointerup', endMouseDrag);
  wall.addEventListener('pointercancel', endMouseDrag);

  if (!('IntersectionObserver' in window)) {
    intersecting = true;
    section.classList.add('is-in-view');
    syncMobileMotion();
    return;
  }

  const syncPlayback = () => {
    section.classList.toggle('is-in-view', intersecting && !document.hidden);
    syncMobileMotion();
  };
  const observer = new IntersectionObserver(([entry]) => {
    intersecting = entry.isIntersecting;
    syncPlayback();
  }, { threshold: 0.01 });
  observer.observe(section);
  document.addEventListener('visibilitychange', syncPlayback);
})();
