// Abre as imagens dos cards num overlay em vez de nova aba.
// Setas ←/→ navegam entre as imagens do mesmo card; Esc ou clique fora fecha.
(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.innerHTML = `
    <button class="lb-btn lb-close" aria-label="Fechar">×</button>
    <button class="lb-btn lb-prev" aria-label="Anterior">‹</button>
    <img alt="">
    <button class="lb-btn lb-next" aria-label="Próxima">›</button>
    <span class="lb-count"></span>`;
  document.body.append(dialog);

  const img = dialog.querySelector('img');
  const count = dialog.querySelector('.lb-count');
  let items = [];
  let index = 0;

  // amplia imagens pequenas (prints de 256px) até caber na tela, no máximo 3x
  const fit = () => {
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w) return;
    const scale = Math.min((innerWidth * 0.92) / w, (innerHeight * 0.86) / h, 3);
    img.style.width = `${Math.round(w * scale)}px`;
    img.style.height = `${Math.round(h * scale)}px`;
  };
  img.addEventListener('load', fit);
  addEventListener('resize', () => dialog.open && fit());

  const show = (i) => {
    index = (i + items.length) % items.length;
    img.src = items[index].href;
    img.alt = items[index].querySelector('img')?.alt || '';
    count.textContent = items.length > 1 ? `${index + 1} / ${items.length}` : '';
    dialog.classList.toggle('single', items.length < 2);
  };

  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('.gallery a');
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();
    items = [...a.closest('.card').querySelectorAll('.gallery a')];
    show(items.indexOf(a));
    dialog.showModal();
  });

  dialog.querySelector('.lb-prev').onclick = () => show(index - 1);
  dialog.querySelector('.lb-next').onclick = () => show(index + 1);
  dialog.querySelector('.lb-close').onclick = () => dialog.close();
  dialog.addEventListener('click', (ev) => { if (ev.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') show(index - 1);
    if (ev.key === 'ArrowRight') show(index + 1);
  });
  dialog.addEventListener('close', () => { img.src = ''; });
})();
