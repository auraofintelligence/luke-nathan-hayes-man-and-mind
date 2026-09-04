import { initialiseNavigation } from './navigation.js';
import { initialisePerspective } from './perspective.js';
import { initialiseEvidenceLens } from './evidence-lens.js';
import { initialiseSourceDrawer } from './source-drawer.js';
import { initialiseAudienceDoors } from './audience.js';
import { initialiseMirrorBall } from './mirror-ball.js';
import { initialiseSourceRoom } from './source-room.js';
import { initialiseAdultGateway } from './adult-gateway.js';

initialiseNavigation();
initialisePerspective();
initialiseEvidenceLens();
initialiseSourceDrawer();
initialiseAudienceDoors();
initialiseMirrorBall();
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
