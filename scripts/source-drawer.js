let registerPromise;

function loadRegister() {
  if (!registerPromise) {
    registerPromise = fetch('sources/register.json').then((response) => {
      if (!response.ok) throw new Error('Source register could not be loaded.');
      return response.json();
    });
  }
  return registerPromise;
}

function addMeta(list, label, value) {
  if (!value) return;
  const item = document.createElement('li');
  item.textContent = `${label}: ${value}`;
  list.append(item);
}

export function initialiseSourceDrawer() {
  const dialog = document.querySelector('[data-source-dialog]');
  if (!dialog) return;

  const closeButton = dialog.querySelector('[data-source-close]');
  closeButton?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.querySelectorAll('[data-source]').forEach((button) => {
    button.addEventListener('click', async () => {
      const title = dialog.querySelector('[data-dialog-title]');
      const body = dialog.querySelector('[data-dialog-body]');
      const id = dialog.querySelector('[data-dialog-id]');
      const meta = dialog.querySelector('[data-dialog-meta]');
      const link = dialog.querySelector('[data-dialog-link]');

      try {
        const register = await loadRegister();
        const record = register.find((entry) => entry.id === button.dataset.source);
        if (!record) throw new Error('This source is not in the register yet.');

        id.textContent = record.id;
        title.textContent = record.title;
        body.textContent = record.notes || 'No additional note is recorded.';
        meta.replaceChildren();
        addMeta(meta, 'Type', record.type || record.kind);
        addMeta(meta, 'Status', record.status);
        addMeta(meta, 'Authorship', record.authorship);
        addMeta(meta, 'Availability', (record.availability || '').replaceAll('-', ' '));
        addMeta(meta, 'First used in chapter', record.primaryPage);
        if (!record.id.startsWith('U')) addMeta(meta, 'Registered filename', record.location);
        addMeta(meta, 'Link checked', record.checkedOn);

        const publicUrl = record.url || (record.publicPath ? record.publicPath : '');
        if (publicUrl) {
          link.href = publicUrl;
          link.hidden = false;
          link.textContent = record.url ? 'Open live source' : 'Open source file';
          if (record.url) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          } else {
            link.removeAttribute('target');
            link.removeAttribute('rel');
          }
        } else {
          link.hidden = true;
        }
        dialog.showModal();
      } catch (error) {
        id.textContent = 'Source note';
        title.textContent = 'The source card is unavailable';
        body.textContent = error.message;
        meta.replaceChildren();
        link.hidden = true;
        dialog.showModal();
      }
    });
  });
}
