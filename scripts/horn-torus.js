const ROWS = 12;
const COLUMNS = 24;
const FACET_COUNT = ROWS * COLUMNS;
const TAU = Math.PI * 2;
const MIN_CAMERA_DISTANCE = 4.45;
const MAX_CAMERA_DISTANCE = 7.8;
const CONTENT_ROWS = [0, 1, 2, 3, 8, 9, 10, 11];
const COLOURS = [
  [103, 227, 210],
  [89, 190, 222],
  [118, 148, 224],
  [164, 125, 222],
  [214, 143, 213],
  [236, 172, 195],
  [239, 214, 159],
  [209, 222, 163],
  [142, 224, 192],
  [118, 211, 219],
  [189, 225, 232],
  [225, 238, 220]
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

function facetCentre(points) {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  };
}

function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function facetFrame(points) {
  const left = {
    x: (points[0].x + points[1].x) / 2,
    y: (points[0].y + points[1].y) / 2
  };
  const right = {
    x: (points[3].x + points[2].x) / 2,
    y: (points[3].y + points[2].y) / 2
  };
  const top = {
    x: (points[0].x + points[3].x) / 2,
    y: (points[0].y + points[3].y) / 2
  };
  const bottom = {
    x: (points[1].x + points[2].x) / 2,
    y: (points[1].y + points[2].y) / 2
  };
  let angle = Math.atan2(right.y - left.y, right.x - left.x);
  if (angle > Math.PI / 2) angle -= Math.PI;
  if (angle < -Math.PI / 2) angle += Math.PI;
  return {
    width: pointDistance(left, right),
    height: pointDistance(top, bottom),
    angle
  };
}

function tracePolygon(context, points) {
  context.beginPath();
  points.forEach((point, pointIndex) => {
    if (pointIndex === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
}

function drawCameraMark(context, x, y, size, colour) {
  const width = size * 0.92;
  const height = size * 0.62;
  context.save();
  context.strokeStyle = colour;
  context.fillStyle = colour;
  context.lineWidth = Math.max(1.2, size * 0.1);
  context.lineJoin = 'round';
  context.strokeRect(x - width / 2, y - height / 2 + size * 0.08, width, height);
  context.fillRect(x - width * 0.3, y - height / 2 - size * 0.02, width * 0.28, size * 0.12);
  context.beginPath();
  context.arc(x + size * 0.07, y + size * 0.08, size * 0.2, 0, TAU);
  context.stroke();
  context.beginPath();
  context.arc(x + width * 0.34, y - height * 0.24 + size * 0.08, size * 0.045, 0, TAU);
  context.fill();
  context.restore();
}

function drawDocumentMark(context, x, y, size, colour) {
  const width = size * 0.68;
  const height = size * 0.9;
  const fold = size * 0.22;
  context.save();
  context.strokeStyle = colour;
  context.lineWidth = Math.max(1.2, size * 0.095);
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(x - width / 2, y - height / 2);
  context.lineTo(x + width / 2 - fold, y - height / 2);
  context.lineTo(x + width / 2, y - height / 2 + fold);
  context.lineTo(x + width / 2, y + height / 2);
  context.lineTo(x - width / 2, y + height / 2);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.moveTo(x + width / 2 - fold, y - height / 2);
  context.lineTo(x + width / 2 - fold, y - height / 2 + fold);
  context.lineTo(x + width / 2, y - height / 2 + fold);
  context.stroke();
  context.beginPath();
  context.moveTo(x - width * 0.28, y + height * 0.03);
  context.lineTo(x + width * 0.28, y + height * 0.03);
  context.moveTo(x - width * 0.28, y + height * 0.25);
  context.lineTo(x + width * 0.18, y + height * 0.25);
  context.stroke();
  context.restore();
}

function drawWebFallback(context, x, y, size, colour) {
  context.save();
  context.strokeStyle = colour;
  context.lineWidth = Math.max(1.1, size * 0.08);
  context.beginPath();
  context.arc(x, y, size * 0.4, 0, TAU);
  context.moveTo(x - size * 0.39, y);
  context.lineTo(x + size * 0.39, y);
  context.moveTo(x, y - size * 0.39);
  context.bezierCurveTo(x - size * 0.22, y - size * 0.2, x - size * 0.22, y + size * 0.2, x, y + size * 0.39);
  context.moveTo(x, y - size * 0.39);
  context.bezierCurveTo(x + size * 0.22, y - size * 0.2, x + size * 0.22, y + size * 0.2, x, y + size * 0.39);
  context.stroke();
  context.restore();
}

function drawPlayMark(context, x, y, size) {
  context.save();
  context.fillStyle = 'rgba(10, 7, 20, 0.82)';
  context.beginPath();
  context.arc(x, y, size * 0.25, 0, TAU);
  context.fill();
  context.fillStyle = '#fffaf0';
  context.beginPath();
  context.moveTo(x - size * 0.06, y - size * 0.11);
  context.lineTo(x + size * 0.13, y);
  context.lineTo(x - size * 0.06, y + size * 0.11);
  context.closePath();
  context.fill();
  context.restore();
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
  const glimpse = document.querySelector('[data-facet-glimpse]');
  const preview = document.querySelector('[data-facet-preview]');
  const symbol = document.querySelector('[data-facet-symbol]');
  const sequence = document.querySelector('[data-facet-sequence]');
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
  let activeFacetIndexes = [];
  let projectedFacets = [];
  let animationFrame = 0;
  const iconImages = new Map();

  const loadIcon = (path) => {
    if (!path || iconImages.has(path)) return;
    const image = new Image();
    iconImages.set(path, image);
    image.addEventListener('load', () => {
      if (reducedMotion) draw();
    }, { once: true });
    image.addEventListener('error', () => {
      iconImages.set(path, null);
      if (reducedMotion) draw();
    }, { once: true });
    image.src = path;
  };

  const describeFacet = (index) => {
    const facet = facets[index];
    if (!facet?.interactive) return;
    state.selected = index;
    glimpse.dataset.type = facet.type;
    glimpse.classList.remove('has-preview', 'has-favicon');
    preview.hidden = true;
    preview.removeAttribute('src');
    symbol.dataset.type = facet.type;
    sequence.textContent = facet.typeNumber || '';

    if (facet.type === 'image') {
      address.textContent = facet.previewPath ? 'A picture held in this story' : 'A place kept for the wider picture archive';
      if (facet.previewPath) {
        preview.src = facet.previewPath;
        preview.hidden = false;
        glimpse.classList.add('has-preview');
      }
    } else if (facet.type === 'document') {
      address.textContent = facet.href ? 'A page you can read here' : 'A page held in the working archive';
    } else if (facet.type === 'video') {
      address.textContent = 'A moving-picture doorway';
      if (facet.iconPath) {
        preview.src = facet.iconPath;
        preview.hidden = false;
        glimpse.classList.add('has-favicon');
      }
    } else {
      address.textContent = 'A doorway into the live work';
      if (facet.iconPath) {
        preview.src = facet.iconPath;
        preview.hidden = false;
        glimpse.classList.add('has-favicon');
      }
    }
    title.textContent = facet.title;
    story.textContent = facet.story;
    openButton.dataset.source = facet.sourceId;
    openButton.textContent = facet.href ? 'Open this thread' : 'Read its place in the archive';
    const numberedType = facet.type === 'image'
      ? `picture ${facet.typeNumber}`
      : facet.type === 'document'
        ? `document ${facet.typeNumber}`
        : facet.type;
    canvas.setAttribute('aria-label', `Interactive horn torus. Selected ${numberedType}: ${facet.title}. Use arrow keys to move among the marked outer facets, then Tab to reach the card actions. Plus or minus zooms while staying outside.`);
  };

  const facetAt = (clientX, clientY) => {
    const bounds = canvas.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    for (let index = projectedFacets.length - 1; index >= 0; index -= 1) {
      const facetIndex = projectedFacets[index].index;
      if (facets[facetIndex]?.interactive && containsPoint(projectedFacets[index].points, x, y)) return facetIndex;
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
    halo.addColorStop(0.18, 'rgba(163,208,229,0.13)');
    halo.addColorStop(0.48, 'rgba(177,165,209,0.07)');
    halo.addColorStop(1, 'rgba(218,228,237,0)');
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
      const interactive = Boolean(facet?.interactive);
      const colour = COLOURS[(polygon.row + Math.floor(polygon.column / 3)) % COLOURS.length];
      const brightness = (polygon.brightness + 0.25) / 1.25;
      const luminance = 30 + brightness * 43;
      const lightLevel = 0.28 + brightness * 0.58;
      const reflection = Math.pow(brightness, 12) * 95;
      const [red, green, blue] = colour.map((channel) => Math.min(255, Math.round(channel * lightLevel + reflection)));
      const selected = interactive && polygon.index === state.selected;
      const hovered = interactive && polygon.index === state.hovered;

      tracePolygon(context, polygon.points);
      context.fillStyle = interactive
        ? `rgba(${red}, ${green}, ${blue}, ${selected || hovered ? 0.98 : 0.92})`
        : `rgba(${Math.round(red * 0.48)}, ${Math.round(green * 0.48)}, ${Math.round(blue * 0.55)}, 0.34)`;
      context.fill();
      context.strokeStyle = selected
        ? 'rgba(255,255,255,1)'
        : hovered
          ? 'rgba(255,244,178,0.95)'
          : interactive
            ? `rgba(9,7,15,${0.34 + (1 - brightness) * 0.34})`
            : 'rgba(255,255,255,0.09)';
      context.lineWidth = selected ? 2.4 : hovered ? 1.8 : interactive ? 0.75 : 0.55;
      context.stroke();

      if (!interactive || polygon.area < 85) return;
      const centre = facetCentre(polygon.points);
      const frame = facetFrame(polygon.points);
      if (frame.width < 7 || frame.height < 7) return;
      const markColour = luminance > 54 ? 'rgba(10,7,19,0.84)' : 'rgba(255,255,255,0.9)';

      if (facet.type === 'document' || facet.type === 'image') {
        const markSize = Math.min(
          frame.height * 0.62,
          frame.width * 0.56,
          Math.sqrt(polygon.area) * 0.72,
          58
        );
        if (markSize < 7) return;
        const number = String(facet.typeNumber || '');
        const fontSize = clamp(markSize * 0.66, 7, 15);
        context.save();
        tracePolygon(context, polygon.points);
        context.clip();
        context.translate(centre.x, centre.y);
        context.rotate(frame.angle);
        context.font = `${selected ? 850 : 760} ${fontSize}px ui-monospace, Consolas, monospace`;
        const numberWidth = context.measureText(number).width;
        const iconSize = markSize * 0.72;
        const gap = Math.max(2, markSize * 0.15);
        const totalWidth = iconSize + gap + numberWidth;
        const iconX = -totalWidth / 2 + iconSize / 2;
        if (facet.type === 'image') drawCameraMark(context, iconX, 0, iconSize, markColour);
        else drawDocumentMark(context, iconX, 0, iconSize, markColour);
        context.fillStyle = markColour;
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        context.fillText(number, iconX + iconSize / 2 + gap, fontSize * 0.03);
        context.restore();
        return;
      }

      const markSize = Math.min(
        frame.width * 0.72,
        frame.height * 0.72,
        Math.sqrt(polygon.area) * 0.9,
        76
      );
      if (markSize < 7) return;
      const icon = facet.iconPath ? iconImages.get(facet.iconPath) : null;
      context.save();
      tracePolygon(context, polygon.points);
      context.clip();
      context.translate(centre.x, centre.y);
      context.rotate(frame.angle);
      if (icon?.complete && icon.naturalWidth) {
        const size = markSize;
        context.fillStyle = 'rgba(255,255,255,0.94)';
        context.beginPath();
        context.arc(0, 0, size * 0.55, 0, TAU);
        context.fill();
        context.beginPath();
        context.arc(0, 0, size * 0.47, 0, TAU);
        context.clip();
        context.drawImage(icon, -size / 2, -size / 2, size, size);
      } else {
        drawWebFallback(context, 0, 0, markSize, markColour);
      }
      if (facet.type === 'video') drawPlayMark(context, markSize * 0.28, markSize * 0.28, markSize);
      context.restore();
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
    const contentRowPosition = CONTENT_ROWS.indexOf(row);
    let next = state.selected;
    if (event.key === 'ArrowRight') next = row * COLUMNS + ((column + 1) % COLUMNS);
    if (event.key === 'ArrowLeft') next = row * COLUMNS + ((column - 1 + COLUMNS) % COLUMNS);
    if (event.key === 'ArrowDown') next = CONTENT_ROWS[(contentRowPosition + 1) % CONTENT_ROWS.length] * COLUMNS + column;
    if (event.key === 'ArrowUp') next = CONTENT_ROWS[(contentRowPosition - 1 + CONTENT_ROWS.length) % CONTENT_ROWS.length] * COLUMNS + column;
    if (event.key === '+' || event.key === '=') state.cameraDistance = clamp(state.cameraDistance - 0.35, MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE);
    if (event.key === '-') state.cameraDistance = clamp(state.cameraDistance + 0.35, MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      describeFacet(state.selected);
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
    if (!activeFacetIndexes.length) return;
    const currentPosition = Math.max(0, activeFacetIndexes.indexOf(state.selected));
    describeFacet(activeFacetIndexes[(currentPosition + 17) % activeFacetIndexes.length]);
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

  fetch('data/facets.json?v=20260905-my-voice')
    .then((response) => {
      if (!response.ok) throw new Error('The facet map could not be loaded.');
      return response.json();
    })
    .then((records) => {
      if (!Array.isArray(records) || records.length !== FACET_COUNT) throw new Error('The horn torus needs exactly 288 facets.');
      facets = records;
      activeFacetIndexes = facets.map((facet, index) => facet.interactive ? index : -1).filter((index) => index >= 0);
      facets.forEach((facet) => loadIcon(facet.iconPath));
      if (activeFacetIndexes.length !== 192) throw new Error('The horn torus needs eight complete outer rows.');
      describeFacet(activeFacetIndexes[0]);
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
