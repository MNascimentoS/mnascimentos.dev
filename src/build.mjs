// Gera o site em dist/. Uso: node src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markdown, parseFrontmatter, escapeHtml as e, slugify } from './markdown.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));
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
      html += `<p class="muted">Leia o README completo em <a href="${e(data.readme)}">${e(source.label)}</a>.</p>`;
    }
    markdown('', { base: null });
  }
  posts.push({
    ...data,
    tags: asArray(data.tags),
    slug: data.slug || slugify(f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')),
    date: String(data.date).slice(0, 10),
    minutes: Math.max(1, Math.round(words.split(/\s+/).length / 200)),
    html,
    source,
  });
}
posts.sort((a, b) => b.date.localeCompare(a.date));

// ---------- layout ----------
const NAV = [['/', 'início'], ['/projetos/', 'projetos'], ['/blog/', 'blog'], ['/sobre/', 'sobre']];

const page = ({ path: p, title, description = site.bio, body }) => write(p === '/' ? 'index.html' : `${p.slice(1)}index.html`, `<!doctype html>
<html lang="pt-BR">
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
<link rel="icon" href="/favicon.svg">
<link rel="alternate" type="application/rss+xml" href="/rss.xml">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<nav class="nav">
  <div class="wrap">
    <a class="logo" href="/">mn ~/</a>
    <div>${NAV.map(([href, label]) => {
      const on = href === '/' ? p === '/' : p.startsWith(href);
      return `<a href="${href}"${on ? ' aria-current="page"' : ''}>${label}</a>`;
    }).join('')}</div>
  </div>
</nav>
<main class="wrap">
${body}
</main>
<footer><div class="wrap">${e(site.url.replace(/^https?:\/\//, ''))} · <a href="/rss.xml">rss</a></div></footer>
</body>
</html>`);

// ---------- componentes ----------
const link = (label, url) => `<a href="${e(url)}"${/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : ''}>${e(label)}</a>`;
const tags = (list) => (list.length ? `<span class="tags">${list.map((t) => `<span class="tag">${e(t)}</span>`).join('')}</span>` : '');

const card = (p, kind, showKind = false) => {
  const links = [
    p.apk && link('apk ↓', p.apk),
    p.github && link('github', p.github),
    p.playstore && link('play store', p.playstore),
    p.url && link('site', p.url),
    p.post && `<a href="/blog/${e(p.post)}/">post</a>`,
  ].filter(Boolean);
  const meta = [p.where || (showKind && kind === 'personal' ? 'Pessoal' : ''), p.year].filter(Boolean).join(' · ');
  return `
<div class="card">
  <div class="row"><strong>${e(p.name)}</strong><span class="muted small">${e(meta)}</span></div>
  <p>${e(p.description)}</p>
  ${p.impact ? `<p class="impact">→ ${e(p.impact)}</p>` : ''}
  ${p.image ? `<img src="${e(p.image)}" alt="${e(p.name)}" loading="lazy">` : ''}
  ${links.length ? `<p class="links small">${links.join('')}</p>` : ''}
</div>`;
};

const postRow = (p) => `
<div class="post-row">
  <span class="date">${p.date}</span>
  <div>
    <a href="/blog/${p.slug}/">${e(p.title)}</a>
    ${p.description ? `<p class="muted small">${e(p.description)}</p>` : ''}
    ${tags(p.tags)}
  </div>
</div>`;

// ---------- início ----------
const featured = [...site.work, ...site.personal].filter((p) => p.featured);
page({
  path: '/',
  title: `${site.name} — ${site.role}`,
  body: `
<header class="intro">
  <h1>${e(site.name)}</h1>
  <p class="muted">${e(site.role)} · ${e(site.location)}</p>
  <p>${e(site.bio)}</p>
  <p class="links">${site.links.map((l) => link(l.label, l.url)).join('')}</p>
</header>

<section>
  <h2>Destaques</h2>
  ${featured.map((p) => card(p, site.personal.includes(p) ? 'personal' : 'work', true)).join('')}
  <p class="more"><a href="/projetos/">todos os projetos →</a></p>
</section>

<section>
  <h2>Últimos posts</h2>
  ${posts.length ? posts.slice(0, 3).map(postRow).join('') : '<p class="muted">Em breve.</p>'}
  ${posts.length > 3 ? '<p class="more"><a href="/blog/">todos os posts →</a></p>' : ''}
</section>`,
});

// ---------- projetos ----------
page({
  path: '/projetos/',
  title: `Projetos — ${site.name}`,
  description: 'Projetos empresariais e pessoais.',
  body: `
<h1>Projetos</h1>
<p class="muted">O que construí em empresas e por conta própria.</p>
<section>
  <h2>Empresariais</h2>
  ${site.work.map((p) => card(p, 'work')).join('')}
</section>
<section>
  <h2>Pessoais</h2>
  ${site.personal.map((p) => card(p, 'personal')).join('')}
</section>`,
});

// ---------- blog ----------
page({
  path: '/blog/',
  title: `Blog — ${site.name}`,
  description: 'Processos de desenvolvimento dos meus projetos.',
  body: `
<h1>Blog</h1>
<p class="muted">Processos de desenvolvimento, decisões e aprendizados. <a href="/rss.xml">rss</a></p>
<section>
  ${posts.length ? posts.map(postRow).join('') : '<p class="muted">Em breve.</p>'}
</section>`,
});

posts.forEach((p, i) => {
  const newer = posts[i - 1];
  const older = posts[i + 1];
  page({
    path: `/blog/${p.slug}/`,
    title: `${p.title} — ${site.name}`,
    description: p.description,
    body: `
<p class="small"><a href="/blog/">← blog</a></p>
<article>
  <h1>${e(p.title)}</h1>
  <p class="date">${p.date} · ${p.minutes} min</p>
  ${p.source ? `<p><a class="source" href="${e(p.source.url)}" target="_blank" rel="noopener">↳ README de ${e(p.source.label)}</a></p>` : ''}
  ${tags(p.tags)}
  <div class="prose">${p.html}</div>
</article>
<nav class="pager small">
  ${older ? `<a href="/blog/${older.slug}/">← ${e(older.title)}</a>` : '<span></span>'}
  ${newer ? `<a href="/blog/${newer.slug}/">${e(newer.title)} →</a>` : ''}
</nav>`,
  });
});

// ---------- sobre ----------
page({
  path: '/sobre/',
  title: `Sobre — ${site.name}`,
  body: `
<h1>Sobre</h1>
${site.about.map((t) => `<p>${e(t)}</p>`).join('')}
<section>
  <h2>Experiência</h2>
  ${site.experience.map((x) => `
  <div class="xp">
    <span class="date">${e(x.year)}</span>
    <div><strong>${e(x.role)}</strong> · ${e(x.company)}${x.note ? `<p class="muted small">${e(x.note)}</p>` : ''}</div>
  </div>`).join('')}
</section>
<section>
  <h2>Formação</h2>
  ${site.education.map((x) => `<div class="xp"><span class="date">${e(x.year)}</span><div><strong>${e(x.title)}</strong><p class="muted small">${e(x.where)}</p></div></div>`).join('')}
  <p class="muted small" style="margin-top:12px">${e(site.languages)}</p>
</section>
<section>
  <h2>Stack</h2>
  ${tags(site.stack)}
</section>
<section>
  <h2>Contato</h2>
  <p class="links">${[...site.links.filter((l) => l.label !== 'cv'), ...site.cv].map((l) => link(l.label, l.url)).join('')}</p>
</section>`,
});

// ---------- 404, rss ----------
page({ path: '/404/', title: '404', body: '<h1>404</h1><p class="muted">Página não encontrada. <a href="/">Voltar ao início</a></p>' });
fs.renameSync(path.join(DIST, '404/index.html'), path.join(DIST, '404.html'));
fs.rmdirSync(path.join(DIST, '404'));

write('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${e(site.name)}</title><link>${site.url}</link><description>${e(site.role)}</description>
${posts.map((p) => `<item><title>${e(p.title)}</title><link>${site.url}/blog/${p.slug}/</link><guid>${site.url}/blog/${p.slug}/</guid><pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate></item>`).join('\n')}
</channel></rss>`);

fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src/styles.css'), path.join(DIST, 'styles.css'));
console.log(`✔ dist/ gerado (${posts.length} posts)`);
