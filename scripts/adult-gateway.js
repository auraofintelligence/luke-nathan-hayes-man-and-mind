export function initialiseAdultGateway() {
  const dialog = document.querySelector('[data-adult-dialog]');
  if (!dialog) return;

  const continueLink = dialog.querySelector('[data-adult-continue]');
  const close = () => dialog.close();

  dialog.querySelector('[data-adult-close]')?.addEventListener('click', close);
  dialog.querySelector('[data-adult-back]')?.addEventListener('click', close);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });

  document.querySelectorAll('[data-adult-link]').forEach((button) => {
    button.addEventListener('click', () => {
      continueLink.href = button.dataset.adultLink;
      dialog.showModal();
    });
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="grey-area-commons"]');
    if (!link || link.matches('[data-adult-continue]')) return;
    event.preventDefault();
    continueLink.href = link.href;
    dialog.showModal();
  });
}
