export function initialiseNavigation() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const menuButton = document.querySelector('[data-menu-button]');
  const drawer = document.querySelector('[data-nav-drawer]');
  const closeButton = document.querySelector('[data-menu-close]');
  const backdrop = document.querySelector('[data-nav-backdrop]');
  const topButton = document.querySelector('[data-back-to-top]');

  const setMenu = (open) => {
    if (!drawer || !backdrop || !menuButton) return;
    drawer.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    drawer.setAttribute('aria-hidden', String(!open));
    drawer.inert = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) closeButton?.focus();
  };

  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  const closeMenu = () => {
    setMenu(false);
    menuButton?.focus();
  };

  closeButton?.addEventListener('click', closeMenu);
  backdrop?.addEventListener('click', closeMenu);

  window.addEventListener('scroll', () => {
    topButton?.classList.toggle('is-visible', window.scrollY > 700);
  }, { passive: true });

  topButton?.addEventListener('click', () => {
    const top = document.querySelector('#top');
    top?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    top?.focus({ preventScroll: true });
  });

  if (window.location.hash) {
    requestAnimationFrame(() => {
      const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      target?.scrollIntoView({ block: 'start' });
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && drawer?.classList.contains('is-open')) {
      const focusable = [...drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
      return;
    }

    if (event.key === 'Escape' && drawer?.classList.contains('is-open')) {
      setMenu(false);
      menuButton?.focus();
      return;
    }

    const interactive = event.target instanceof Element
      && event.target.closest('a, button, input, textarea, select, summary, [contenteditable="true"], [role="button"]');
    if (interactive || event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.key === 'ArrowLeft'
      ? document.querySelector('[data-previous-page]')
      : event.key === 'ArrowRight'
        ? document.querySelector('[data-next-page]')
        : null;

    if (target) {
      event.preventDefault();
      window.location.href = target.href;
    }
  });
}
