---
title: Como este site foi feito
date: 2026-10-05
description: HTML estático, um script Node e GitHub Actions.
tags: [web, github-actions]
---

Sem framework. Um script Node lê dois tipos de arquivo e gera HTML:

- `content/site.json` — projetos, experiência e links
- `content/posts/*.md` — posts do blog

Um post pode ser escrito aqui ou vir direto do README de um repositório:

```yaml
---
title: Tiker: arquitetura do app
date: 2026-10-10
readme: https://github.com/usuario/tiker
---
```

A cada `git push` na `main`, o GitHub Actions roda `node src/build.mjs` e publica a pasta `dist/` no GitHub Pages, em `mnascimentos.dev`.
