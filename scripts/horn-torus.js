const ROWS = 12;
const COLUMNS = 24;
const FACET_COUNT = ROWS * COLUMNS;
const TAU = Math.PI * 2;
const MIN_CAMERA_DISTANCE = 4.45;
const MAX_CAMERA_DISTANCE = 7.8;
const COLOURS = [
  [61, 232, 221],
  [61, 181, 255],
  [72, 112, 255],
  [119, 77, 255],
  [179, 75, 255],
  [244, 76, 211],
  [255, 65, 145],
  [255, 91, 94],
  [255, 139, 54],
  [255, 201, 55],
  [184, 228, 71],
  [68, 208, 128]
];

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function torusPoint(u, v) {
  const radius = 1 + Math.cos(v);
  return {
    x: radius * Math.cos(u),
    y: Math.sin(v),
    z: radius * Math.sin(u)
  };
}

function torusNormal(u, v) {
  return {
    x: Math.cos(u) * Math.cos(v),
    y: Math.sin(v),
    z: Math.sin(u) * Math.cos(v)
  };
}

function rotate(point, pitch, yaw) {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = point.x * cosY + point.z * sinY;
  const z1 = -point.x * sinY + point.z * cosY;
  const cosX = Math.cos(pitch);
  const sinX = Math.sin(pitch);
  return {
    x: x1,
    y: point.y * cosX - z1 * sinX,
    z: point.y * sinX + z1 * cosX
  };
}

function normalise(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

function polygonArea(points) {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    sum += points[index].x * next.y - next.x * points[index].y;
  }
  return Math.abs(sum) / 2;
}

function containsPoint(points, x, y) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const a = points[index];
    const b = points[previous];
    const crosses = ((a.y > y) !== (b.y > y)) &&
      (x < ((b.x - a.x) * (y - a.y)) / ((b.y - a.y) || Number.EPSILON) + a.x);
    if (crosses) inside = !inside;
  }
  return inside;
}

function distanceBetween(points) {
  const values = [...points.values()];
  if (values.length < 2) return 0;
  return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
}

function openSource(sourceId) {
  window.dispatchEvent(new CustomEvent('source:open', { detail: { sourceId } }));
}

export function initialiseHornTorus() {
  const canvas = document.querySelector('[data-horn-torus]');
  if (!canvas) return;

  const context = canvas.getContext('2d', { alpha: true });
  const title = document.querySelector('[data-facet-title]');
  const story = document.querySelector('[data-facet-story]');
  const address = document.querySelector('[data-facet-address]');
  const openButton = document.querySelector('[data-facet-open]');
  const shuffleButton = document.querySelector('[data-facet-shuffle]');
  const resetButton = document.querySelector('[data-torus-reset]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointers = new Map();
  const state = {
    cameraDistance: 5.35,
    pitch: 0.5,
    yaw: 0.72,
    selected: 0,
    hovered: -1,
    pointerPosition: null,
    dragging: null,
    pinchDistance: 0,
    visible: true,
    lastTime: 0
  };
  let facets = [];
  let projectedFacets = [];
  let animationFrame = 0;

  const describeFacet = (index) => {
    const facet = facets[index];
    if (!facet) return;
    state.selected = index;
    address.textContent = `Facet ${String(facet.number).padStart(3, '0')} of ${FACET_COUNT}`;
    title.textContent = facet.title;
    story.textContent = facet.story;
    openButton.dataset.source = facet.sourceId;
    openButton.textContent = facet.href ? 'Open this thread' : 'Read its place in the archive';
    canvas.setAttribute('aria-label', `Interactive horn torus. Facet ${facet.number}: ${facet.title}. Use arrow keys to move, Enter to open, and plus or minus to zoom while staying outside.`);
  };

  const facetAt = (clientX, clientY) => {
    const bounds = canvas.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    for (let index = projectedFacets.length - 1; index >= 0; index -= 1) {
      if (containsPoint(projectedFacets[index].points, x, y)) return projectedFacets[index].index;
    }
    return -1;
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const draw = (time = 0) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;

    if (!reducedMotion && state.visible && !state.dragging && pointers.size === 0) {
      const elapsed = state.lastTime ? Math.min(40, time - state.lastTime) : 16;
      state.yaw += elapsed * 0.000055;
    }
    state.lastTime = time;
    canvas.dataset.cameraDistance = state.cameraDistance.toFixed(3);

    context.clearRect(0, 0, width, height);
    const halo = context.createRadialGradient(width * 0.53, height * 0.46, 8, width * 0.53, height * 0.46, Math.min(width, height) * 0.62);
    halo.addColorStop(0, 'rgba(255,255,255,0.2)');
    halo.addColorStop(0.18, 'rgba(68,238,228,0.16)');
    halo.addColorStop(0.48, 'rgba(255,70,174,0.12)');
    halo.addColorStop(1, 'rgba(255,198,66,0)');
    context.fillStyle = halo;
    context.fillRect(0, 0, width, height);

    const focalLength = Math.min(width, height) * 1.18;
    const centreX = width * 0.5;
    const centreY = height * 0.5;
    const light = normalise({ x: -0.35, y: 0.72, z: 0.94 });
    const polygons = [];

    for (let row = 0; row < ROWS; row += 1) {
      const v0 = (row / ROWS) * TAU;
      const v1 = ((row + 1) / ROWS) * TAU;
      const centreV = ((row + 0.5) / ROWS) * TAU;
      for (let column = 0; column < COLUMNS; column += 1) {
        const index = row * COLUMNS + column;
        const u0 = (column / COLUMNS) * TAU;
        const u1 = ((column + 1) / COLUMNS) * TAU;
        const centreU = ((column + 0.5) / COLUMNS) * TAU;
        const worldCorners = [
          torusPoint(u0, v0),
          torusPoint(u0, v1),
          torusPoint(u1, v1),
          torusPoint(u1, v0)
        ].map((point) => rotate(point, state.pitch, state.yaw));
        const centre = rotate(torusPoint(centreU, centreV), state.pitch, state.yaw);
        const normal = normalise(rotate(torusNormal(centreU, centreV), state.pitch, state.yaw));
        const toCamera = normalise({ x: -centre.x, y: -centre.y, z: state.cameraDistance - centre.z });
        if ((normal.x * toCamera.x + normal.y * toCamera.y + normal.z * toCamera.z) <= 0) continue;

        const points = worldCorners.map((point) => {
          const depth = Math.max(0.2, state.cameraDistance - point.z);
          const perspective = focalLength / depth;
          return {
            x: centreX + point.x * perspective,
            y: centreY - point.y * perspective
          };
        });
        const brightness = clamp(normal.x * light.x + normal.y * light.y + normal.z * light.z, -0.25, 1);
        polygons.push({ index, row, column, points, depth: centre.z, brightness, area: polygonArea(points) });
      }
    }

    polygons.sort((a, b) => a.depth - b.depth);
    projectedFacets = polygons;
    if (state.pointerPosition && !state.dragging && pointers.size === 0) {
      state.hovered = facetAt(state.pointerPosition.x, state.pointerPosition.y);
    }

    polygons.forEach((polygon) => {
      const facet = facets[polygon.index];
      const colour = COLOURS[((facet?.sourceOrder || polygon.index) + polygon.row * 2 + polygon.column) % COLOURS.length];
      const brightness = (polygon.brightness + 0.25) / 1.25;
      const luminance = 30 + brightness * 43;
      const lightLevel = 0.62 + brightness * 0.38;
      const [red, green, blue] = colour.map((channel) => Math.round(channel * lightLevel));
      const selected = polygon.index === state.selected;
      const hovered = polygon.index === state.hovered;

      context.beginPath();
      polygon.points.forEach((point, pointIndex) => {
        if (pointIndex === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.closePath();
      context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${selected || hovered ? 0.98 : 0.92})`;
      context.fill();
      context.strokeStyle = selected
        ? 'rgba(255,255,255,1)'
        : hovered
          ? 'rgba(255,244,178,0.95)'
          : `rgba(9,7,15,${0.34 + (1 - brightness) * 0.34})`;
      context.lineWidth = selected ? 2.4 : hovered ? 1.8 : 0.75;
      context.stroke();

      if (polygon.area > 620) {
        const x = polygon.points.reduce((sum, point) => sum + point.x, 0) / polygon.points.length;
        const y = polygon.points.reduce((sum, point) => sum + point.y, 0) / polygon.points.length;
        context.fillStyle = luminance > 54 ? 'rgba(11,8,19,0.72)' : 'rgba(255,255,255,0.76)';
        context.font = `${selected ? 800 : 650} ${clamp(Math.sqrt(polygon.area) * 0.23, 8, 12)}px ui-monospace, Consolas, monospace`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(String(polygon.index + 1).padStart(3, '0'), x, y);
      }
    });

    if (!reducedMotion) animationFrame = requestAnimationFrame(draw);
  };

  const updateHover = (event) => {
    state.pointerPosition = { x: event.clientX, y: event.clientY };
    if (state.dragging || pointers.size) return;
    const hit = facetAt(event.clientX, event.clientY);
    if (hit === state.hovered) return;
    state.hovered = hit;
    canvas.style.cursor = hit >= 0 ? 'pointer' : 'grab';
    if (reducedMotion) draw();
  };

  canvas.addEventListener('pointerdown', (event) => {
    state.pointerPosition = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size === 1) {
      state.dragging = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        moved: false
      };
      canvas.style.cursor = 'grabbing';
    } else {
      state.dragging = null;
      state.pinchDistance = distanceBetween(pointers);
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) {
      updateHover(event);
      return;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      const nextDistance = distanceBetween(pointers);
      if (state.pinchDistance) {
        state.cameraDistance = clamp(
          state.cameraDistance * (state.pinchDistance / Math.max(nextDistance, 1)),
          MIN_CAMERA_DISTANCE,
          MAX_CAMERA_DISTANCE
        );
      }
      state.pinchDistance = nextDistance;
      if (reducedMotion) draw();
      return;
    }
    if (!state.dragging || state.dragging.id !== event.pointerId) return;
    const deltaX = event.clientX - state.dragging.x;
    const deltaY = event.clientY - state.dragging.y;
    state.yaw += deltaX * 0.008;
    state.pitch = clamp(state.pitch + deltaY * 0.007, -Math.PI * 0.9, Math.PI * 0.9);
    state.dragging.x = event.clientX;
    state.dragging.y = event.clientY;
    state.dragging.moved ||= Math.hypot(event.clientX - state.dragging.startX, event.clientY - state.dragging.startY) > 6;
    if (reducedMotion) draw();
  });

  const releasePointer = (event) => {
    const tap = state.dragging?.id === event.pointerId && !state.dragging.moved;
    pointers.delete(event.pointerId);
    if (tap) {
      const hit = facetAt(event.clientX, event.clientY);
      if (hit >= 0 && facets[hit]) {
        describeFacet(hit);
        openSource(facets[hit].sourceId);
      }
    }
    state.dragging = null;
    state.pinchDistance = pointers.size >= 2 ? distanceBetween(pointers) : 0;
    canvas.style.cursor = state.hovered >= 0 ? 'pointer' : 'grab';
    if (reducedMotion) draw();
  };

  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('pointerleave', () => {
    if (!pointers.size) {
      state.pointerPosition = null;
      state.hovered = -1;
      canvas.style.cursor = 'grab';
      if (reducedMotion) draw();
    }
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    state.cameraDistance = clamp(state.cameraDistance * Math.exp(event.deltaY * 0.001), MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE);
    if (reducedMotion) draw();
  }, { passive: false });

  canvas.addEventListener('keydown', (event) => {
    const row = Math.floor(state.selected / COLUMNS);
    const column = state.selected % COLUMNS;
    let next = state.selected;
    if (event.key === 'ArrowRight') next = row * COLUMNS + ((column + 1) % COLUMNS);
    if (event.key === 'ArrowLeft') next = row * COLUMNS + ((column - 1 + COLUMNS) % COLUMNS);
    if (event.key === 'ArrowDown') next = ((row + 1) % ROWS) * COLUMNS + column;
    if (event.key === 'ArrowUp') next = ((row - 1 + ROWS) % ROWS) * COLUMNS + column;
    if (event.key === '+' || event.key === '=') state.cameraDistance = clamp(state.cameraDistance - 0.35, MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE);
    if (event.key === '-') state.cameraDistance = clamp(state.cameraDistance + 0.35, MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (facets[state.selected]) openSource(facets[state.selected].sourceId);
      return;
    }
    if (next !== state.selected || ['+', '=', '-'].includes(event.key)) {
      event.preventDefault();
      describeFacet(next);
      if (reducedMotion) draw();
    }
  });

  openButton?.addEventListener('click', () => {
    const facet = facets[state.selected];
    if (facet) openSource(facet.sourceId);
  });
  shuffleButton?.addEventListener('click', () => {
    describeFacet((state.selected + 17) % FACET_COUNT);
    state.yaw += 0.42;
    if (reducedMotion) draw();
  });
  resetButton?.addEventListener('click', () => {
    state.cameraDistance = 5.35;
    state.pitch = 0.5;
    state.yaw = 0.72;
    describeFacet(0);
    if (reducedMotion) draw();
  });

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (reducedMotion) draw();
  });
  resizeObserver.observe(canvas);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
  }, { threshold: 0.02 });
  visibilityObserver.observe(canvas);

  fetch('data/facets.json')
    .then((response) => {
      if (!response.ok) throw new Error('The facet map could not be loaded.');
      return response.json();
    })
    .then((records) => {
      if (!Array.isArray(records) || records.length !== FACET_COUNT) throw new Error('The horn torus needs exactly 288 facets.');
      facets = records;
      describeFacet(0);
      canvas.dataset.hornTorusReady = 'true';
      resize();
      draw();
    })
    .catch((error) => {
      title.textContent = 'The torus is resting';
      story.textContent = error.message;
      openButton.hidden = true;
    });

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
  }, { once: true });
}
