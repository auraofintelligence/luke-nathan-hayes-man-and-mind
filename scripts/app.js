import { initialiseNavigation } from './navigation.js?v=20260905a';
import { initialiseSourceDrawer } from './source-drawer.js?v=20260906-direct-media';
import { initialiseAudienceDoors } from './audience.js?v=20260905a';
import { initialiseHornTorus } from './horn-torus.js?v=20260906-direct-media';
import { initialiseSourceRoom } from './source-room.js?v=20260905a';
import { initialiseAdultGateway } from './adult-gateway.js?v=20260905a';

initialiseNavigation();
initialiseSourceDrawer();
initialiseAudienceDoors();
initialiseHornTorus();
initialiseSourceRoom();
initialiseAdultGateway();

document.querySelectorAll('[data-song-version]').forEach((select) => {
  select.addEventListener('change', () => {
    const card = select.closest('.soundtrack-card');
    const video = card.querySelector('video');
    const option = select.selectedOptions[0];
    video.pause();
    video.src = option.value;
    video.poster = option.dataset.poster;
    video.setAttribute('aria-label', `We Go Beyond lyric video, ${option.textContent}`);
    card.querySelector('[data-video-open]').href = option.value;
    video.load();
  });
});

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('.story-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--shine-x', `${event.clientX - bounds.left}px`);
      card.style.setProperty('--shine-y', `${event.clientY - bounds.top}px`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--shine-x');
      card.style.removeProperty('--shine-y');
    });
  });
}
