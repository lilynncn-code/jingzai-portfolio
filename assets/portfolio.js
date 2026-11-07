(() => {
  const cards = [...document.querySelectorAll('.project-card')];
  const filters = [...document.querySelectorAll('.filter-button')];
  const counter = document.querySelector('.results-count');
  const dialog = document.querySelector('#project-dialog');
  const content = document.querySelector('#dialog-content');
  const closeButton = document.querySelector('.close-dialog');
  const templates = new Map([...document.querySelectorAll('template[data-project]')].map(template => [template.dataset.project, template]));
  const projectIds = [...templates.keys()];
  let lastTrigger = null;
  let previousHash = '#work';
  let activeId = null;
  const imageDialog = document.querySelector('#image-dialog');
  const largeImage = document.querySelector('#large-image');
  const imageScroll = document.querySelector('.image-scroll');
  const sizeButton = document.querySelector('.toggle-image-size');
  let gallery = [];
  let imageIndex = 0;
  let imageTrigger = null;
  const showImage = index => {
    imageIndex = (index + gallery.length) % gallery.length;
    const item = gallery[imageIndex];
    largeImage.src = item.href;
    largeImage.alt = item.querySelector('img').alt;
    document.querySelector('#image-title').textContent = content.querySelector('#detail-title').textContent;
    document.querySelector('#large-caption').textContent = largeImage.alt;
    document.querySelector('.image-position').textContent = `${imageIndex + 1} / ${gallery.length}`;
    document.querySelector('.original-image').href = item.href;
    imageScroll.classList.remove('full-size');
    imageScroll.scrollTop = 0;
    sizeButton.textContent = '查看细节';
    sizeButton.setAttribute('aria-pressed', 'false');
    for (const button of imageDialog.querySelectorAll('.previous-image, .next-image')) button.hidden = gallery.length < 2;
    if (!imageDialog.open) imageDialog.showModal();
  };
  document.querySelector('.close-image').addEventListener('click', () => imageDialog.close());
  document.querySelector('.previous-image').addEventListener('click', () => showImage(imageIndex - 1));
  document.querySelector('.next-image').addEventListener('click', () => showImage(imageIndex + 1));
  sizeButton.addEventListener('click', () => {
    const full = imageScroll.classList.toggle('full-size');
    sizeButton.setAttribute('aria-pressed', String(full));
    sizeButton.textContent = full ? '适合屏幕' : '查看细节';
  });
  imageDialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showImage(imageIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  imageDialog.addEventListener('close', () => imageTrigger?.focus({ preventScroll: true }));

  filters.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    let visible = 0;
    cards.forEach(card => {
      const show = category === '全部' || card.dataset.category === category;
      card.hidden = !show;
      if (show) visible += 1;
    });
    counter.textContent = category === '全部' ? `显示全部 ${visible} 个项目` : `显示 ${visible} 个${category}项目`;
  }));

  const showProject = (id, trigger) => {
    const template = templates.get(id);
    if (!template) return;
    if (imageDialog.open) imageDialog.close();
    if (!dialog.open) {
      if (trigger) lastTrigger = trigger;
      if (!location.hash.startsWith('#project-')) previousHash = location.hash || '#work';
    }
    activeId = id;
    content.replaceChildren(template.content.cloneNode(true));
    document.body.classList.add('dialog-open');
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    closeButton.focus({ preventScroll: true });
  };

  const syncHash = () => {
    const id = location.hash.startsWith('#project-') ? location.hash.slice(9) : null;
    if (templates.has(id)) showProject(id);
    else if (dialog.open) dialog.close();
  };

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-open-project]');
    if (!trigger || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = trigger.dataset.openProject;
    if (!templates.has(id)) return;
    event.preventDefault();
    showProject(id, trigger);
    history.pushState({ project: id, portfolio: true }, '', `#project-${id}`);
  });

  const closeProject = () => {
    if (!dialog.open) return;
    if (history.state?.portfolio) history.back();
    else {
      history.replaceState(null, '', previousHash);
      dialog.close();
    }
  };

  closeButton.addEventListener('click', closeProject);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeProject();
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeProject();
  });
  dialog.addEventListener('close', () => {
    if (imageDialog.open) imageDialog.close();
    document.body.classList.remove('dialog-open');
    activeId = null;
    const target = lastTrigger || document.querySelector('#work-title');
    if (target && !target.closest('[hidden]')) {
      if (target.tagName === 'H2') target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  });
  content.addEventListener('click', event => {
    const picture = event.target.closest('[data-view-image]');
    if (picture && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      imageTrigger = picture;
      gallery = [...content.querySelectorAll('[data-view-image]')];
      showImage(gallery.indexOf(picture));
      return;
    }
    if (!event.target.closest('.next-project')) return;
    const index = projectIds.indexOf(activeId);
    const nextId = projectIds[(index + 1) % projectIds.length];
    history.replaceState({ project: nextId, portfolio: history.state?.portfolio === true }, '', `#project-${nextId}`);
    showProject(nextId);
  });
  window.addEventListener('popstate', syncHash);
  window.addEventListener('hashchange', syncHash);
  syncHash();
})();
