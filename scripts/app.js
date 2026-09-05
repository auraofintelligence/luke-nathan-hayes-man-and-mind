import { initialiseNavigation } from './navigation.js?v=20260905a';
import { initialiseSourceDrawer } from './source-drawer.js?v=20260905-my-voice';
import { initialiseAudienceDoors } from './audience.js?v=20260905a';
import { initialiseHornTorus } from './horn-torus.js?v=20260905-my-voice';
import { initialiseSourceRoom } from './source-room.js?v=20260905a';
import { initialiseAdultGateway } from './adult-gateway.js?v=20260905a';

initialiseNavigation();
initialiseSourceDrawer();
initialiseAudienceDoors();
initialiseHornTorus();
initialiseSourceRoom();
initialiseAdultGateway();

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
