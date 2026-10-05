// Conversor Markdown -> HTML minimalista e sem dependências.
// Suporta: frontmatter, títulos, parágrafos, listas (ordenadas/não ordenadas),
// blocos de código com linguagem, citações, imagens, links, negrito, itálico,
// código inline, linhas horizontais e tabelas simples.

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function slugify(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Frontmatter no formato YAML simples (chave: valor; listas em [a, b] ou com "- item").
export function parseFrontmatter(src) {
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: src };
  const data = {};
  let currentListKey = null;
  for (const raw of match[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim()) continue;
    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentListKey) {
      data[currentListKey].push(parseValue(listItem[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === '') {
      data[key] = [];
      currentListKey = key;
    } else {
      data[key] = parseValue(value);
      currentListKey = null;
    }
  }
  return { data, body: src.slice(match[0].length) };
}

function parseValue(v) {
  v = v.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return splitList(inner).map(parseValue);
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function splitList(s) {
  const out = [];
  let cur = '';
  let quote = null;
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = null;
      cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function inline(text) {
  const codes = [];
  const keep = (html) => { codes.push(html); return `\u0000${codes.length - 1}\u0000`; };
  text = text.replace(/`([^`]+)`/g, (_, c) => keep(`<code>${escapeHtml(c)}</code>`));
  text = text.replace(/<\/?[a-zA-Z][^>]*>/g, (tag) => keep(rewriteHtml(tag)));
  text = escapeHtml(text);
  text = text
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt, src, title) =>
      `<figure><img src="${resolve(src, 'raw')}" alt="${alt}" loading="lazy" />${title ? `<figcaption>${title}</figcaption>` : ''}</figure>`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      href = resolve(href, 'blob');
      const ext = /^https?:\/\//.test(href);
      return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[i]);
}

// Base para resolver caminhos relativos (usado em READMEs do GitHub).
let BASE = null;
function resolve(url, kind) {
  if (!BASE || /^(https?:|mailto:|#|\/|data:)/.test(url)) return url;
  return BASE[kind] + url.replace(/^\.\//, '');
}
function rewriteHtml(tag) {
  return tag.replace(/\b(src|href)="([^"]+)"/g, (_, attr, url) => `${attr}="${resolve(url, attr === 'src' ? 'raw' : 'blob')}"`);
}

export function markdown(src, opts = {}) {
  if (opts.base !== undefined) BASE = opts.base;
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const headings = [];

  while (i < lines.length) {
    const line = lines[i];

    // Bloco de código
    const fence = line.match(/^```\s*([\w+-]*)/);
    if (fence) {
      const lang = fence[1];
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre class="code"${lang ? ` data-lang="${lang}"` : ''}><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    if (!line.trim()) { i++; continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const id = slugify(h[2]);
      if (level <= 3) headings.push({ level, id, text: h[2] });
      out.push(`<h${level} id="${id}">${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push('<hr />'); i++; continue; }

    // Bloco HTML (comum em READMEs): repassa como está
    if (/^\s*<(\/?[a-zA-Z]|!--)/.test(line)) {
      const buf = [];
      while (i < lines.length && lines[i].trim()) buf.push(lines[i++]);
      out.push(rewriteHtml(buf.join('\n')));
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${markdown(buf.join('\n')).html}</blockquote>`);
      continue;
    }

    // Tabela
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const row = (l) => l.trim().slice(1, -1).split('|').map((c) => c.trim());
      const head = row(line);
      i += 2;
      const body = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) body.push(row(lines[i++]));
      out.push(`<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody></table></div>`);
      continue;
    }

    const ul = /^\s*[-*+]\s+/;
    const ol = /^\s*\d+[.)]\s+/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line);
      const re = ordered ? ol : ul;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        let item = lines[i++].replace(re, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !re.test(lines[i])) item += ' ' + lines[i++].trim();
        const task = item.match(/^\[( |x)\]\s+(.*)$/i);
        items.push(task
          ? `<li class="task"><input type="checkbox" disabled${task[1] !== ' ' ? ' checked' : ''} /> ${inline(task[2])}</li>`
          : `<li>${inline(item)}</li>`);
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }

    // Parágrafo
    const buf = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^(#{1,6}\s|```|>|\s*[-*+]\s+|\s*\d+[.)]\s+|\|)/.test(lines[i])
    ) buf.push(lines[i++]);
    if (!buf.length) { buf.push(lines[i++]); }
    const content = inline(buf.join(' '));
    out.push(/^<figure>.*<\/figure>$/.test(content) ? content : `<p>${content}</p>`);
  }

  return { html: out.join('\n'), headings };
}

export function readingTime(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
