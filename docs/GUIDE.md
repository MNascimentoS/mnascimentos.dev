# Guia de manutenção

Como editar e publicar o site. Para a visão geral do projeto, veja o [README](../README.md).

## Rodar localmente

```bash
npm run dev     # http://localhost:4321, com rebuild automático
npm run build   # gera dist/
```

## Conteúdo

| Arquivo | O que tem |
|---|---|
| `content/site.json` / `content/site.en.json` | Bio, links, projetos, experiência, stack (PT / EN — mantenha os dois em sincronia) |
| `content/config.json` | `blog` liga/desliga o blog · `url` define a URL pública (canonical, og, sitemap) |
| `content/posts/*.md` | Posts do blog (copie `_modelo.md`) |
| `public/` | Arquivos servidos como estão: CV, imagens, vídeos, APKs |

### Campos de um projeto

| Campo | Efeito |
|---|---|
| `featured: true` | Aparece em Destaques na página inicial |
| `status` | Selo ao lado do nome (ex.: "em andamento") |
| `impact` | Linha verde de resultado |
| `stack` | Tags de tecnologia |
| `cover` | Imagem larga no topo do card |
| `images` | Telas em linha (até 3); clique abre o overlay |
| `media` | Vídeo `.mp4`/`.webm` em `public/videos` ou link do YouTube (aceita lista) |
| `poster` | Capa do vídeo `.mp4` |
| `github`, `playstore`, `apk`, `url`, `video` | Links no rodapé do card |

Campo vazio ou ausente não aparece.

## Blog

```json
// content/config.json
{ "blog": false }
```

Com `false`, somem o menu, a seção de últimos posts, as páginas e o RSS.

Posts em inglês usam `lang: en`. Para ligar um post à tradução, use o mesmo `translation: <id>` nos dois arquivos.

Um post pode usar o README de um repositório público:

```yaml
---
title: Tiker: arquitetura do app
date: 2026-10-10
readme: https://github.com/MNascimentoS/Tiker-App
---
```

Imagens e links relativos do README são convertidos, e o site é reconstruído 1x por dia.

## APKs

1. **Recomendado:** anexe o `.apk` a um Release do app e use `https://github.com/MNascimentoS/REPO/releases/latest/download/app-release.apk` no campo `apk`.
2. **No site:** `public/apks/app.apk` → `"apk": "/apks/app.apk"` (limite do GitHub: 100 MB).

## Deploy

1. Push na branch `main`.
2. **Settings → Pages → Source: GitHub Actions**. Com "Deploy from a branch", o GitHub publica o README por cima do site.

## Domínio próprio

`public/CNAME` contém `mnascimentos.dev`. No DNS:

| Tipo | Nome | Valor |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | MNascimentoS.github.io |

Depois: **Settings → Pages → Custom domain → `mnascimentos.dev`**, marque **Enforce HTTPS** e troque `url` em `content/config.json`.
