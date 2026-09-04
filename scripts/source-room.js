export function initialiseSourceRoom() {
  const search = document.querySelector('[data-source-search]');
  const select = document.querySelector('[data-source-filter]');
  const count = document.querySelector('[data-source-count]');
  const records = [...document.querySelectorAll('[data-source-record]')];
  if (!records.length) return;

  const update = () => {
    const query = (search?.value || '').trim().toLowerCase();
    const filter = select?.value || 'all';
    let visible = 0;
    records.forEach((record) => {
      const matchesText = !query || record.textContent.toLowerCase().includes(query);
      const matchesFilter = filter === 'all' || record.dataset.sourceType === filter || record.dataset.availability === filter;
      record.hidden = !(matchesText && matchesFilter);
      if (!record.hidden) visible += 1;
    });
    if (count) count.textContent = `${visible} source${visible === 1 ? '' : 's'} shown`;
  };

  search?.addEventListener('input', update);
  select?.addEventListener('change', update);
  update();
}
