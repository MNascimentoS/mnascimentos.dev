// Gera o site em dist/. Uso: node src/build.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markdown, parseFrontmatter, escapeHtml as e, slugify } from './markdown.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));
const SITES = { pt: readJson('site.json'), en: readJson('site.en.json') };
// hash do CSS na URL: cada deploy invalida o cache do navegador
const CSS_VERSION = crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, 'src/styles.css'))).digest('hex').slice(0, 8);
const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

fs.rmSync(DIST, { recursive: true, force: true });
const write = (rel, data) => {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
};

// ---------- README do GitHub ----------
// readme: https://github.com/usuario/repo  →  baixa o README e usa como conteúdo do post
async function fetchReadme(repoUrl) {
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!m) throw new Error(`URL de repositório inválida: ${repoUrl}`);
  const [, owner, repo] = m;
  const headers = { Accept: 'application/vnd.github.raw', 'User-Agent': 'mnascimentos.dev' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  // remove o título principal do README (o post já tem título)
  return {
    text: text.replace(/^\s*#\s+.*\n/, ''),
    base: { raw: `https://github.com/${owner}/${repo}/raw/HEAD/`, blob: `https://github.com/${owner}/${repo}/blob/HEAD/` },
    label: `github.com/${owner}/${repo}`,
  };
}

// ---------- posts ----------
const postsDir = path.join(ROOT, 'content/posts');
const posts = [];
for (const f of fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'))) {
  const { data, body } = parseFrontmatter(fs.readFileSync(path.join(postsDir, f), 'utf8'));
  if (data.draft) continue;
  let html = markdown(body, { base: null }).html;
  let words = body;
  let source = null;
  if (data.readme) {
    try {
      const r = await fetchReadme(data.readme);
      html += markdown(r.text, { base: r.base }).html;
      words += r.text;
      source = { label: r.label, url: data.readme };
    } catch (err) {
      console.warn(`⚠ README não carregado para "${f}": ${err.message}`);
      source = { label: data.readme.replace(/^https?:\/\//, ''), url: data.readme };
      html += `<p class="muted">README:  <a href="${e(data.readme)}">${e(source.label)}</a></p>`;
    }
    markdown('', { base: null });
  }
  posts.push({
    ...data,
    lang: data.lang === 'en' ? 'en' : 'pt',
    tags: asArray(data.tags),
    slug: data.slug || slugify(f.replace(/(\.(en|pt))?\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')),
    date: String(data.date).slice(0, 10),
    minutes: Math.max(1, Math.round(words.split(/\s+/).length / 200)),
    html,
    source,
  });
}
posts.sort((a, b) => b.date.localeCompare(a.date));

// ---------- textos de interface ----------
const UI = {
  pt: {
    htmlLang: 'pt-BR', home: 'início', projects: 'projetos', blog: 'blog',
    featured: 'Destaques', allProjects: 'todos os projetos →', latestPosts: 'Últimos posts', allPosts: 'todos os posts →', soon: 'Em breve.',
    experience: 'Experiência', education: 'Formação', stack: 'Stack', cv: 'Currículo', personal: 'Pessoal',
    projectsTitle: 'Projetos', projectsLead: 'O que construí em empresas e por conta própria.', work: 'Empresariais', personalPl: 'Pessoais',
    blogLead: 'Processos de desenvolvimento, decisões e aprendizados.', readmeFrom: 'README de', notFound: 'Página não encontrada.', back: 'Voltar ao início',
  },
  en: {
    htmlLang: 'en', home: 'home', projects: 'projects', blog: 'blog',
    featured: 'Highlights', allProjects: 'all projects →', latestPosts: 'Latest posts', allPosts: 'all posts →', soon: 'Coming soon.',
    experience: 'Experience', education: 'Education', stack: 'Stack', cv: 'Resume', personal: 'Personal',
    projectsTitle: 'Projects', projectsLead: 'What I built at companies and on my own.', work: 'Work', personalPl: 'Personal',
    blogLead: 'Development process, decisions and lessons learned.', readmeFrom: 'README from', notFound: 'Page not found.', back: 'Back home',
  },
};

// Rotas equivalentes em cada idioma (usadas pelo botão PT/EN)
const ROUTES = {
  pt: { home: '/', projects: '/projetos/', blog: '/blog/' },
  en: { home: '/en/', projects: '/en/projects/', blog: '/en/blog/' },
};

// Links internos viram relativos (../styles.css etc.), assim o site funciona
// em mnascimentos.dev, em usuario.github.io/repo/ e abrindo o arquivo direto.
const relativize = (html, p) => {
  const depth = p.split('/').filter(Boolean).length;
  const prefix = depth ? '../'.repeat(depth) : './';
  return html.replace(/(href|src|poster)="\/(?!\/)([^"]*)"/g, (_, attr, rest) => `${attr}="${prefix}${rest}"`);
};

const link = (label, url) => `<a href="${e(url)}"${/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : ''}>${e(label)}</a>`;
const tags = (list) => (list && list.length ? `<span class="tags">${list.map((t) => `<span class="tag">${e(t)}</span>`).join('')}</span>` : '');

// Vídeo do projeto: arquivo próprio (.mp4/.webm em public/videos) ou YouTube.
const media = (p) => {
  if (!p.media) return '';
  if (/\.(mp4|webm)$/i.test(p.media)) {
    return `<div class="media"><video src="${e(p.media)}" controls preload="metadata" playsinline${p.poster ? ` poster="${e(p.poster)}"` : ''}></video></div>`;
  }
  const yt = p.media.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
  if (yt) return `<div class="media yt"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="${e(p.name)}" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
  return '';
};

function buildLang(lang) {
  const site = SITES[lang];
  const t = UI[lang];
  const R = ROUTES[lang];
  const other = lang === 'pt' ? 'en' : 'pt';
  const langPosts = posts.filter((p) => p.lang === lang);
  const postUrl = (p) => `${R.blog}${p.slug}/`;

  const page = ({ path: p, key, alt, title, description = site.bio, body }) => {
    const altPath = alt === undefined ? ROUTES[other][key] || ROUTES[other].home : alt;
    const nav = [['home', R.home, t.home], ['projects', R.projects, t.projects], ['blog', R.blog, t.blog]];
    const html = `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(description)}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${site.url}${p}">
<meta name="theme-color" content="#0f1216">
<link rel="canonical" href="${site.url}${p}">
${altPath ? `<link rel="alternate" hreflang="${UI[other].htmlLang}" href="${site.url}${altPath}">` : ''}
<link rel="icon" href="/favicon.svg">
<link rel="alternate" type="application/rss+xml" href="${R.home}rss.xml">
<link rel="stylesheet" href="/styles.css?v=${CSS_VERSION}">
</head>
<body>
<nav class="nav">
  <div class="wrap">
    <a class="logo" href="${R.home}">mns ~/</a>
    <div>${nav.map(([k, href, label]) => `<a href="${href}"${k === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
      ${altPath ? `<a class="lang" href="${altPath}" hreflang="${UI[other].htmlLang}">${other.toUpperCase()}</a>` : ''}
    </div>
  </div>
</nav>
<main class="wrap">
${body}
</main>
<footer><div class="wrap">${e(site.url.replace(/^https?:\/\//, ''))} · <a href="${R.home}rss.xml">rss</a></div></footer>
</body>
</html>`;
    write(p === '/' ? 'index.html' : `${p.slice(1)}index.html`, relativize(html, p));
  };

  const card = (p, kind, showKind = false) => {
    const links = [
      p.apk && link('apk ↓', p.apk),
      p.github && link('github', p.github),
      p.playstore && link('play store', p.playstore),
      p.url && link('site', p.url),
      p.video && link(lang === 'pt' ? 'vídeo no linkedin' : 'video on linkedin', p.video),
      p.post && `<a href="${R.blog}${e(p.post)}/">post</a>`,
    ].filter(Boolean);
    const meta = [p.where || (showKind && kind === 'personal' ? t.personal : ''), p.year].filter(Boolean).join(' · ');
    return `
<div class="card">
  <div class="row"><strong>${e(p.name)}</strong><span class="muted small">${e(meta)}</span></div>
  <p>${e(p.description)}</p>
  ${p.impact ? `<p class="impact">→ ${e(p.impact)}</p>` : ''}
  ${tags(p.stack)}
  ${p.image ? `<img src="${e(p.image)}" alt="${e(p.name)}" loading="lazy">` : ''}
  ${media(p)}
  ${links.length ? `<p class="links small">${links.join('')}</p>` : ''}
</div>`;
  };

  const postRow = (p) => `
<div class="post-row">
  <span class="date">${p.date}</span>
  <div>
    <a href="${postUrl(p)}">${e(p.title)}</a>
    ${p.description ? `<p class="muted small">${e(p.description)}</p>` : ''}
    ${tags(p.tags)}
  </div>
</div>`;

  const xpRow = (year, title, sub) => `
  <div class="xp">
    <span class="date">${e(year)}</span>
    <div>${title}${sub ? `<p class="muted small">${e(sub)}</p>` : ''}</div>
  </div>`;

  // início
  const featured = [...site.work, ...site.personal].filter((p) => p.featured);
  page({
    path: R.home, key: 'home',
    title: `${site.name} — ${site.role}`,
    body: `
<header class="intro cols">
  <div>
    <h1>${e(site.name)}</h1>
    <p class="muted">${e(site.role)} · ${e(site.location)}</p>
    <p class="links">${site.links.map((l) => link(l.label, l.url)).join('')}</p>
    ${site.facts ? `<dl class="facts">${site.facts.map((f) => `<div><dt>${e(f.key)}</dt><dd>${e(f.value)}</dd></div>`).join('')}</dl>` : ''}
  </div>
  <div>${site.about.map((x) => `<p>${e(x)}</p>`).join('')}</div>
</header>

<div class="cols">
  <div>
    <section>
      <h2>${t.featured}</h2>
      ${featured.map((p) => card(p, site.personal.includes(p) ? 'personal' : 'work', true)).join('')}
      <p class="more"><a href="${R.projects}">${t.allProjects}</a></p>
    </section>
    <section>
      <h2>${t.latestPosts}</h2>
      ${langPosts.length ? langPosts.slice(0, 3).map(postRow).join('') : `<p class="muted">${t.soon}</p>`}
      <p class="more"><a href="${R.blog}">${t.allPosts}</a></p>
    </section>
  </div>
  <div>
    <section>
      <h2>${t.experience}</h2>
      ${site.experience.map((x) => xpRow(x.year, `<strong>${e(x.role)}</strong> · ${e(x.company)}`, x.note)).join('')}
    </section>
    <section>
      <h2>${t.education}</h2>
      ${site.education.map((x) => xpRow(x.year, `<strong>${e(x.title)}</strong>`, x.where)).join('')}
      <p class="muted small" style="margin-top:12px">${e(site.languages)}</p>
    </section>
    <section>
      <h2>${t.stack}</h2>
      ${tags(site.stack)}
    </section>
    <section>
      <h2>${t.cv}</h2>
      <p class="links">${site.cv.map((l) => link(l.label, l.url)).join('')}</p>
    </section>
  </div>
</div>`,
  });

  // projetos
  page({
    path: R.projects, key: 'projects',
    title: `${t.projectsTitle} — ${site.name}`,
    description: t.projectsLead,
    body: `
<h1>${t.projectsTitle}</h1>
<p class="muted">${t.projectsLead}</p>
<div class="cols">
  <section>
    <h2>${t.work}</h2>
    ${site.work.map((p) => card(p, 'work')).join('')}
  </section>
  <section>
    <h2>${t.personalPl}</h2>
    ${site.personal.map((p) => card(p, 'personal')).join('')}
  </section>
</div>`,
  });

  // blog
  page({
    path: R.blog, key: 'blog',
    title: `Blog — ${site.name}`,
    description: t.blogLead,
    body: `
<div class="narrow">
<h1>Blog</h1>
<p class="muted">${t.blogLead} <a href="${R.home}rss.xml">rss</a></p>
<section>
  ${langPosts.length ? langPosts.map(postRow).join('') : `<p class="muted">${t.soon}</p>`}
</section>
</div>`,
  });

  langPosts.forEach((p, i) => {
    const newer = langPosts[i - 1];
    const older = langPosts[i + 1];
    // tradução: post do outro idioma com o mesmo "translation" (ou mesmo slug)
    const tr = posts.find((x) => x.lang === other && ((p.translation && x.translation === p.translation) || x.slug === p.slug));
    page({
      path: postUrl(p), key: 'blog',
      alt: tr ? `${ROUTES[other].blog}${tr.slug}/` : ROUTES[other].blog,
      title: `${p.title} — ${site.name}`,
      description: p.description,
      body: `
<div class="narrow">
<p class="small"><a href="${R.blog}">← blog</a></p>
<article>
  <h1>${e(p.title)}</h1>
  <p class="date">${p.date} · ${p.minutes} min</p>
  ${p.source ? `<p><a class="source" href="${e(p.source.url)}" target="_blank" rel="noopener">↳ ${t.readmeFrom} ${e(p.source.label)}</a></p>` : ''}
  ${tags(p.tags)}
  <div class="prose">${p.html}</div>
</article>
<nav class="pager small">
  ${older ? `<a href="${postUrl(older)}">← ${e(older.title)}</a>` : '<span></span>'}
  ${newer ? `<a href="${postUrl(newer)}">${e(newer.title)} →</a>` : ''}
</nav>
</div>`,
    });
  });

  write(`${R.home.slice(1)}rss.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${e(site.name)}</title><link>${site.url}${R.home}</link><description>${e(site.role)}</description><language>${t.htmlLang}</language>
${langPosts.map((p) => `<item><title>${e(p.title)}</title><link>${site.url}${postUrl(p)}</link><guid>${site.url}${postUrl(p)}</guid><pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate></item>`).join('\n')}
</channel></rss>`);

  return page;
}

const ptPage = buildLang('pt');
buildLang('en');

// 404 (único, em PT com link para EN)
ptPage({ path: '/404/', key: '', alt: '/en/', title: '404', body: `<h1>404</h1><p class="muted">${UI.pt.notFound} <a href="/">${UI.pt.back}</a> · <a href="/en/">${UI.en.back}</a></p>` });
fs.renameSync(path.join(DIST, '404/index.html'), path.join(DIST, '404.html'));
fs.rmdirSync(path.join(DIST, '404'));

fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src/styles.css'), path.join(DIST, 'styles.css'));
console.log(`✔ dist/ gerado (pt: ${posts.filter((p) => p.lang === 'pt').length} posts, en: ${posts.filter((p) => p.lang === 'en').length} posts)`);
