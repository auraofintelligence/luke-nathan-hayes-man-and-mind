const STORAGE_KEY = 'mind-behind-perspective';

export function initialisePerspective() {
  const buttons = [...document.querySelectorAll('[data-perspective]')];
  if (!buttons.length) return;

  const allowed = new Set(['both', 'first', 'third']);
  let current = localStorage.getItem(STORAGE_KEY) || 'both';
  if (!allowed.has(current)) current = 'both';

  const setPerspective = (value) => {
    document.body.dataset.perspective = value;
    localStorage.setItem(STORAGE_KEY, value);
    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.perspective === value));
    });
  };

  buttons.forEach((button) => button.addEventListener('click', () => setPerspective(button.dataset.perspective)));
  setPerspective(current);
}
