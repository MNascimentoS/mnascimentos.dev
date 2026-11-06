---
title: Como este site foi feito
date: 2026-09-05
description: Sem framework: um script Node, uns arquivos JSON e Markdown, e o GitHub Actions publicando no GitHub Pages.
cover: /images/blog/covers/site-pt.jpg
tags: [web, github-actions]
translation: site
---

A ideia era ter um site simples, direto e com cara de dev, sem framework e sem um `node_modules` com centenas de pastas. Tendo isso em vista, optei pelo mais básico possível: um script Node que lê o conteúdo e gera HTML estático.

O código está todo aberto no GitHub: [MNascimentoS/mnascimentos.dev](https://github.com/MNascimentoS/mnascimentos.dev).

## Como funciona

Todo o conteúdo fica em arquivos:

- `content/site.json` e `content/site.en.json`: projetos, experiência, stack e links, em português e inglês
- `content/posts/*.md`: os posts do blog, em Markdown
- `content/config.json`: liga e desliga o blog e define a URL do site

O `src/build.mjs` lê tudo isso e gera a pasta `dist/` com o HTML pronto. Zero dependências, só Node:

```bash
npm run dev     # sobe em http://localhost:4321 e recarrega quando salvo
npm run build   # gera o dist/
```

Com isso, para adicionar um projeto basta editar o JSON, e para escrever um post, criar um `.md` com um cabeçalho simples:

```yaml
---
title: Título do post
date: 2026-10-05
tags: [android]
---
```

Além disso, caso o post seja sobre um projeto que já tem um bom README no GitHub, é possível usar o README direto como conteúdo:

```yaml
readme: https://github.com/usuario/repo
```

## Publicação

O site roda no **GitHub Pages**, com o domínio `mnascimentos.dev` apontado pelo Cloudflare. A cada `git push` na `main`, o **GitHub Actions** roda o build e publica o `dist/`. Ele também roda uma vez por dia, a fim de atualizar os posts que vêm de README.

```text
git push → GitHub Actions → node src/build.mjs → GitHub Pages
```

## O que tem por trás

Mesmo sendo simples, foram adicionados alguns pontos que fazem diferença:

- **Português e inglês**, com cada página apontando para sua versão no outro idioma
- **SEO**: sitemap, dados estruturados (JSON-LD) e RSS dos projetos e do blog
- **Imagens e vídeos** nos cards, abrindo num overlay em vez de nova aba
- **Tema escuro**, fonte mono nos títulos, cara de terminal

No fim, adicionar algo novo se resume a editar um arquivo e dar push, que era exatamente o objetivo inicial.
