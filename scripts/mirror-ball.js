const FACET_LABELS = [
  'BODY', 'MIND', 'MEMORY', 'PLACE', 'WORK', 'LOVE', 'FAMILY', 'MUSIC', 'HUMOUR',
  'LAW', 'CIVICS', 'SCIENCE', 'TRAVEL', 'COUNTRY', 'EARTH', 'SPACE', 'MYSTERY', 'FUTURE'
];

export function initialiseMirrorBall() {
  const canvas = document.querySelector('[data-mirror-ball]');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = { x: 0.68, y: 0.28, active: false };
  let rotation = 0;
  let frame;

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const colourFor = (x, y, light) => {
    const hue = (190 + x * 125 + y * 42 + rotation * 18) % 360;
    const saturation = 72 + light * 18;
    const luminance = 13 + light * 56;
    return `hsl(${hue} ${saturation}% ${luminance}%)`;
  };

  const draw = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const radius = Math.min(width, height) * 0.39;
    const centreX = width * 0.5;
    const centreY = height * 0.48;
    const lightX = pointer.active ? pointer.x * width : width * 0.7;
    const lightY = pointer.active ? pointer.y * height : height * 0.26;

    context.clearRect(0, 0, width, height);

    const halo = context.createRadialGradient(centreX, centreY, radius * 0.4, centreX, centreY, radius * 1.5);
    halo.addColorStop(0, 'rgba(124, 60, 255, 0.28)');
    halo.addColorStop(0.52, 'rgba(255, 63, 159, 0.11)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = halo;
    context.beginPath();
    context.arc(centreX, centreY, radius * 1.55, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.beginPath();
    context.arc(centreX, centreY, radius, 0, Math.PI * 2);
    context.clip();

    const rows = 12;
    for (let row = 0; row < rows; row += 1) {
      const y0 = -1 + (row / rows) * 2;
      const y1 = -1 + ((row + 1) / rows) * 2;
      const middleY = (y0 + y1) / 2;
      const halfWidth = Math.sqrt(Math.max(0, 1 - middleY * middleY));
      const columns = Math.max(6, Math.round(18 * halfWidth));

      for (let column = 0; column < columns; column += 1) {
        const phase = rotation + (row % 2 ? 0.5 : 0);
        const x0 = -halfWidth + ((column + phase) / columns) * halfWidth * 2;
        const x1 = -halfWidth + ((column + 1 + phase) / columns) * halfWidth * 2;
        const wrapX0 = ((x0 + halfWidth) % (halfWidth * 2)) - halfWidth;
        const wrapX1 = ((x1 + halfWidth) % (halfWidth * 2)) - halfWidth;
        if (wrapX1 <= wrapX0) continue;

        const px = centreX + ((wrapX0 + wrapX1) / 2) * radius;
        const py = centreY + middleY * radius;
        const distance = Math.hypot(px - lightX, py - lightY) / (radius * 1.4);
        const light = Math.max(0, 1 - distance);

        context.fillStyle = colourFor((wrapX0 + wrapX1) / 2, middleY, light);
        context.strokeStyle = `rgba(255,255,255,${0.09 + light * 0.38})`;
        context.lineWidth = 0.8;
        context.beginPath();
        context.moveTo(centreX + wrapX0 * radius, centreY + y0 * radius);
        context.lineTo(centreX + wrapX1 * radius, centreY + y0 * radius);
        context.lineTo(centreX + wrapX1 * radius, centreY + y1 * radius);
        context.lineTo(centreX + wrapX0 * radius, centreY + y1 * radius);
        context.closePath();
        context.fill();
        context.stroke();
      }
    }

    const shade = context.createRadialGradient(
      centreX - radius * 0.35,
      centreY - radius * 0.35,
      radius * 0.02,
      centreX,
      centreY,
      radius
    );
    shade.addColorStop(0, 'rgba(255,255,255,0.42)');
    shade.addColorStop(0.24, 'rgba(255,255,255,0.05)');
    shade.addColorStop(0.78, 'rgba(0,0,0,0.18)');
    shade.addColorStop(1, 'rgba(0,0,0,0.72)');
    context.fillStyle = shade;
    context.fillRect(centreX - radius, centreY - radius, radius * 2, radius * 2);
    context.restore();

    context.strokeStyle = 'rgba(255,255,255,0.5)';
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(centreX, centreY, radius, 0, Math.PI * 2);
    context.stroke();

    const labelRadius = radius * 1.16;
    context.font = '700 10px Segoe UI, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    FACET_LABELS.forEach((label, index) => {
      const angle = (index / FACET_LABELS.length) * Math.PI * 2 + rotation * 0.08 - Math.PI / 2;
      const x = centreX + Math.cos(angle) * labelRadius;
      const y = centreY + Math.sin(angle) * labelRadius;
      context.fillStyle = index % 3 === 0 ? '#ffc85a' : index % 3 === 1 ? '#4deeea' : '#e8ddff';
      context.fillText(label, x, y);
    });

    if (!reducedMotion) {
      rotation = (rotation + 0.0022 + window.scrollY * 0.0000008) % 1;
      frame = requestAnimationFrame(draw);
    }
  };

  canvas.addEventListener('pointermove', (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - bounds.left) / bounds.width;
    pointer.y = (event.clientY - bounds.top) / bounds.height;
    pointer.active = true;
  });
  canvas.addEventListener('pointerleave', () => { pointer.active = false; });

  const observer = new ResizeObserver(() => {
    resize();
    if (reducedMotion) draw();
  });
  observer.observe(canvas);
  resize();
  draw();

  window.addEventListener('pagehide', () => cancelAnimationFrame(frame), { once: true });
}
