const LABELS = ['lived', 'built', 'submitted', 'proposed', 'modelled', 'frontier', 'story', 'open-question'];

export function initialiseEvidenceLens() {
  const controls = [...document.querySelectorAll('[data-evidence-toggle]')];
  if (!controls.length) return;

  const active = new Set(LABELS);
  const status = document.querySelector('[data-evidence-status]');
  const update = () => {
    let visible = 0;
    document.querySelectorAll('[data-evidence-card]').forEach((card) => {
      card.hidden = !active.has(card.dataset.evidenceCard);
      if (!card.hidden) visible += 1;
    });
    controls.forEach((button) => {
      button.setAttribute('aria-pressed', String(active.has(button.dataset.evidenceToggle)));
    });
    if (status) status.textContent = `${visible} evidence card${visible === 1 ? '' : 's'} shown.`;
  };

  controls.forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.evidenceToggle;
      if (active.has(value)) active.delete(value);
      else active.add(value);
      update();
    });
  });
  update();
}
