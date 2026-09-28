/* Isolated Section 02 enhancement. No listeners or mutations on the Hero. */
(() => {
  const gallery = document.querySelector('[data-experience-gallery]');
  if (!gallery) return;

  const viewport = gallery.querySelector('[data-carousel-viewport]');
  const slides = [...gallery.querySelectorAll('[data-slide]')];
  const videos = slides.map(slide => slide.querySelector('video'));
  const pages = [...gallery.querySelectorAll('[data-carousel-page]')];
  const announcement = gallery.querySelector('[data-carousel-announcement]');
  const status = gallery.querySelector('[data-carousel-status]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData === true;
  let active = 0;
  let requested = null;
  let visible = false;
  let nearby = false;
  let userPaused = reducedMotion.matches || saveData;
  let blocked = false;
  let scrolling = false;
  let recentering = false;
  let settleTimer;
  let resizeTimer;
  let drag = null;
  let previewQueueRunning = false;
  let windowVersion = 0;
  let positionVersion = 0;
  let suppressClick = false;
  let touchStart = null;

  const wrap = index => (index + slides.length) % slides.length;
  const wantsPlayback = () => visible && !document.hidden && !userPaused && !blocked && !scrolling && !drag?.moved;

  function updatePlaybackState() {
    gallery.dataset.playback = videos[active].paused ? 'paused' : 'playing';
  }

  function markInteraction() {
    gallery.classList.add('has-interacted');
  }

  function pauseAll() {
    videos.forEach(video => { video.autoplay = false; video.pause(); });
    updatePlaybackState();
  }

  function prepare(video) {
    if (video.preload !== 'none') return;
    video.preload = 'metadata';
    video.load();
  }

  function syncPlayback() {
    videos.forEach((video, index) => {
      if (index !== active) { video.autoplay = false; video.pause(); }
    });
    const video = videos[active];
    if (!wantsPlayback()) {
      video.autoplay = false;
      video.pause();
      updatePlaybackState();
      return;
    }
    prepare(video);
    video.autoplay = true;
    video.play().then(() => {
      if (video !== videos[active] || !wantsPlayback()) video.pause();
      updatePlaybackState();
    }).catch(error => {
      if (error.name === 'AbortError' || video !== videos[active]) return;
      blocked = true;
      updatePlaybackState();
    });
  }

  // Paused side frames come from the original MP4s. Only metadata/first-frame
  // buffering is requested, sequentially and only near the gallery.
  async function preparePreviews() {
    if (previewQueueRunning || !nearby || saveData) return;
    previewQueueRunning = true;
    const version = windowVersion;
    try {
      const order = [active, ...[...viewport.children].map(slide => Number(slide.dataset.index)).filter(index => index !== active)];
      for (const index of order) {
        if (!nearby || document.hidden || version !== windowVersion) break;
        const video = videos[index];
        if (video.readyState >= 2) continue;
        await new Promise(resolve => {
          let timer;
          const finish = () => {
            clearTimeout(timer);
            video.removeEventListener('loadeddata', finish);
            video.removeEventListener('error', finish);
            resolve();
          };
          video.addEventListener('loadeddata', finish, { once: true });
          video.addEventListener('error', finish, { once: true });
          timer = setTimeout(finish, 4000);
          prepare(video);
        });
      }
    } finally {
      previewQueueRunning = false;
      if (nearby && version !== windowVersion) preparePreviews();
    }
  }

  function centerOffset(slide) {
    return viewport.scrollLeft + slide.getBoundingClientRect().left
      - viewport.getBoundingClientRect().left - (viewport.clientWidth - slide.offsetWidth) / 2;
  }

  function closestSlide() {
    return [...viewport.children].reduce((closest, slide) =>
      Math.abs(centerOffset(slide) - viewport.scrollLeft) < Math.abs(centerOffset(closest) - viewport.scrollLeft)
        ? slide : closest, slides[active]);
  }

  function renderSelection(announce = false) {
    slides.forEach((slide, index) => {
      const selected = index === active;
      slide.classList.toggle('is-active', selected);
      slide.classList.toggle('is-previous', slide === viewport.firstElementChild && !selected);
      slide.classList.toggle('is-next', slide === viewport.lastElementChild && !selected);
      slide.setAttribute('aria-hidden', String(!selected));
      if (selected) slide.setAttribute('aria-current', 'true');
      else slide.removeAttribute('aria-current');
    });
    pages.forEach((page, index) => {
      if (index === active) page.setAttribute('aria-current', 'true');
      else page.removeAttribute('aria-current');
    });
    if (announce) announcement.textContent = `Vídeo ${String(active + 1).padStart(2, '0')} de ${String(slides.length).padStart(2, '0')}`;
    status.hidden = !videos[active].error;
    if (!status.hidden) status.textContent = 'Não foi possível carregar este vídeo. Tente reproduzi-lo novamente.';
    updatePlaybackState();
  }

  function mountWindow(target = null, direction = 0) {
    const indices = [wrap(active - 1), active, wrap(active + 1)];
    // A distant pagination target takes one side slot for a single smooth
    // transition. The two intermediate videos never load or play.
    if (target !== null && !indices.includes(target)) indices[direction < 0 ? 0 : 2] = target;
    const [previous, current, next] = indices.map(index => slides[index]);
    for (const slide of [...viewport.children]) {
      if (!indices.includes(Number(slide.dataset.index))) slide.remove();
    }
    if (current.parentElement !== viewport) viewport.append(current);
    if (current.previousElementSibling !== previous) viewport.insertBefore(previous, current);
    if (current.nextElementSibling !== next) viewport.insertBefore(next, current.nextSibling);
    windowVersion++;
  }

  function recenter(target = null, direction = 0, onReady = null) {
    const version = ++positionVersion;
    recentering = true;
    viewport.classList.add('is-recentering');
    // Keep the active node in place; retain the other original nodes in
    // memory, mounting only the previous / active / next window.
    mountWindow(target, direction);
    renderSelection();
    viewport.scrollTo({ left: centerOffset(slides[active]), behavior: 'instant' });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (version !== positionVersion) return;
      viewport.classList.remove('is-recentering');
      recentering = false;
      if (onReady) onReady();
      else { scrolling = false; syncPlayback(); }
      preparePreviews();
    }));
  }

  function settle() {
    clearTimeout(settleTimer);
    if (recentering || drag) return;
    const next = Number(closestSlide().dataset.index);
    const changed = next !== active;
    pauseAll();
    active = next;
    requested = null;
    scrolling = false;
    renderSelection(changed);
    recenter();
  }

  function goTo(index) {
    const target = wrap(index);
    requested = target;
    markInteraction();
    pauseAll();
    scrolling = true;
    clearTimeout(settleTimer);
    if (target === active) {
      requested = null;
      if (blocked) { blocked = false; userPaused = false; }
      recenter();
      return;
    }
    const forward = wrap(target - active);
    const direction = forward <= slides.length / 2 ? 1 : -1;
    const beginTransition = () => {
      prepare(videos[target]);
      viewport.scrollTo({ left: centerOffset(slides[target]), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      settleTimer = setTimeout(settle, reducedMotion.matches ? 30 : 450);
    };
    // Adjacent slides are already mounted: continue directly from the drag
    // position instead of snapping back to the old center before animating.
    if (slides[target].parentElement === viewport && !recentering) beginTransition();
    else recenter(target, direction, beginTransition);
  }

  videos.forEach((video, index) => {
    video.muted = true;
    video.controls = false;
    video.tabIndex = -1;
    video.addEventListener('play', () => {
      if (index !== active || !wantsPlayback()) { video.pause(); return; }
      videos.forEach(other => { if (other !== video) other.pause(); });
      updatePlaybackState();
    });
    video.addEventListener('pause', updatePlaybackState);
    video.addEventListener('error', () => { if (index === active) renderSelection(); });
    video.addEventListener('loadeddata', () => { if (index !== active) video.pause(); });
  });

  pages.forEach(page => page.addEventListener('click', () => goTo(Number(page.dataset.carouselPage))));
  function togglePlayback() {
    markInteraction();
    userPaused = !videos[active].paused;
    blocked = false;
    if (videos[active].error) {
      videos[active].load();
      status.hidden = true;
    }
    syncPlayback();
  }

  viewport.addEventListener('click', event => {
    if (suppressClick) { suppressClick = false; return; }
    const slide = event.target.closest('[data-slide]');
    if (!slide || scrolling || recentering) return;
    const index = Number(slide.dataset.index);
    if (index === active) togglePlayback();
    else goTo(index);
  });

  viewport.addEventListener('keydown', event => {
    const actions = { ArrowLeft: () => goTo((requested ?? active) - 1), ArrowRight: () => goTo((requested ?? active) + 1), Home: () => goTo(0), End: () => goTo(slides.length - 1), ' ': togglePlayback, Enter: togglePlayback };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  });
  viewport.addEventListener('scroll', () => {
    if (recentering) return;
    scrolling = true;
    pauseAll();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 140);
  }, { passive: true });

  // Touch uses native scrolling and scroll snap. Mouse gets the same drag
  // behavior without capturing vertical page gestures or touch events.
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || recentering) return;
    drag = { id: event.pointerId, startX: event.clientX, startScroll: viewport.scrollLeft, moved: false };
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      markInteraction();
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
      pauseAll();
    }
    event.preventDefault();
    viewport.scrollLeft = drag.startScroll - distance;
  });
  function finishDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const distance = drag.startX - event.clientX;
    const moved = drag.moved;
    drag = null;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (moved) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      const next = Math.abs(distance) > slides[active].offsetWidth * .22
        ? wrap(active + Math.sign(distance)) : Number(closestSlide().dataset.index);
      goTo(next);
    }
  }
  viewport.addEventListener('pointerup', finishDrag);
  viewport.addEventListener('pointercancel', finishDrag);
  viewport.addEventListener('pointerleave', event => {
    if (drag && !drag.moved && event.pointerId === drag.id) drag = null;
  });
  viewport.addEventListener('dragstart', event => event.preventDefault());
  viewport.addEventListener('touchstart', event => {
    const touch = event.touches[0];
    touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }, { passive: true });
  viewport.addEventListener('touchmove', event => {
    if (!touchStart || !event.touches[0]) return;
    const dx = Math.abs(event.touches[0].clientX - touchStart.x);
    const dy = Math.abs(event.touches[0].clientY - touchStart.y);
    if (dx > 8 && dx > dy) markInteraction();
  }, { passive: true });
  viewport.addEventListener('touchend', () => { touchStart = null; }, { passive: true });

  new IntersectionObserver(entries => {
    nearby = entries[0].isIntersecting;
    if (nearby) preparePreviews();
  }, { rootMargin: '180px 0px' }).observe(viewport);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .25;
    syncPlayback();
  }, { threshold: [0, .25, .5] }).observe(viewport);
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!drag) { clearTimeout(settleTimer); requested = null; recenter(); }
    }, 120);
  }).observe(viewport);
  document.addEventListener('visibilitychange', () => {
    syncPlayback();
    if (!document.hidden && nearby) preparePreviews();
  });
  reducedMotion.addEventListener('change', () => {
    userPaused = reducedMotion.matches || saveData;
    syncPlayback();
  });
  window.addEventListener('pagehide', pauseAll);

  gallery.classList.add('is-enhanced');
  renderSelection();
  recenter();
})();
