# mnascimentos.dev

Site pessoal. HTML estático gerado por um script Node, sem dependências.

```bash
npm run dev     # http://localhost:4321
npm run build   # gera dist/
```

## Editar

- `content/site.json` — bio, links, projetos, experiência
- `content/posts/*.md` — posts do blog (copie `_modelo.md`, remova `draft: true`)
- `"featured": true` em um projeto → aparece em Destaques na página inicial
- `public/` — arquivos servidos como estão (CV, APKs, imagens)

Campos opcionais em cada projeto: `impact`, `apk`, `github`, `playstore`, `url`, `image`. Campo vazio não aparece.

## Posts a partir de README

Adicione `readme:` no cabeçalho do post e o README do repositório vira o conteúdo:

```yaml
---
title: Tiker: arquitetura do app
date: 2026-10-10
tags: [android]
readme: https://github.com/MNascimentoS/tiker
---
Texto opcional que aparece antes do README.
```

- Imagens e links relativos do README são convertidos para o GitHub.
- O site é reconstruído 1x por dia, então mudanças no README aparecem sozinhas.
- Funciona com repositórios públicos.

## APKs

Opção 1 (recomendada): anexe o `.apk` a um Release no repositório do app e use
`https://github.com/MNascimentoS/REPO/releases/latest/download/app-release.apk` no campo `apk`.

Opção 2: coloque o arquivo em `public/apks/app.apk` e use `/apks/app.apk`. Limite do GitHub: 100 MB.

## Deploy

1. Push para a branch `develop`.
2. GitHub → Settings → Pages → Source: **GitHub Actions**.

O workflow `.github/workflows/deploy.yml` publica a cada push.

## Domínio

`public/CNAME` já contém `mnascimentos.dev`. No DNS:

| Tipo | Nome | Valor |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | MNascimentoS.github.io |

Depois: Settings → Pages → Custom domain → `mnascimentos.dev` → marcar **Enforce HTTPS** (obrigatório em `.dev`).
