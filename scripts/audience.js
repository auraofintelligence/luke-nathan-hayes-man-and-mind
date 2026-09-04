const STORAGE_KEY = 'mind-behind-audience-door';

export function initialiseAudienceDoors() {
  const buttons = [...document.querySelectorAll('[data-door]')];
  const ribbon = document.querySelector('[data-recommendation-ribbon]');
  const currentPage = document.body.dataset.page;
  const params = new URLSearchParams(window.location.search);
  const queryDoor = params.get('door');
  const selected = queryDoor || localStorage.getItem(STORAGE_KEY);
  const routeMap = window.__AUDIENCE_ROUTES__ || {};

  const reflectDoor = (door, record) => {
    if (!door || !record) return;
    localStorage.setItem(STORAGE_KEY, door);
    document.body.dataset.audience = door;
    const routes = record.pages || [];
    const routeIndex = routes.findIndex((route) => route.id === currentPage);
    if (!ribbon || routeIndex < 0) return;

    const summary = document.createElement('span');
    summary.textContent = `Recommended path: ${record.label}. Stop ${routeIndex + 1} of ${routes.length}.`;
    ribbon.replaceChildren(summary);

    const addRouteLink = (label, route) => {
      if (!route) return;
      const link = document.createElement('a');
      link.className = 'recommendation-link';
      link.href = `${route.file}?door=${encodeURIComponent(door)}`;
      link.textContent = `${label}: ${route.title}`;
      ribbon.append(link);
    };

    addRouteLink('Previous stop', routes[routeIndex - 1]);
    addRouteLink('Next stop', routes[routeIndex + 1]);
    if (routeIndex === routes.length - 1) addRouteLink('Choose another path', { file: 'choose-your-door.html', title: 'Why are you here?' });
    ribbon.classList.add('is-visible');
  };

  buttons.forEach((button) => {
    const routes = (button.dataset.routes || '').split(',').filter(Boolean);
    button.addEventListener('click', () => {
      const door = button.dataset.door;
      localStorage.setItem(STORAGE_KEY, door);
      const firstRoute = routeMap[door]?.pages?.[0]?.file || routes[0] || 'index.html';
      window.location.href = `${firstRoute}?door=${encodeURIComponent(door)}`;
    });
  });

  if (selected) reflectDoor(selected, routeMap[selected]);
}
