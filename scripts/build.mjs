import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));

const [pages, content, audiences, projects, sourceInput, socialLinks, controversies, liveLinks] = await Promise.all([
  readJson('data/pages.json'),
  readJson('data/site-content.json'),
  readJson('data/audiences.json'),
  readJson('data/projects.json'),
  readJson('sources/register.json'),
  readJson('data/social-links.json'),
  readJson('data/controversies.json'),
  readJson('data/live-links.json')
]);

const siteUrl = 'https://auraofintelligence.github.io/luke-nathan-hayes-man-and-mind/';
const evidenceLabels = {
  lived: 'Lived',
  built: 'Built',
  submitted: 'Submission document',
  proposed: 'Proposed',
  modelled: 'Modelled',
  frontier: 'Frontier',
  story: 'Story',
  'open-question': 'Open question'
};

const sourceAuthorship = (record) => {
  if (record.id === 'U01') return 'Third-party public video; creator attribution to be confirmed';
  if (record.id === 'U25') return 'Luke Nathan Hayes personal public site';
  if (record.id.startsWith('U')) return 'Luke-authored or Luke-directed public project';
  if (/^(?:Public submission|Submission (?:companion )?document)/.test(record.status)) return 'Attributed to Luke Nathan Hayes';
  if (record.status.includes('AI-assisted')) return 'Luke-directed AI collaboration';
  if (record.status.includes('Conversation and design')) return 'AI response preserved as a design record';
  if (record.status.includes('Personal photograph')) return 'Photographer to be confirmed; supplied by Luke Nathan Hayes';
  if (record.status.includes('Personal')) return 'Luke personal record';
  if (record.status.includes('Creative')) return 'Luke creative source';
  if (record.status.includes('Original historical')) return 'Luke original';
  return 'Authorship to be confirmed';
};

const sourceStatus = (record) => {
  if (record.status.startsWith('Public submission companion')) return 'Submission companion document; public lodgement to be confirmed';
  if (record.status.startsWith('Public submission')) return 'Submission document; public lodgement to be confirmed';
  return record.status;
};

const liveLinkById = new Map(liveLinks.map((record) => [record.id, record]));
const sources = sourceInput.map((record) => {
  const live = liveLinkById.get(record.id);
  return {
    ...record,
    status: sourceStatus(record),
    authorship: sourceAuthorship(record),
    canonicalTitle: live?.canonicalTitle,
    checkedOn: live?.checkedOn,
    url: record.id.startsWith('U') ? (live?.finalUrl || record.location) : undefined,
    publicPath: undefined,
    availability: record.id === 'F29' ? 'local-reviewed-candidate' : record.availability
  };
});

const publicLinkCount = sources.filter((source) => source.id.startsWith('U')).length;
const heldSourceCount = sources.length - publicLinkCount;

await writeFile(resolve(root, 'sources/register.json'), `${JSON.stringify(sources, null, 2)}\n`, 'utf8');

const pageById = new Map(pages.map((page) => [page.id, page]));
const sourceById = new Map(sources.map((source) => [source.id, source]));

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function externalAttributes(url = '') {
  return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function renderHeader(page) {
  const navigation = pages.map((entry) => `
    <li>
      <a href="${entry.file}#top"${entry.id === page.id ? ' aria-current="page"' : ''}>
        <span class="nav-number">${entry.chapter}</span>
        <span>${escapeHtml(entry.title)}</span>
      </a>
    </li>`).join('');

  return `
  <a class="skip-link" href="#page-content">Skip to the story</a>
  <div class="recommendation-ribbon" data-recommendation-ribbon></div>
  <header class="site-header">
    <div class="page-shell header-inner">
      <a class="home-mark" href="index.html#top" aria-label="The Mind Behind the Man home">∞</a>
      <div class="chapter-progress">
        <strong>${escapeHtml(page.shortTitle)}</strong>
        <span>Chapter ${page.chapter} of 13</span>
      </div>
      <div class="header-actions">
        <div class="perspective-control" role="group" aria-label="Opening voice">
          <button class="perspective-button" type="button" data-perspective="both" aria-pressed="true">Both</button>
          <button class="perspective-button" type="button" data-perspective="first" aria-pressed="false">First draft</button>
          <button class="perspective-button" type="button" data-perspective="third" aria-pressed="false">Third person</button>
        </div>
        <button class="menu-button" type="button" data-menu-button aria-expanded="false" aria-controls="site-navigation">Menu</button>
      </div>
    </div>
  </header>
  <div class="nav-backdrop" data-nav-backdrop></div>
  <nav class="nav-drawer" id="site-navigation" data-nav-drawer aria-label="Complete site navigation" aria-hidden="true" inert>
    <div class="nav-drawer-header">
      <strong>Follow a reflection</strong>
      <button class="drawer-close" type="button" data-menu-close aria-label="Close menu">×</button>
    </div>
    <ol>${navigation}</ol>
  </nav>`;
}

function renderHero(page, pageContent) {
  const isHome = page.id === 'home';
  const isSongs = page.id === 'songs';
  const origin = isHome
    ? 'Luke Catalyst Nathan Hayes | Minjerribah | Free thinking since 2012'
    : `Chapter ${page.chapter} of 13 | ${page.shortTitle}`;
  const actions = isHome
    ? `
      <a class="button primary" href="the-bloke.html#top">Start with the bloke</a>
      <a class="button secondary" href="under-the-aura.html#top">Show me the wild stuff</a>
      <a class="button secondary" href="choose-your-door.html#top">Choose why you are here</a>`
    : `
      <a class="button primary" href="#voices">Read this chapter</a>
      <a class="button secondary" href="sources.html#source-register">Open the source room</a>`;

  let stage;
  if (isHome) {
    stage = `
      <div class="hero-stage">
        <div class="hero-glow"></div>
        <canvas class="mirror-canvas" data-mirror-ball aria-label="Mirror ball with facets for body, mind, place, work, love, music, civics and future">
          A mirror ball representing the many facets of Luke's personal Aura.
        </canvas>
      </div>`;
  } else if (isSongs) {
    stage = `
      <div class="hero-stage">
        <div class="hero-glow"></div>
        <div class="album-placeholder" aria-label="Code-made visual placeholder for A Protopian Gambit">
          <span>i C. infinity</span>
          <strong>A Protopian Gambit</strong>
          <span>Album 4 lyric world</span>
        </div>
        <p class="hero-caption">Code-made visual placeholder. The supplied cover remains private until its authorship, embedded metadata and reuse rights are reviewed.</p>
      </div>`;
  } else {
    stage = `
      <div class="hero-stage" aria-hidden="true">
        <div class="hero-glow"></div>
        <div class="hero-orbit"></div>
        <div class="hero-wordmark">∞</div>
      </div>`;
  }

  const mature = ['home', 'love'].includes(page.id) ? `
    <aside class="mature-notice">
      <strong>Mature themes</strong>
      <p>The main site is public and non-explicit. It discusses sexuality, non-monogamy, embodied AI, religion, politics, mortality and contested science. Adult-only branches are clearly marked before you leave.</p>
    </aside>` : '';

  return `
  <section class="hero" aria-labelledby="page-title">
    <div class="page-shell hero-inner">
      <div class="hero-copy">
        <p class="origin-line">${escapeHtml(origin)}</p>
        <h1 id="page-title">${escapeHtml(page.title)}</h1>
        <p class="hero-deck">${escapeHtml(pageContent.intro)}</p>
        <div class="hero-actions">${actions}</div>
        ${mature}
      </div>
      ${stage}
    </div>
  </section>`;
}

function renderPerspectiveBar() {
  return `
  <div class="perspective-bar">
    <div class="page-shell perspective-bar-inner">
      <p>Switch the paired opening between a first-person draft and third-person context. The evidence sections below stay shared.</p>
      <div class="perspective-control" role="group" aria-label="Opening voice">
        <button class="perspective-button" type="button" data-perspective="both" aria-pressed="true">Both</button>
        <button class="perspective-button" type="button" data-perspective="first" aria-pressed="false">First draft</button>
        <button class="perspective-button" type="button" data-perspective="third" aria-pressed="false">Third person</button>
      </div>
    </div>
  </div>`;
}

function renderVoices(pageContent) {
  const renderVoice = (voice, className, label, heading = voice.heading) => `
    <article class="voice-card ${className}">
      <span class="voice-label">${label}</span>
      <h2>${escapeHtml(heading)}</h2>
      ${voice.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
    </article>`;

  return `
  <section class="section" id="voices">
    <div class="page-shell voices">
      ${renderVoice(pageContent.firstPerson, 'first-person', 'First-person draft', 'Drafted in my voice')}
      ${renderVoice(pageContent.thirdPerson, 'third-person', 'Third person')}
    </div>
  </section>`;
}

function renderEvidenceBar() {
  return `
  <div class="evidence-bar">
    <div class="page-shell evidence-bar-inner">
      <p>Evidence lens. All states are visible until you choose otherwise.</p>
      <div class="evidence-controls" role="group" aria-label="Filter cards by evidence state">
        ${Object.entries(evidenceLabels).map(([key, label]) => `<button class="evidence-toggle" type="button" data-evidence-toggle="${key}" aria-pressed="true">${label}</button>`).join('')}
      </div>
      <p class="visually-hidden" aria-live="polite" data-evidence-status></p>
    </div>
  </div>`;
}

function renderSourceButtons(ids = []) {
  return ids.filter((id) => sourceById.has(id)).map((id) => `
    <button class="source-chip" type="button" data-source="${escapeHtml(id)}" aria-label="Open source record ${escapeHtml(id)}">Source ${escapeHtml(id)}</button>`).join('');
}

function renderStoryCard(card) {
  const evidence = evidenceLabels[card.evidence] || card.evidence;
  const isAdult = card.href?.includes('grey-area-commons');
  let externalLink = '';
  if (card.href) {
    externalLink = isAdult
      ? `<button class="button secondary" type="button" data-adult-link="${escapeHtml(card.href)}">Read the adult boundary first</button>`
      : `<a class="external-card-link" href="${escapeHtml(card.href)}"${externalAttributes(card.href)}>Open the public project</a>`;
  }

  return `
  <article class="story-card" data-evidence-card="${escapeHtml(card.evidence)}">
    <span class="evidence-chip" data-kind="${escapeHtml(card.evidence)}">${escapeHtml(evidence)}</span>
    <h3>${escapeHtml(card.title)}</h3>
    <p>${escapeHtml(card.body)}</p>
    ${externalLink}
    <div class="story-card-footer">${renderSourceButtons(card.sourceIds)}</div>
  </article>`;
}

function renderSections(pageContent) {
  return pageContent.sections.map((section) => `
  <section class="section">
    <div class="page-shell">
      <div class="section-heading">
        <h2>${escapeHtml(section.heading)}</h2>
        ${section.intro ? `<p>${escapeHtml(section.intro)}</p>` : ''}
      </div>
      <div class="card-grid">
        ${(section.cards || []).map(renderStoryCard).join('')}
      </div>
    </div>
  </section>`).join('');
}

function renderIdentityPanel(pageId) {
  if (pageId !== 'bloke') return '';
  const identities = [
    ['Luke Nathan Hayes', 'The person.'],
    ['Luke Catalyst', 'The public systems, ideas and speaking identity.'],
    ['Strange but True', "Luke's current sole-trader practice and practical local doorway."],
    ['i C. infinity', 'The music and creative identity.'],
    ['Aura of Intelligence', "Luke's personal cognitive architecture and long-horizon project constellation."],
    ['GAJRA Earth', 'A proposed voluntary connective idea, not a planetary authority.'],
    ['ready SET Co-op', 'The proposed ready sustainable employment and training cooperative. It does not currently exist.'],
    ['Project Atlas', 'The public evidence and navigation layer, not an organisation.']
  ];
  return `
  <section class="section compact">
    <div class="page-shell">
      <div class="section-heading">
        <h2>Who is who</h2>
        <p>These names point to different parts of the same story. They do not all describe existing organisations.</p>
      </div>
      <div class="source-table-wrap">
        <table class="identity-table">
          <thead><tr><th scope="col">Name</th><th scope="col">What it means here</th></tr></thead>
          <tbody>${identities.map(([name, meaning]) => `<tr><th scope="row">${escapeHtml(name)}</th><td>${escapeHtml(meaning)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}

function renderControversies(pageId) {
  const items = controversies.filter((item) => item.page === pageId);
  if (!items.length) return '';
  const fields = [
    ['The idea', 'idea'],
    ['What Luke means', 'meaning'],
    ['Why it matters to Luke', 'care'],
    ['What exists now', 'exists'],
    ['What does not exist yet', 'notYet'],
    ["What could change Luke's view", 'change']
  ];
  return `
  <section class="section">
    <div class="page-shell">
      <div class="section-heading">
        <h2>Test the provocation</h2>
        <p>Each bold idea is separated from its present evidence, its missing pieces and the things that could change it.</p>
      </div>
      ${items.map((item) => `
        <article class="controversy-card" data-evidence-card="${escapeHtml(item.evidence)}">
          <span class="evidence-chip" data-kind="${escapeHtml(item.evidence)}">${escapeHtml(evidenceLabels[item.evidence])}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="controversy-grid">
            ${fields.map(([label, key]) => `<div class="controversy-point"><strong>${label}</strong><p>${escapeHtml(item[key])}</p></div>`).join('')}
          </div>
          <div class="story-card-footer">${renderSourceButtons(item.sourceIds)}</div>
        </article>`).join('')}
    </div>
  </section>`;
}

function renderSoundtrack(soundtrack) {
  if (!soundtrack?.title) return '';
  return `
  <section class="section compact">
    <div class="page-shell soundtrack-card">
      <div class="soundtrack-disc" aria-hidden="true">∞</div>
      <div>
        <p>Soundtrack cue from the lyric archive</p>
        <h2>${escapeHtml(soundtrack.title)}</h2>
        <p>${escapeHtml(soundtrack.album)}</p>
        <p>${escapeHtml(soundtrack.reason)}</p>
        <small>This is an editorial placement, not a claim about final release order.</small>
        <div class="story-card-footer">${renderSourceButtons(soundtrack.sourceIds)}</div>
      </div>
      <div class="media-slot">${escapeHtml(soundtrack.mediaStatus)}</div>
    </div>
  </section>`;
}

function availabilityLabel(value) {
  return {
    'public-link': 'Live public link',
    'published-source': 'Published source',
    'local-reviewed-candidate': 'Held locally for review',
    'missing-locally': 'Awaiting a later source pass'
  }[value] || value;
}

function renderSourceRoom(pageId) {
  if (pageId !== 'sources') return '';
  const records = sources.map((source) => {
    const link = source.url || source.publicPath;
    const primaryPage = pages.find((page) => page.chapter === source.primaryPage);
    return `
      <article class="source-record" data-source-record data-source-type="${escapeHtml(source.type)}" data-availability="${escapeHtml(source.availability)}">
        <span class="source-id">${escapeHtml(source.id)}</span>
        <div>
          <h3>${escapeHtml(source.title)}</h3>
          <p>${escapeHtml(source.status)}. ${escapeHtml(source.notes)}</p>
          <p>${escapeHtml(source.authorship)}</p>
          ${primaryPage ? `<p>Used first in Chapter ${escapeHtml(primaryPage.chapter)}: ${escapeHtml(primaryPage.title)}</p>` : ''}
          ${!source.id.startsWith('U') ? `<p>Registered filename: ${escapeHtml(source.location)}</p>` : ''}
          ${source.canonicalTitle && source.canonicalTitle !== source.title ? `<p>Live page title: ${escapeHtml(source.canonicalTitle)}</p>` : ''}
          ${source.checkedOn ? `<p>Link checked: ${escapeHtml(source.checkedOn)}</p>` : ''}
          ${link ? `<a href="${escapeHtml(link)}"${externalAttributes(link)}>Open ${source.url ? 'live source' : 'published source'}</a>` : ''}
        </div>
        <span class="availability ${escapeHtml(source.availability)}">${escapeHtml(availabilityLabel(source.availability))}</span>
      </article>`;
  }).join('');

  return `
  <section class="section" id="source-register">
    <div class="page-shell">
      <div class="section-heading">
        <h2>The working source register</h2>
        <p>The register currently contains ${sources.length} records: ${heldSourceCount} supplied or expected local records and ${publicLinkCount} checked public links. Local originals stay private until privacy, cultural context, authorship and source-specific rights are reviewed.</p>
      </div>
      <div class="source-room-controls">
        <label class="visually-hidden" for="source-search">Search the source register</label>
        <input class="source-search" id="source-search" type="search" placeholder="Search titles, notes or source IDs" data-source-search>
        <label class="visually-hidden" for="source-filter">Filter the source register</label>
        <select class="source-select" id="source-filter" data-source-filter>
          <option value="all">All source states</option>
          <option value="website">Websites</option>
          <option value="document">Documents</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="local-reviewed-candidate">Held locally for review</option>
          <option value="missing-locally">Awaiting later pass</option>
        </select>
      </div>
      <p aria-live="polite" data-source-count></p>
      <div class="source-register">${records}</div>
    </div>
  </section>`;
}

function renderAudienceDoors(pageId) {
  if (pageId !== 'choose-door') return '';
  const cards = audiences.map((audience) => {
    const files = audience.pages.map((id) => pageById.get(id)?.file).filter(Boolean);
    return `
      <button class="door-button" type="button" data-door="${escapeHtml(audience.id)}" data-label="${escapeHtml(audience.label)}" data-routes="${escapeHtml(files.join(','))}">
        <strong>${escapeHtml(audience.label)}</strong>
        <span>${escapeHtml(audience.invitation)}</span>
      </button>`;
  }).join('');
  return `
  <section class="section">
    <div class="page-shell">
      <div class="section-heading">
        <h2>Choose a starting door</h2>
        <p>Your choice changes the recommended order, not the facts and not what you are allowed to see.</p>
      </div>
      <div class="door-grid">${cards}</div>
    </div>
  </section>`;
}

function renderSitemap(pageId) {
  if (pageId !== 'sitemap') return '';
  const pageLinks = pages.map((page) => `<li><a href="${page.file}#top"><strong>${page.chapter}</strong><span>${escapeHtml(page.title)}</span></a></li>`).join('');
  const projectLinks = projects.map((project) => `
    <article class="source-record">
      <span class="source-id">${escapeHtml(project.id)}</span>
      <div><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.status)}. ${escapeHtml(project.summary)}</p><a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">Open project</a></div>
    </article>`).join('');
  return `
  <section class="section">
    <div class="page-shell">
      <div class="section-heading"><h2>Fourteen chapters</h2><p>The full narrative order, from one person to the wider horizon.</p></div>
      <ol class="site-map-list">${pageLinks}</ol>
    </div>
  </section>
  <section class="section">
    <div class="page-shell">
      <div class="section-heading"><h2>Explore the public worlds</h2><p>These links lead to separate live projects. Their status descriptions come from the current source register.</p></div>
      <div class="source-register">${projectLinks}</div>
    </div>
  </section>`;
}

function renderClosing(text) {
  if (!text) return '';
  return `
  <section class="section">
    <div class="page-shell">
      <blockquote class="closing-invitation">${escapeHtml(text)}</blockquote>
    </div>
  </section>`;
}

function renderSourceDialog() {
  return `
  <dialog class="source-dialog" data-source-dialog aria-labelledby="source-dialog-title">
    <div class="source-dialog-inner">
      <button class="drawer-close" type="button" data-source-close aria-label="Close source record">×</button>
      <span class="dialog-id" data-dialog-id></span>
      <h2 id="source-dialog-title" data-dialog-title>Source record</h2>
      <p data-dialog-body></p>
      <ul class="dialog-meta" data-dialog-meta></ul>
      <a class="button primary" data-dialog-link hidden>Open source</a>
    </div>
  </dialog>`;
}

function renderAdultDialog() {
  return `
  <dialog class="source-dialog" data-adult-dialog aria-labelledby="adult-dialog-title">
    <div class="source-dialog-inner">
      <button class="drawer-close" type="button" data-adult-close aria-label="Close adult-only notice">×</button>
      <span class="dialog-id">Adult-only branch</span>
      <h2 id="adult-dialog-title">You are leaving the general site</h2>
      <p>Grey Area Commons is a separate adult-only self-reflection project about intimacy and connection. It is not part of this general, non-explicit site.</p>
      <div class="hero-actions">
        <button class="button secondary" type="button" data-adult-back>Go back</button>
        <a class="button primary" href="https://auraofintelligence.github.io/grey-area-commons/" target="_blank" rel="noopener noreferrer" data-adult-continue>Continue to Grey Area Commons</a>
      </div>
    </div>
  </dialog>`;
}

function renderFooter(page, index) {
  const previous = pages[(index - 1 + pages.length) % pages.length];
  const next = pages[(index + 1) % pages.length];
  const social = socialLinks.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join('');
  const worlds = [
    ['Aura of Intelligence', 'https://auraofintelligence.github.io/index.html'],
    ['Strange but True', 'https://auraofintelligence.github.io/strange-but-true/index.html'],
    ['i C. infinity', 'https://auraofintelligence.github.io/i-C-infinity-music-universe/index.html'],
    ['GAJRA Earth', 'https://auraofintelligence.github.io/gajra-earth-claude-build/index.html'],
    ['P4A', 'https://p4a.xyz/'],
    ['Project Atlas', 'https://auraofintelligence.github.io/project-atlas/']
  ].map(([label, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`).join('');

  return `
  <footer class="site-footer">
    <div class="page-shell">
      <nav class="chapter-links" aria-label="Previous and next chapters">
        <a class="chapter-link previous" href="${previous.file}#top" data-previous-page><small>Previous page</small><strong>${escapeHtml(previous.title)}</strong></a>
        <a class="chapter-link next" href="${next.file}#top" data-next-page><small>Next page</small><strong>${escapeHtml(next.title)}</strong></a>
      </nav>
      <div class="footer-groups">
        <section class="footer-group">
          <h2>Find Luke</h2>
          <div class="footer-links">${social}</div>
        </section>
        <section class="footer-group">
          <h2>Explore the worlds</h2>
          <div class="footer-links">${worlds}</div>
        </section>
      </div>
      <p class="footer-note">Built solo on Minjerribah by Luke Nathan Hayes through Strange but True. A public working record. Sources and status are shown throughout.</p>
      <div class="utility-links">
        <a href="sitemap.html#top">Complete site map</a>
        <a href="sources.html#source-register">Source room</a>
        <a href="https://github.com/auraofintelligence/luke-nathan-hayes-man-and-mind/blob/main/LICENCE.md" target="_blank" rel="noopener noreferrer">Strange But True Public Source Licence</a>
      </div>
    </div>
  </footer>
  <button class="back-to-top" type="button" data-back-to-top aria-label="Back to top">↑</button>`;
}

function renderPage(page, index) {
  const pageContent = content[page.id];
  if (!pageContent) throw new Error(`Missing content for ${page.id}`);
  const audienceRoutes = Object.fromEntries(audiences.map((entry) => [entry.id, {
    label: entry.label,
    pages: entry.pages.map((id) => {
      const routePage = pageById.get(id);
      return routePage ? { id, title: routePage.title, file: routePage.file } : null;
    }).filter(Boolean)
  }]));
  const audienceJson = JSON.stringify(audienceRoutes).replaceAll('<', '\\u003c');
  const personSchema = page.id === 'home' ? `
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Luke Nathan Hayes',
    alternateName: 'Luke Catalyst',
    url: siteUrl,
    homeLocation: 'Minjerribah, Queensland, Australia'
  })}</script>` : '';

  return `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} | Luke Nathan Hayes</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <meta name="theme-color" content="#08070d">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:url" content="${siteUrl}${page.file}">
  <link rel="canonical" href="${siteUrl}${page.file}">
  <link rel="stylesheet" href="styles/tokens.css">
  <link rel="stylesheet" href="styles/base.css">
  <link rel="stylesheet" href="styles/components.css">
  <link rel="stylesheet" href="styles/motion.css">
  ${personSchema}
</head>
<body data-page="${escapeHtml(page.id)}" data-theme="${escapeHtml(page.theme)}" data-perspective="both">
  ${renderHeader(page)}
  <main id="top" tabindex="-1">
    ${renderHero(page, pageContent)}
    ${renderPerspectiveBar()}
    <div id="page-content" tabindex="-1">
      ${renderVoices(pageContent)}
      ${renderIdentityPanel(page.id)}
      ${renderEvidenceBar()}
      ${renderSections(pageContent)}
      ${renderControversies(page.id)}
      ${renderAudienceDoors(page.id)}
      ${renderSourceRoom(page.id)}
      ${renderSitemap(page.id)}
      ${renderSoundtrack(pageContent.soundtrack)}
      ${renderClosing(pageContent.closing)}
    </div>
  </main>
  ${renderFooter(page, index)}
  ${renderSourceDialog()}
  ${renderAdultDialog()}
  <script>window.__AUDIENCE_ROUTES__ = ${audienceJson};</script>
  <script type="module" src="scripts/app.js"></script>
</body>
</html>
`;
}

await Promise.all(pages.map((page, index) => {
  const html = renderPage(page, index).replace(/[ \t]+$/gm, '');
  return writeFile(resolve(root, page.file), html, 'utf8');
}));
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url><loc>${siteUrl}${page.file}</loc></url>`).join('\n')}
</urlset>
`;
await Promise.all([
  writeFile(resolve(root, 'sitemap.xml'), sitemapXml, 'utf8'),
  writeFile(resolve(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}sitemap.xml\n`, 'utf8')
]);
console.log(`Built ${pages.length} pages and ${sources.length} source records.`);
