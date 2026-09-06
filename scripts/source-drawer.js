// Legacy hero-source controls become direct links, without a description popup.
export async function initialiseSourceDrawer() {
  const controls = document.querySelectorAll('[data-source]');
  if (!controls.length) return;
  try {
    const response = await fetch('sources/register.json?v=20260906-direct-media');
    if (!response.ok) throw new Error('Source links unavailable');
    const records = await response.json();
    controls.forEach(control => {
      const record = records.find(item => item.id === control.dataset.source);
      const href = record?.url || record?.publicPath;
      if (!href) { control.disabled = true; control.textContent = 'Source file not yet available'; return; }
      const link = document.createElement('a');
      link.className = control.className;
      link.textContent = control.textContent;
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      control.replaceWith(link);
    });
  } catch { controls.forEach(control => { control.disabled = true; control.textContent = 'Source links unavailable'; }); }
}
