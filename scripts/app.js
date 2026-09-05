import { initialiseNavigation } from './navigation.js?v=20260905a';
import { initialiseSourceDrawer } from './source-drawer.js?v=20260905a';
import { initialiseAudienceDoors } from './audience.js?v=20260905a';
import { initialiseHornTorus } from './horn-torus.js?v=20260905a';
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
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      card.style.transform = `perspective(800px) rotateX(${y * -2.5}deg) rotateY(${x * 3.5}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('transform');
    });
  });
}
