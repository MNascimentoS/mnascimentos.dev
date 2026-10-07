---
title: How this site was built
date: 2026-10-05
description: Static HTML, a Node script and GitHub Actions.
tags: [web, github-actions]
lang: en
translation: site
---

No framework. A Node script reads two kinds of files and generates HTML:

- `content/site.json` / `content/site.en.json` — projects, experience and links
- `content/posts/*.md` — blog posts

A post can be written here or come straight from a repository README:

```yaml
---
title: Tiker: app architecture
date: 2026-10-10
lang: en
readme: https://github.com/MNascimentoS/Tiker-App
---
```

On every `git push` to `develop`, GitHub Actions runs `node src/build.mjs` and publishes the `dist/` folder to GitHub Pages at `mnascimentos.dev`.
