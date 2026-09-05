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
const assetVersion = '20260905a';
const sourceIconPaths = {
  U01: 'assets/favicons/u01.ico',
  U02: 'assets/favicons/u02.png',
  U03: 'assets/favicons/u03.webp',
  U04: 'assets/favicons/u04.webp',
  U05: 'assets/favicons/u05.webp',
  U06: 'assets/favicons/u06.png',
  U07: 'assets/favicons/u07.webp',
  U08: 'assets/favicons/u08.png',
  U09: 'assets/favicons/u09.png',
  U11: 'assets/favicons/u11.png',
  U12: 'assets/favicons/u12.webp',
  U13: 'assets/favicons/u13.png',
  U14: 'assets/favicons/u14.webp',
  U15: 'assets/favicons/u15.webp',
  U16: 'assets/favicons/u16.png',
  U17: 'assets/favicons/u17.png',
  U18: 'assets/favicons/u18.webp',
  U19: 'assets/favicons/u19.webp',
  U20: 'assets/favicons/u20.png',
  U21: 'assets/favicons/u21.webp',
  U22: 'assets/favicons/u22.png',
  U23: 'assets/favicons/u23.webp',
  U24: 'assets/favicons/u24.png',
  U25: 'assets/favicons/u25.jpg',
  U26: 'assets/favicons/u26.png',
  S01: 'assets/favicons/s01.png',
  S02: 'assets/favicons/s02.ico',
  S03: 'assets/favicons/s03.png',
  S04: 'assets/favicons/s04.ico',
  S05: 'assets/favicons/s05.ico',
  S06: 'assets/favicons/u01.ico',
  S07: 'assets/favicons/s07.ico'
};

const sourceAuthorship = (record) => {
  if (record.authorship) return record.authorship;
  if (record.id.startsWith('S')) return 'Luke Nathan Hayes public profile';
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
  const isPublicLink = record.availability === 'public-link';
  return {
    ...record,
    status: sourceStatus(record),
    authorship: sourceAuthorship(record),
    canonicalTitle: live?.canonicalTitle || record.canonicalTitle,
    checkedOn: live?.checkedOn || record.checkedOn,
    url: isPublicLink ? (live?.finalUrl || record.url || record.location) : undefined,
    publicPath: record.publicPath,
    iconPath: sourceIconPaths[record.id] || undefined
  };
});

const publicLinkCount = sources.filter((source) => source.availability === 'public-link').length;
const heldSourceCount = sources.length - publicLinkCount;

await writeFile(resolve(root, 'sources/register.json'), `${JSON.stringify(sources, null, 2)}\n`, 'utf8');

const facetStory = (source) => {
  const note = (source.notes || 'A thread in Luke\'s working archive').replace(/[.!?]?$/, '.');
  if (source.availability === 'public-link') return `${note} Follow it into the live work.`;
  if (source.availability === 'published-source') return `${note} Luke chose to show this source here.`;
  if (source.availability === 'local-reviewed-candidate') return `${note} The original is on this laptop and its place in the story is public, while the complete file stays in Luke\'s working archive.`;
  return `${note} It belongs to Luke\'s wider archive, but the original file was not on this laptop for this build.`;
};

const facetStride = 17;
const contentRows = new Set([0, 1, 2, 3, 8, 9, 10, 11]);
const sourceTypeNumbers = new Map();
for (const type of ['document', 'image']) {
  sources
    .filter((source) => source.type === type)
    .forEach((source, index) => sourceTypeNumbers.set(source.id, index + 1));
}

let activeFacetPosition = 0;
const facets = Array.from({ length: 12 * 24 }, (_, index) => {
  const row = Math.floor(index / 24);
  const column = index % 24;
  if (!contentRows.has(row)) {
    return {
      number: index + 1,
      row,
      column,
      interactive: false
    };
  }

  const sourceOrder = (activeFacetPosition * facetStride) % sources.length;
  activeFacetPosition += 1;
  const source = sources[sourceOrder];
  return {
    number: index + 1,
    row,
    column,
    interactive: true,
    sourceOrder,
    sourceId: source.id,
    type: source.type,
    availability: source.availability,
    typeNumber: sourceTypeNumbers.get(source.id) || null,
    iconPath: source.iconPath || '',
    previewPath: source.type === 'image' ? (source.publicPath || '') : '',
    title: source.title,
    story: facetStory(source),
    href: source.url || source.publicPath || ''
  };
});

await writeFile(resolve(root, 'data/facets.json'), `${JSON.stringify(facets, null, 2)}\n`, 'utf8');

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
      <a class="home-mark" href="index.html#top" aria-label="The Mind Behind the Man home"><img src="assets/favicon.jpg" alt=""></a>
      <div class="chapter-progress">
        <strong>${escapeHtml(page.shortTitle)}</strong>
        <span>Chapter ${page.chapter} of 13</span>
      </div>
      <div class="header-actions">
        <button class="menu-button" type="button" data-menu-button aria-expanded="false" aria-controls="site-navigation">Menu</button>
      </div>
    </div>
  </header>
  <div class="nav-backdrop" data-nav-backdrop></div>
  <nav class="nav-drawer" id="site-navigation" data-nav-drawer aria-label="Complete site navigation" aria-hidden="true" inert>
    <div class="nav-drawer-header">
      <strong>Wander through the whole story</strong>
      <button class="drawer-close" type="button" data-menu-close aria-label="Close menu">×</button>
    </div>
    <ol>${navigation}</ol>
  </nav>`;
}

const heroMedia = {
  bloke: {
    src: 'assets/media/luke-aura-portrait.webp',
    alt: 'Luke in a bright striped shirt beside a many-coloured meditation figure',
    caption: 'One bloke, many colours, no clean little box.',
    sourceId: 'F39'
  },
  'personal-aura': {
    src: 'assets/media/starseed-code.webp',
    alt: 'Starseed Code album cover with colourful figures gathered around an infinity form',
    caption: 'The inner architecture became colour, people and song.',
    sourceId: 'F40'
  },
  'under-aura': {
    src: 'assets/media/luke-universal-creator.webp',
    alt: 'Luke reaching towards a glowing pillar in a playful cosmic scene',
    caption: 'Engineering begins where wonder gets specific.',
    sourceId: 'F42'
  },
  songs: {
    src: 'assets/media/a-protopian-gambit.png',
    alt: 'A Protopian Gambit cover with the i C. infinity ring, a glowing chess piece and a hand above Australia',
    caption: 'A Protopian Gambit. The wager is that imagination can become practical care.',
    sourceId: 'F29'
  },
  minjerribah: {
    src: 'assets/media/straddie-fun.webp',
    alt: 'Songs of Straddie cover with sea, pandanus leaves and the i C. infinity ring',
    caption: 'The large horizon starts at the island edge.',
    sourceId: 'F41'
  },
  'earth-infinity': {
    src: 'assets/media/a-protopian-gambit.webp',
    alt: 'A luminous speculative scene with a crystalline figure, a human form and a tunnel of light',
    caption: 'A visual rehearsal for futures that do not exist yet.',
    sourceId: 'F43'
  }
};

const soundtrackArtwork = {
  'Album 3: Starseed Code': 'assets/media/starseed-code.webp',
  'Album 4: A Protopian Gambit': 'assets/media/a-protopian-gambit.png',
  'Album 5: Straddie Fun': 'assets/media/straddie-fun.webp'
};

function renderHero(page, pageContent) {
  const isHome = page.id === 'home';
  const origin = isHome
    ? 'Luke Catalyst Nathan Hayes | Minjerribah | Free thinking since 2012'
    : `Chapter ${page.chapter} of 13 | ${page.shortTitle}`;
  const actions = isHome
    ? `
      <a class="button primary" href="#torus-map">Turn the living index</a>
      <a class="button secondary" href="the-bloke.html#top">Meet the bloke</a>
      <a class="button secondary" href="choose-your-door.html#top">Find your way in</a>`
    : `
      <a class="button primary" href="#story">Enter this chapter</a>
      <a class="button secondary" href="sources.html#source-register">Open the studio archive</a>`;

  let stage;
  if (isHome) {
    stage = `
      <div class="hero-stage torus-stage" id="torus-map">
        <canvas class="torus-canvas" data-horn-torus tabindex="0" aria-describedby="torus-instructions">
          An interactive 288-facet horn torus carrying Luke's public links and source archive.
        </canvas>
        <p class="torus-instructions" id="torus-instructions">Drag to turn it. Tap one of the marked outer facets and its story will appear below. Scroll or pinch to move closer, but the view always stays outside.</p>
        <div class="facet-whisper" aria-live="polite">
          <div class="facet-glimpse" data-facet-glimpse aria-hidden="true">
            <img data-facet-preview alt="" hidden>
            <span class="facet-symbol" data-facet-symbol></span>
            <b data-facet-sequence></b>
          </div>
          <div class="facet-words">
            <span data-facet-address>A thread from the outer ring</span>
            <strong data-facet-title>The torus is waking up</strong>
            <p data-facet-story>Every public link and every document in this working archive has a place on the broad outside rows.</p>
          </div>
          <div class="facet-actions">
            <button class="button facet-open" type="button" data-facet-open>Open this thread</button>
            <button class="text-button" type="button" data-facet-shuffle>Surprise me</button>
            <button class="text-button" type="button" data-torus-reset>Reset the view</button>
          </div>
        </div>
      </div>`;
  } else if (heroMedia[page.id]) {
    const media = heroMedia[page.id];
    stage = `
      <figure class="hero-stage image-stage">
        <div class="hero-glow"></div>
        <img src="${media.src}" alt="${escapeHtml(media.alt)}" ${page.id === 'songs' ? 'fetchpriority="high"' : 'loading="lazy"'}>
        <figcaption>${escapeHtml(media.caption)} <button class="source-thread inline" type="button" data-source="${media.sourceId}">See where it came from</button></figcaption>
      </figure>`;
  } else {
    stage = `
      <div class="hero-stage" aria-hidden="true">
        <div class="hero-glow"></div>
        <div class="chapter-art"><span>${escapeHtml(page.chapter)}</span><strong>${escapeHtml(page.shortTitle)}</strong></div>
      </div>`;
  }

  const mature = page.id === 'love' ? `
    <aside class="mature-notice">
      <strong>A grown-up chapter</strong>
      <p>This is a frank but non-explicit story about love, sexuality, non-monogamy, family and imagined embodied companions. The separate adult-only branch still has a clear doorway before you leave this site.</p>
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

function renderStory(pageContent) {
  return `
  <section class="story-opening" id="story">
    <div class="page-shell story-flow">
      ${pageContent.story.paragraphs.map((paragraph, index) => `<p${index === 0 ? ' class="story-lede"' : ''}>${escapeHtml(paragraph)}</p>`).join('')}
    </div>
  </section>`;
}

function renderSourceButtons(ids = []) {
  return [...new Set(ids)].filter((id) => sourceById.has(id)).map((id) => {
    const source = sourceById.get(id);
    return `<button class="source-thread" type="button" data-source="${escapeHtml(id)}">${escapeHtml(source.title)}</button>`;
  }).join('');
}

function renderStoryCard(card, index) {
  const isAdult = card.href?.includes('grey-area-commons');
  let externalLink = '';
  if (card.href) {
    externalLink = isAdult
      ? `<button class="button secondary" type="button" data-adult-link="${escapeHtml(card.href)}">Read the adult boundary first</button>`
      : `<a class="external-card-link" href="${escapeHtml(card.href)}"${externalAttributes(card.href)}>Follow this into the live work</a>`;
  }

  return `
  <article class="story-card story-card-${index % 6}">
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
    ['Luke Nathan Hayes', 'The person in the middle of all this: hands, doubts, appetite, memory and a very full hard drive.', []],
    ['Luke Catalyst', 'The public systems thinker who turns an awkward question into a diagram, a talk or a working experiment.', ['U25']],
    ['Strange but True', 'The bloke at the market table who helps with technology, art, local work and whatever odd problem walked in that morning.', ['U12']],
    ['i C. infinity', 'The musical self who sings the emotional architecture before the rest of Luke has finished explaining it.', ['U23']],
    ['Tiggy Bestmann', 'The romantic traveller: playful, slightly aloof, forever turning a map, a chance meeting or an impossible system into a love story.', ['U17']],
    ['Australian Sire', 'The hotter adult-fantasy register: not a title simply worn, but a name the character earns through real wins, kept promises and adult trust.', ['U17']],
    ['Aura of Intelligence', 'The long arc: one person trying to make mind, memory, sovereignty and relationship navigable without claiming to have finished the machine.', ['U05']],
    ['GAJRA Earth', 'The planetary invitation, imagined as a harbour where different projects can meet without becoming one throne.', ['U20']],
    ['ready SET Co-op', 'The still-proposed co-operative path from useful local work towards shared training, tools and infrastructure.', ['U09']],
    ['Project Atlas', 'The map on the wall: a way to walk between Luke\'s public worlds and see how they connect.', ['U13']]
  ];
  return `
  <section class="section identity-section">
    <div class="page-shell">
      <div class="section-heading">
        <h2>One man, several ways of speaking</h2>
        <p>They are not a row of brands. They are names Luke writes, works, sings, dreams and sometimes misbehaves under.</p>
      </div>
      <div class="identity-constellation">
        ${identities.map(([name, meaning, sourceIds], index) => `<article class="identity-card identity-card-${index % 5}"><h3>${escapeHtml(name)}</h3><p>${escapeHtml(meaning)}</p><div class="story-card-footer">${renderSourceButtons(sourceIds)}</div></article>`).join('')}
      </div>
    </div>
  </section>`;
}

function renderControversies(pageId) {
  const items = controversies.filter((item) => item.page === pageId);
  if (!items.length) return '';
  return `
  <section class="section">
    <div class="page-shell">
      <div class="section-heading">
        <h2>Questions with their sleeves rolled up</h2>
        <p>These ideas are allowed to be bold, funny and unfinished. The story says what exists, what does not, and what might make Luke change his mind.</p>
      </div>
      ${items.map((item) => `
        <article class="controversy-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="controversy-lede">${escapeHtml(item.idea)} ${escapeHtml(item.meaning)}</p>
          <p>${escapeHtml(item.care)}</p>
          <p>${escapeHtml(item.exists)} ${escapeHtml(item.notYet)}</p>
          <p class="change-mind">${escapeHtml(item.change)}</p>
          <div class="story-card-footer">${renderSourceButtons(item.sourceIds)}</div>
        </article>`).join('')}
    </div>
  </section>`;
}

function renderSoundtrack(soundtrack) {
  if (!soundtrack?.title) return '';
  const artwork = soundtrackArtwork[soundtrack.album] || 'assets/favicon.jpg';
  return `
  <section class="section compact">
    <div class="page-shell soundtrack-card">
      <img class="soundtrack-disc" src="assets/favicon.jpg" alt="">
      <div>
        <p>Let this chapter sound like</p>
        <h2>${escapeHtml(soundtrack.title)}</h2>
        <p>${escapeHtml(soundtrack.album)}</p>
        <p>${escapeHtml(soundtrack.reason)}</p>
        <small>The lyric is here now. Luke will add the video when the right recording reaches this laptop.</small>
        <div class="story-card-footer">${renderSourceButtons(soundtrack.sourceIds)}</div>
      </div>
      <div class="soundtrack-phone" role="img" aria-label="Smartphone placeholder for a future video of ${escapeHtml(soundtrack.title)}">
        <div class="phone-screen">
          <img src="${artwork}" alt="" loading="lazy">
          <div class="phone-screen-copy">
            <span class="phone-play" aria-hidden="true"></span>
            <strong>${escapeHtml(soundtrack.title)}</strong>
            <small>This screen is waiting for the right recording.</small>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function renderSourceRoom(pageId) {
  if (pageId !== 'sources') return '';
  const records = sources.map((source) => {
    const link = source.url || source.publicPath;
    const primaryPage = pages.find((page) => page.chapter === source.primaryPage);
    const archiveSentence = source.availability === 'public-link'
      ? 'This thread already opens onto the public web.'
      : source.availability === 'published-source'
        ? 'Luke chose to show this source inside this site.'
        : source.availability === 'local-reviewed-candidate'
          ? 'The original is on this laptop, while the complete file stays in Luke\'s working archive.'
          : 'The record remains, but the original is somewhere in Luke\'s wider archive rather than on this laptop.';
    return `
      <article class="source-record" data-source-record data-source-type="${escapeHtml(source.type)}" data-availability="${escapeHtml(source.availability)}">
        <span class="source-id">${escapeHtml(source.id)}</span>
        <div>
          <h3>${escapeHtml(source.title)}</h3>
          <p>${escapeHtml(source.notes)} ${escapeHtml(archiveSentence)}</p>
          ${primaryPage ? `<p>It first enters the story in Chapter ${escapeHtml(primaryPage.chapter)}, ${escapeHtml(primaryPage.title)}.</p>` : ''}
          <details class="source-provenance">
            <summary>Where this came from</summary>
            <p>${escapeHtml(source.status)}. ${escapeHtml(source.authorship)}.</p>
            ${source.availability !== 'public-link' ? `<p class="archive-name">Archive name: ${escapeHtml(source.location)}</p>` : ''}
            ${source.canonicalTitle && source.canonicalTitle !== source.title ? `<p>Live page title: ${escapeHtml(source.canonicalTitle)}</p>` : ''}
            ${source.checkedOn ? `<p>Link checked: ${escapeHtml(source.checkedOn)}</p>` : ''}
          </details>
          ${link ? `<a href="${escapeHtml(link)}"${externalAttributes(link)}>Open ${source.url ? 'the live work' : 'the source'}</a>` : ''}
        </div>
      </article>`;
  }).join('');

  return `
  <section class="section" id="source-register">
    <div class="page-shell">
      <div class="section-heading">
        <h2>The open studio archive</h2>
        <p>There are ${sources.length} threads here: ${publicLinkCount} paths onto the public web and ${heldSourceCount} documents, images and creative traces from Luke's own archive. Some originals are on this laptop. Some are elsewhere. Nothing missing has been quietly invented to fill the gap.</p>
      </div>
      <div class="source-room-controls">
        <label class="visually-hidden" for="source-search">Search the source register</label>
        <input class="source-search" id="source-search" type="search" placeholder="Search titles, notes or source IDs" data-source-search>
        <label class="visually-hidden" for="source-filter">Filter the source register</label>
        <select class="source-select" id="source-filter" data-source-filter>
          <option value="all">Everything in the room</option>
          <option value="website">Websites</option>
          <option value="document">Documents</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="published-source">Shown on this site</option>
          <option value="local-reviewed-candidate">Original on this laptop</option>
          <option value="missing-locally">Original elsewhere</option>
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
        <p>Your choice changes the suggested order, not the story and not what you are allowed to see.</p>
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
      <div class="section-heading"><h2>Fourteen chapters</h2><p>The whole wandering route, from one person to the wider horizon.</p></div>
      <ol class="site-map-list">${pageLinks}</ol>
    </div>
  </section>
  <section class="section">
    <div class="page-shell">
      <div class="section-heading"><h2>Explore the public worlds</h2><p>These doors lead into the separate sites and experiments growing around this story.</p></div>
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
      <h2 id="source-dialog-title" data-dialog-title>The thread behind this facet</h2>
      <p data-dialog-body></p>
      <p class="dialog-context" data-dialog-context></p>
      <p class="archive-name" data-dialog-filename hidden></p>
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
      <p class="footer-note">Built solo on Minjerribah by Luke Nathan Hayes through Strange but True. Art, autobiography, unfinished systems and the paths back to their sources.</p>
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
  <link rel="icon" type="image/jpeg" href="assets/favicon.jpg">
  <link rel="apple-touch-icon" href="assets/favicon.jpg">
  <link rel="stylesheet" href="styles/tokens.css?v=${assetVersion}">
  <link rel="stylesheet" href="styles/base.css?v=${assetVersion}">
  <link rel="stylesheet" href="styles/components.css?v=${assetVersion}">
  <link rel="stylesheet" href="styles/motion.css?v=${assetVersion}">
  ${personSchema}
</head>
<body data-page="${escapeHtml(page.id)}" data-theme="${escapeHtml(page.theme)}">
  ${renderHeader(page)}
  <main id="top" tabindex="-1">
    ${renderHero(page, pageContent)}
    <div id="page-content" tabindex="-1">
      ${renderStory(pageContent)}
      ${renderIdentityPanel(page.id)}
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
  <script type="module" src="scripts/app.js?v=${assetVersion}"></script>
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
