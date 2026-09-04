import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const loadJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const [pages, content, controversies, sources, facets] = await Promise.all([
  loadJson('data/pages.json'),
  loadJson('data/site-content.json'),
  loadJson('data/controversies.json'),
  loadJson('sources/register.json'),
  loadJson('data/facets.json')
]);

const errors = [];
const addError = (message) => errors.push(message);
const sourceIds = new Set(sources.map((source) => source.id));
const sourceById = new Map(sources.map((source) => [source.id, source]));
const pageIds = new Set(pages.map((page) => page.id));
const pageFiles = new Set(pages.map((page) => page.file));

if (pages.length !== 14) addError(`Expected 14 pages, found ${pages.length}.`);
if (pageIds.size !== pages.length) addError('Page IDs are not unique.');
if (pageFiles.size !== pages.length) addError('Page filenames are not unique.');
if (!sources.length) addError('The source register is empty.');
if (sourceIds.size !== sources.length) addError('Source IDs are not unique.');

for (const requiredSource of ['F24', 'F25', 'F29', 'F37', 'F38', 'U08', 'U17']) {
  if (!sourceIds.has(requiredSource)) addError(`Required source ${requiredSource} is missing.`);
}

const referencedSources = new Set();
for (const [pageId, pageContent] of Object.entries(content)) {
  if (!pageIds.has(pageId)) addError(`Content exists for unknown page ${pageId}.`);
  if ('firstPerson' in pageContent || 'thirdPerson' in pageContent) addError(`${pageId}: discarded split voice remains in content.`);
  if (!Array.isArray(pageContent.story?.paragraphs) || !pageContent.story.paragraphs.length) addError(`${pageId}: coherent story opening is missing.`);
  for (const section of pageContent.sections || []) {
    for (const card of section.cards || []) {
      for (const sourceId of card.sourceIds || []) referencedSources.add(sourceId);
    }
  }
  for (const sourceId of pageContent.soundtrack?.sourceIds || []) referencedSources.add(sourceId);
}

for (const item of controversies) {
  if (!pageIds.has(item.page)) addError(`Controversy uses unknown page ${item.page}.`);
  for (const sourceId of item.sourceIds || []) referencedSources.add(sourceId);
  for (const key of ['idea', 'meaning', 'care', 'exists', 'notYet', 'change']) {
    if (!item[key]) addError(`${item.title}: missing ${key}.`);
  }
}

for (const sourceId of referencedSources) {
  if (!sourceIds.has(sourceId)) addError(`Unknown source reference ${sourceId}.`);
}

if (facets.length !== 288) addError(`Expected 288 horn-torus facets, found ${facets.length}.`);
const facetAddresses = new Set();
const facetCoverage = new Map(sources.map((source) => [source.id, 0]));
facets.forEach((facet, index) => {
  if (facet.number !== index + 1) addError(`Facet ${index} has non-contiguous number ${facet.number}.`);
  if (!Number.isInteger(facet.row) || facet.row < 0 || facet.row >= 12) addError(`Facet ${facet.number}: invalid row.`);
  if (!Number.isInteger(facet.column) || facet.column < 0 || facet.column >= 24) addError(`Facet ${facet.number}: invalid column.`);
  const address = `${facet.row}:${facet.column}`;
  if (facetAddresses.has(address)) addError(`Duplicate facet address ${address}.`);
  facetAddresses.add(address);
  if (!sourceIds.has(facet.sourceId)) {
    addError(`Facet ${facet.number}: unknown source ${facet.sourceId}.`);
    return;
  }
  facetCoverage.set(facet.sourceId, facetCoverage.get(facet.sourceId) + 1);
  const source = sourceById.get(facet.sourceId);
  const expectedHref = source.url || source.publicPath || '';
  if (facet.href !== expectedHref) addError(`Facet ${facet.number}: source link does not match ${facet.sourceId}.`);
  if (source.availability === 'public-link' && !/^https:\/\//i.test(facet.href)) addError(`Facet ${facet.number}: public source needs an HTTPS link.`);
  if (!source.url && !source.publicPath && facet.href) addError(`Facet ${facet.number}: private archive location became a link.`);
});

for (const [sourceId, count] of facetCoverage) {
  if (!count) addError(`Source ${sourceId} does not appear on the horn torus.`);
}
const coverageCounts = [...facetCoverage.values()];
if (coverageCounts.length && Math.max(...coverageCounts) - Math.min(...coverageCounts) > 1) {
  addError('Facet source distribution is not balanced.');
}

const localTarget = (href) => {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean.startsWith('mailto:') || clean.startsWith('tel:') || clean.startsWith('javascript:')) return null;
  if (/^https?:\/\//i.test(clean)) return null;
  return clean;
};

for (const page of pages) {
  const filePath = resolve(root, page.file);
  let html;
  try {
    html = await readFile(filePath, 'utf8');
  } catch {
    addError(`${page.file}: generated page is missing.`);
    continue;
  }

  if (!html.includes('<html lang="en-AU">')) addError(`${page.file}: missing Australian language declaration.`);
  if (!/<main\s+id="top"(?:\s|>)/.test(html)) addError(`${page.file}: missing main#top.`);
  if (!html.includes('rel="icon"') || !html.includes('assets/favicon.jpg')) addError(`${page.file}: raster favicon is missing.`);
  if (/data-perspective|perspective-control|First-person draft|Third person/i.test(html)) addError(`${page.file}: discarded split voice remains.`);
  if (/evidence-bar|evidence-toggle|evidence-chip/i.test(html)) addError(`${page.file}: clinical evidence controls remain.`);
  if (/mirror[ -]ball/i.test(html)) addError(`${page.file}: discarded mirror-ball language remains.`);
  if (/[–—]/u.test(html)) addError(`${page.file}: contains an en dash or em dash.`);
  if (/<svg\b|data:image\/svg\+xml|\.svg(?:[?#"']|$)/i.test(html)) addError(`${page.file}: contains a forbidden vector image reference.`);
  if (/ready SET(?! Co-op)/g.test(html)) addError(`${page.file}: contains an incomplete ready SET Co-op name.`);
  if (page.id === 'home' && (!html.includes('data-horn-torus') || !html.includes('Facet 001 of 288'))) addError('index.html: 288-facet horn torus is missing.');

  const anchors = html.match(/<a\b[^>]*>/gi) || [];
  for (const anchor of anchors) {
    const href = anchor.match(/\bhref="([^"]+)"/i)?.[1];
    if (!href) continue;
    if (/^https?:\/\//i.test(href)) {
      if (!/\btarget="_blank"/i.test(anchor)) addError(`${page.file}: external link lacks target=_blank: ${href}`);
      if (!/\brel="noopener noreferrer"/i.test(anchor)) addError(`${page.file}: external link lacks safe rel: ${href}`);
      continue;
    }
    const target = localTarget(href);
    if (!target) continue;
    try {
      await access(resolve(root, target));
    } catch {
      addError(`${page.file}: broken local link ${href}`);
    }
  }

  const resources = [...html.matchAll(/<(?:link|script|img)\b[^>]*(?:href|src)="([^"]+)"[^>]*>/gi)].map((match) => match[1]);
  for (const resource of resources) {
    const target = localTarget(resource);
    if (!target) continue;
    try {
      await access(resolve(root, target));
    } catch {
      addError(`${page.file}: missing resource ${resource}`);
    }
  }
}

const torusScript = await readFile(resolve(root, 'scripts/horn-torus.js'), 'utf8');
const minimumCamera = Number(torusScript.match(/MIN_CAMERA_DISTANCE\s*=\s*([\d.]+)/)?.[1]);
if (!Number.isFinite(minimumCamera) || minimumCamera <= 4.1) addError('Horn-torus camera can cross the outside safety boundary.');
if (!torusScript.includes('const ROWS = 12;') || !torusScript.includes('const COLUMNS = 24;')) addError('Horn-torus lattice is not fixed at 12 by 24.');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const files = await walk(root);
for (const file of files) {
  const extension = extname(file).toLowerCase();
  if (extension === '.svg') addError(`Forbidden vector image file: ${relative(root, file)}`);
  const details = await stat(file);
  if (details.size > 20 * 1024 * 1024) addError(`File exceeds 20 MB: ${relative(root, file)}`);
  if (['.html', '.css', '.js', '.json'].includes(extension) && !file.endsWith('check-site.mjs')) {
    const text = await readFile(file, 'utf8');
    if (/data:image\/svg\+xml|\.svg(?:[?#"']|$)|createElementNS\([^)]*svg/i.test(text)) {
      addError(`Forbidden vector image reference: ${relative(root, file)}`);
    }
  }
}

for (const discarded of ['scripts/mirror-ball.js', 'scripts/perspective.js', 'scripts/evidence-lens.js']) {
  if (files.includes(resolve(root, discarded))) addError(`Discarded interface file remains: ${discarded}`);
}

if (errors.length) {
  console.error(`Site checks failed with ${errors.length} problem${errors.length === 1 ? '' : 's'}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Site checks passed: ${pages.length} pages, ${sources.length} source threads and all 288 outside facets mapped.`);
}
