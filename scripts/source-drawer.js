let recordsPromise;

function loadRecords() {
  recordsPromise ||= fetch('sources/register.json?v=20260906-preview')
    .then(response => { if (!response.ok) throw new Error('Source register unavailable'); return response.json(); });
  return recordsPromise;
}

function closeDialog(dialog) { if (dialog?.open) dialog.close(); }

export async function initialiseSourceDrawer() {
  const controls = document.querySelectorAll('[data-source]');
  const dialog = document.querySelector('[data-source-dialog]');
  if (!controls.length || !dialog) return;
  const preview = dialog.querySelector('[data-source-preview]');
  const title = dialog.querySelector('[data-dialog-title]');
  const link = dialog.querySelector('[data-dialog-link]');
  dialog.querySelector('[data-source-close]')?.addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(dialog); });
  controls.forEach(control => control.addEventListener('click', async () => {
    try {
      const records = await loadRecords();
      const record = records.find(item => item.id === control.dataset.source);
      const href = record?.url || record?.publicPath;
      if (!href) return;
      title.textContent = record.title || 'Preview';
      preview.replaceChildren();
      const isImage = record.type === 'image' || /\.(avif|gif|jpe?g|png|webp)$/i.test(href);
      const frame = document.createElement(isImage ? 'img' : 'iframe');
      frame.src = href;
      frame.title = record.title || 'Source preview';
      frame.loading = 'lazy';
      if (!isImage) frame.setAttribute('allow', 'fullscreen');
      preview.append(frame);
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.hidden = false;
      dialog.showModal();
    } catch (error) { console.warn(error); }
  }));
}
