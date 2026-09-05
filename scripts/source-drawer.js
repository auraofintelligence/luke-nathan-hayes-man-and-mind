let registerPromise;
let dialogElements;

function loadRegister() {
  if (!registerPromise) {
    registerPromise = fetch('sources/register.json?v=20260905a').then((response) => {
      if (!response.ok) throw new Error('The source register could not be loaded.');
      return response.json();
    });
  }
  return registerPromise;
}

function sourceStory(record) {
  const sentences = [];
  if (record.status) sentences.push(`${record.status}.`);
  if (record.authorship) sentences.push(`${record.authorship}.`);

  if (record.availability === 'public-link') {
    sentences.push('This thread is already public and can be opened from here.');
  } else if (record.availability === 'published-source') {
    sentences.push('Luke chose to show this source on this site.');
  } else if (record.availability === 'local-reviewed-candidate') {
    sentences.push('The original is on this laptop. Its place in the story is public here, while the complete file stays in Luke\'s working archive.');
  } else if (record.availability === 'missing-locally') {
    sentences.push('This belongs to Luke\'s wider archive, but the original file was not on this laptop for this build.');
  }

  if (record.checkedOn) sentences.push(`The public link was last checked on ${record.checkedOn}.`);
  return sentences.join(' ');
}

export async function openSourceRecord(sourceId) {
  if (!dialogElements || !sourceId) return;
  const { dialog, id, title, body, context, filename, link } = dialogElements;

  try {
    const register = await loadRegister();
    const record = register.find((entry) => entry.id === sourceId);
    if (!record) throw new Error('This thread has not reached the public source map yet.');

    id.textContent = record.id;
    title.textContent = record.title;
    body.textContent = record.notes || 'This source is present in Luke\'s working record.';
    context.textContent = sourceStory(record);

    const localFilename = record.availability !== 'public-link' ? record.location : '';
    filename.textContent = localFilename ? `Archive name: ${localFilename}` : '';
    filename.hidden = !localFilename;

    const publicUrl = record.url || record.publicPath || '';
    if (publicUrl) {
      link.href = publicUrl;
      link.hidden = false;
      link.textContent = record.url ? 'Open the live work' : 'See the source in this site';
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
    id.textContent = 'Source thread';
    title.textContent = 'This thread is still loose';
    body.textContent = error.message;
    context.textContent = '';
    filename.hidden = true;
    link.hidden = true;
    dialog.showModal();
  }
}

export function initialiseSourceDrawer() {
  const dialog = document.querySelector('[data-source-dialog]');
  if (!dialog) return;

  dialogElements = {
    dialog,
    id: dialog.querySelector('[data-dialog-id]'),
    title: dialog.querySelector('[data-dialog-title]'),
    body: dialog.querySelector('[data-dialog-body]'),
    context: dialog.querySelector('[data-dialog-context]'),
    filename: dialog.querySelector('[data-dialog-filename]'),
    link: dialog.querySelector('[data-dialog-link]')
  };

  dialog.querySelector('[data-source-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-source]');
    if (!button) return;
    event.preventDefault();
    openSourceRecord(button.dataset.source);
  });

  window.addEventListener('source:open', (event) => {
    openSourceRecord(event.detail?.sourceId);
  });
}
