// Realce de sintaxe simples, sem dependências, gerado no build.
// Suporta yaml, bash e jinja; outras linguagens saem só escapadas.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const span = (cls, s) => (s ? `<span class="tk-${cls}">${esc(s)}</span>` : '');

// aplica uma lista de [regex, classe] no texto, da esquerda para a direita
function scan(text, rules) {
  let out = '';
  let rest = text;
  while (rest) {
    let best = null;
    for (const [re, cls] of rules) {
      re.lastIndex = 0;
      const m = re.exec(rest);
      if (m && (!best || m.index < best.m.index)) best = { m, cls };
    }
    if (!best) { out += esc(rest); break; }
    out += esc(rest.slice(0, best.m.index));
    out += typeof best.cls === 'function' ? best.cls(best.m) : span(best.cls, best.m[0]);
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return out;
}

const TEMPLATE = [/\{%.*?%\}|\{\{.*?\}\}/g, 'tmpl'];
const STRING = [/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, 'str'];

const yamlValue = (v) => scan(v, [
  TEMPLATE,
  STRING,
  [/\s#.*$/g, 'com'],
  [/(?<![\w.:/-])-?\d+(?:\.\d+)?(?![\w.:/-])/g, 'num'],
  [/\b(?:true|false|on|off|yes|no|null)\b/g, 'bool'],
  [/^\s*[>|][-+]?\s*$/g, 'punct'],
]);

function yaml(line) {
  if (/^\s*#/.test(line)) return span('com', line);
  if (/^\s*---\s*$/.test(line)) return span('punct', line);
  const m = line.match(/^(\s*)(-\s+)?([\w.\-]+|"[^"]*")(\s*:)(?=\s|$)(.*)$/);
  if (m) return esc(m[1]) + span('punct', m[2] || '') + span('key', m[3]) + span('punct', m[4]) + yamlValue(m[5]);
  const li = line.match(/^(\s*)(-\s+)(.*)$/);
  if (li) return esc(li[1]) + span('punct', li[2]) + yamlValue(li[3]);
  return yamlValue(line);
}

function bash(line) {
  if (/^\s*#/.test(line)) return span('com', line);
  const m = line.match(/^(\s*)([\w./-]+)(.*)$/);
  const head = m ? esc(m[1]) + span('cmd', m[2]) : '';
  const tail = m ? m[3] : line;
  return head + scan(tail, [
    [/\s#.*$/g, 'com'],
    STRING,
    [/(?<=\s)--?[\w-]+/g, 'flag'],
    [/\$\{?\w+\}?/g, 'var'],
    [/(\|\||&&|\||;)(\s*)([\w./-]+)?/g, (mm) => span('punct', mm[1]) + esc(mm[2]) + span('cmd', mm[3] || '')],
  ]);
}

const jinja = (line) => scan(line, [
  [/\{%-?|-?%\}|\{\{|\}\}/g, 'punct'],
  STRING,
  [/\b(?:for|in|endfor|if|elif|else|endif|set|and|or|not|is)\b/g, 'kw'],
  [/\|\s*\w+/g, 'flag'],
  [/\b\d+\b/g, 'num'],
]);

const LANGS = { yaml, yml: yaml, bash, sh: bash, shell: bash, jinja };

export function highlight(code, lang) {
  const fn = LANGS[(lang || '').toLowerCase()];
  return fn ? code.split('\n').map(fn).join('\n') : esc(code);
}
