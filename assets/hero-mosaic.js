(() => {
  const canvas = document.querySelector('.hero-mosaic');
  if (!canvas) return;
  const hero = canvas.closest('.hero');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const sample = document.createElement('canvas');
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
  if (!sampleCtx) return;
  const resting = document.createElement('canvas');
  const restingCtx = resting.getContext('2d', { alpha: false });
  if (!restingCtx) return;
  const pointer = { x: -1000, y: -1000, active: false };
  let width = 0;
  let height = 0;
  let cell = 4;
  let tiles = [];
  let images = [];
  let frame = 0;
  let lastTime = 0;
  let visible = true;
  let resizeFrame = 0;
  let releaseTimer = 0;
  const blocked = () => document.hidden || !visible || Boolean(document.querySelector('dialog[open]'));

  const resize = () => {
    const bounds = hero.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resting.width = canvas.width;
    resting.height = canvas.height;
    restingCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = width < 650 ? 3 : 4;
    const columns = Math.ceil(width / cell);
    const rows = Math.ceil(height / cell);
    sample.width = columns;
    sample.height = rows;
    sampleCtx.fillStyle = '#171917';
    sampleCtx.fillRect(0, 0, columns, rows);
    const mobile = width < 650;
    const centerX = columns * (mobile ? .6 : .67);
    const radius = Math.min(columns * (mobile ? .64 : .26), rows * .4);
    sampleCtx.fillStyle = '#802a24';
    sampleCtx.beginPath();
    sampleCtx.arc(centerX, rows * (mobile ? .37 : .46), radius, 0, Math.PI * 2);
    sampleCtx.fill();
    if (images[0]) {
      const image = images[0];
      const imageHeight = rows * (mobile ? .72 : .89);
      const imageWidth = imageHeight * image.naturalWidth / image.naturalHeight;
      sampleCtx.drawImage(image, centerX - imageWidth / 2, (mobile ? 64 : 65) / cell, imageWidth, imageHeight);
    }
    const pixels = sampleCtx.getImageData(0, 0, columns, rows).data;
    tiles = [];
    restingCtx.fillStyle = '#171917';
    restingCtx.fillRect(0, 0, width, height);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const index = (y * columns + x) * 4;
        const variation = .98 + Math.sin(x * 13.7 + y * 5.3) * .025;
        const r = Math.round(pixels[index] * variation);
        const g = Math.round(pixels[index + 1] * variation);
        const b = Math.round(pixels[index + 2] * variation);
        const tile = { x: (x + .5) * cell, y: (y + .5) * cell, dx: 0, dy: 0, vx: 0, vy: 0, color: `rgb(${r},${g},${b})`, light: `rgb(${Math.min(255, r + 20)},${Math.min(255, g + 18)},${Math.min(255, b + 16)})` };
        tiles.push(tile);
        restingCtx.fillStyle = tile.color;
        restingCtx.fillRect(tile.x - cell / 2 + .2, tile.y - cell / 2 + .2, cell - .4, cell - .4);
      }
    }
    draw(0);
    wake();
  };

  const draw = time => {
    frame = 0;
    const step = Math.min(2, Math.max(.5, (time - lastTime) / 16.667 || 1));
    lastTime = time;
    ctx.drawImage(resting, 0, 0, width, height);
    const active = pointer.active && !blocked();
    const radius = width < 650 ? 95 : 140;
    let moving = false;
    const displaced = [];
    for (const tile of tiles) {
      const px = tile.x - pointer.x;
      const py = tile.y - pointer.y;
      const nearby = active && Math.abs(px) < radius && Math.abs(py) < radius;
      if (!nearby && !tile.dx && !tile.dy && !tile.vx && !tile.vy) continue;
      const distance = Math.hypot(px, py);
      const influence = active ? Math.max(0, 1 - distance / radius) : 0;
      const strength = influence * influence;
      const wave = 1 + Math.sin(time * .004 - distance * .035) * .18;
      const force = motion.matches ? 0 : strength * 26 * wave;
      const tx = px / (distance || 1) * force;
      const ty = py / (distance || 1) * force;
      if (motion.matches) {
        tile.dx = tile.dy = tile.vx = tile.vy = 0;
      } else {
        tile.vx = (tile.vx + (tx - tile.dx) * .09 * step) * Math.pow(.73, step);
        tile.vy = (tile.vy + (ty - tile.dy) * .09 * step) * Math.pow(.73, step);
        tile.dx += tile.vx * step;
        tile.dy += tile.vy * step;
        if (!force && Math.abs(tile.dx) + Math.abs(tile.dy) + Math.abs(tile.vx) + Math.abs(tile.vy) < .12) {
          tile.dx = tile.dy = tile.vx = tile.vy = 0;
        }
      }
      if (Math.abs(tile.dx) + Math.abs(tile.dy) + Math.abs(tile.vx) + Math.abs(tile.vy) > .12) moving = true;
      if (!influence && !tile.dx && !tile.dy) continue;
      ctx.fillStyle = '#171917';
      ctx.fillRect(tile.x - cell / 2, tile.y - cell / 2, cell, cell);
      displaced.push({ tile, influence, strength });
    }
    for (const { tile, influence, strength } of displaced) {
      const angle = motion.matches ? 0 : strength * Math.sin(time * .003 + tile.x * .02) * .12;
      const size = cell - .4;
      ctx.fillStyle = influence > .5 ? tile.light : tile.color;
      if (influence > 0 && !motion.matches) {
        ctx.save();
        ctx.translate(tile.x + tile.dx, tile.y + tile.dy);
        ctx.rotate(angle);
        const scale = 1 + strength * .06;
        ctx.fillRect(-size * scale / 2, -size * scale / 2, size * scale, size * scale);
        ctx.restore();
      } else ctx.fillRect(tile.x + tile.dx - size / 2, tile.y + tile.dy - size / 2, size, size);
    }
    if (!blocked() && !motion.matches && (active || moving)) frame = requestAnimationFrame(draw);
  };

  function wake() {
    if (!frame && tiles.length && !blocked()) {
      lastTime = performance.now();
      frame = requestAnimationFrame(draw);
    }
  }
  const release = () => {
    clearTimeout(releaseTimer);
    pointer.active = false;
    wake();
  };
  const releaseTouch = () => {
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(release, 550);
  };
  hero.addEventListener('pointermove', event => {
    const bounds = hero.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.active = true;
    wake();
  }, { passive: true });
  hero.addEventListener('pointerdown', event => {
    clearTimeout(releaseTimer);
    const bounds = hero.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.active = true;
    wake();
  }, { passive: true });
  hero.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') release();
    else releaseTouch();
  });
  hero.addEventListener('pointercancel', release);
  window.addEventListener('pointerup', event => {
    if (event.pointerType !== 'mouse') releaseTouch();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release();
    else wake();
  });
  motion.addEventListener('change', wake);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible) pointer.active = false;
      wake();
    }).observe(hero);
  }
  new MutationObserver(() => {
    if (blocked()) pointer.active = false;
    else wake();
  }).observe(document.body, { attributes: true, attributeFilter: ['open'], subtree: true });
  const onResize = () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      pointer.active = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      resize();
    });
  };
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(hero);
  else window.addEventListener('resize', onResize, { passive: true });
  resize();
  Promise.all(canvas.dataset.images.split(',').map(src => new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  }))).then(loaded => {
    images = loaded;
    onResize();
  });
})();
