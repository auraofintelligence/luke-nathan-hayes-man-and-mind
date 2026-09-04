import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const loadJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const [pages, content, controversies, sources] = await Promise.all([
  loadJson('data/pages.json'),
  loadJson('data/site-content.json'),
  loadJson('data/controversies.json'),
  loadJson('sources/register.json')
]);

const errors = [];
const sourceIds = new Set(sources.map((source) => source.id));
const pageIds = new Set(pages.map((page) => page.id));
const pageFiles = new Set(pages.map((page) => page.file));
const allowedEvidence = new Set(['lived', 'built', 'submitted', 'proposed', 'modelled', 'frontier', 'story', 'open-question']);

const addError = (message) => errors.push(message);

if (pages.length !== 14) addError(`Expected 14 pages, found ${pages.length}.`);
if (pageIds.size !== pages.length) addError('Page IDs are not unique.');
if (pageFiles.size !== pages.length) addError('Page filenames are not unique.');
if (!sources.length) addError('The source register is empty.');
if (sourceIds.size !== sources.length) addError('Source IDs are not unique.');
for (const requiredSource of ['F24', 'F25', 'F37']) {
  if (!sourceIds.has(requiredSource)) addError(`Required album source ${requiredSource} is missing.`);
}

const referencedSources = new Set();
for (const [pageId, pageContent] of Object.entries(content)) {
  if (!pageIds.has(pageId)) addError(`Content exists for unknown page ${pageId}.`);
  for (const section of pageContent.sections || []) {
    for (const card of section.cards || []) {
      if (!allowedEvidence.has(card.evidence)) addError(`${pageId}: invalid evidence label ${card.evidence}.`);
      for (const sourceId of card.sourceIds || []) referencedSources.add(sourceId);
    }
  }
  for (const sourceId of pageContent.soundtrack?.sourceIds || []) referencedSources.add(sourceId);
}

for (const item of controversies) {
  if (!pageIds.has(item.page)) addError(`Controversy uses unknown page ${item.page}.`);
  if (!allowedEvidence.has(item.evidence)) addError(`${item.title}: invalid evidence label ${item.evidence}.`);
  for (const sourceId of item.sourceIds || []) referencedSources.add(sourceId);
  for (const key of ['idea', 'meaning', 'care', 'exists', 'notYet', 'change']) {
    if (!item[key]) addError(`${item.title}: missing ${key}.`);
  }
}

for (const sourceId of referencedSources) {
  if (!sourceIds.has(sourceId)) addError(`Unknown source reference ${sourceId}.`);
}

for (const source of sources) {
  if (!referencedSources.has(source.id) && !source.intentionallyUnused) {
    addError(`Source ${source.id} is not cited and is not marked intentionally unused.`);
  }
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
  if (!html.includes('data-perspective="both"')) addError(`${page.file}: missing perspective control state.`);
  if (/[–—]/u.test(html)) addError(`${page.file}: contains an en dash or em dash.`);
  if (/<svg\b/i.test(html)) addError(`${page.file}: contains forbidden inline SVG.`);
  if (/ready SET(?! Co-op)/g.test(html)) addError(`${page.file}: contains an incomplete ready SET Co-op name.`);

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

for (const file of await walk(root)) {
  if (extname(file).toLowerCase() === '.svg') addError(`Forbidden SVG file: ${file.slice(root.length + 1)}`);
  const details = await stat(file);
  if (details.size > 20 * 1024 * 1024) addError(`File exceeds 20 MB: ${file.slice(root.length + 1)}`);
}

if (errors.length) {
  console.error(`Site checks failed with ${errors.length} problem${errors.length === 1 ? '' : 's'}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Site checks passed: ${pages.length} pages, ${sources.length} sources, ${referencedSources.size} cited records.`);
}
