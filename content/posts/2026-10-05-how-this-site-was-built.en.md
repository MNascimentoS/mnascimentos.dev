---
title: How this site was built
date: 2026-09-05
description: No framework: a Node script, some JSON and Markdown files, and GitHub Actions publishing to GitHub Pages.
cover: /images/blog/covers/site-en.jpg
tags: [web, github-actions]
lang: en
translation: site
---

The idea was to have a simple, direct site that looks like a dev made it, with no framework and no `node_modules` with hundreds of folders. With that in mind, I went as basic as possible: a Node script that reads the content and generates static HTML.

All the code is open on GitHub: [MNascimentoS/mnascimentos.dev](https://github.com/MNascimentoS/mnascimentos.dev).

## How it works

All content lives in files:

- `content/site.json` and `content/site.en.json`: projects, experience, stack and links, in Portuguese and English
- `content/posts/*.md`: blog posts, in Markdown
- `content/config.json`: turns the blog on or off and sets the site URL

`src/build.mjs` reads all of that and generates the `dist/` folder with the final HTML. Zero dependencies, just Node:

```bash
npm run dev     # serves at http://localhost:4321 and reloads on save
npm run build   # generates dist/
```

With that, adding a project just means editing the JSON, and writing a post means creating a `.md` file with a simple header:

```yaml
---
title: Post title
date: 2026-10-05
tags: [android]
lang: en
---
```

Also, if the post is about a project that already has a good README on GitHub, the README can be used directly as content:

```yaml
readme: https://github.com/user/repo
```

## Publishing

The site runs on **GitHub Pages**, with the `mnascimentos.dev` domain pointed through Cloudflare. On every `git push` to `main`, **GitHub Actions** runs the build and publishes `dist/`. It also runs once a day, in order to refresh the posts that come from a README.

```text
git push → GitHub Actions → node src/build.mjs → GitHub Pages
```

## What's behind it

Even though it's simple, a few things were added that make a difference:

- **Portuguese and English**, with each page pointing to its version in the other language
- **SEO**: sitemap, structured data (JSON-LD) and RSS for projects and the blog
- **Images and videos** in the cards, opening in an overlay instead of a new tab
- **Dark theme**, mono font in the headings, terminal look

In the end, adding something new comes down to editing a file and pushing, which was exactly the original goal.
