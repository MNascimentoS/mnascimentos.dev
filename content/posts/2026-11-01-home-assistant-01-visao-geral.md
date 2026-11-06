---
title: Home Assistant 1/6 — por que transformei minha casa num projeto de engenharia
date: 2026-10-03
description: Por que comecei a usar o Home Assistant, o que torna a automação residencial tão divertida para quem gosta de IoT e a arquitetura geral do projeto.
cover: /images/blog/covers/ha-01-pt.jpg
tags: [home-assistant, iot, homelab]
translation: ha-01
---

> **Série Home Assistant**
> 1. Visão geral ← você está aqui
> 2. [Instalação no Raspberry Pi 4](/blog/home-assistant-02-raspberry-pi/)
> 3. [Home Assistant em Docker, com Portainer e HACS](/blog/home-assistant-03-docker/)
> 4. [Dispositivos, cenas e automações](/blog/home-assistant-04-automacoes/)
> 5. [Dashboards com Mushroom, button-card e card-mod](/blog/home-assistant-05-dashboards/)
> 6. [Câmeras e acesso remoto seguro](/blog/home-assistant-06-cameras-acesso-remoto/)

## Como tudo começou

Sempre gostei de IoT. Ver um sensor detectando algo e um dispositivo reagindo sozinho, sem ninguém apertar um botão, sempre me chamou muita atenção. Então, quando comecei a colocar lâmpadas, tomadas e outros dispositivos inteligentes em casa, foi natural querer ir além do que os aplicativos ofereciam.

O problema apareceu rápido. Cada fabricante tinha o seu próprio aplicativo, e eles não conversavam entre si. Para montar uma cena simples, era preciso abrir vários apps diferentes, e depois de tudo configurado, manter isso organizado virou um trabalho à parte: uma regra num app, um horário em outro, um ajuste que eu nem lembrava mais onde tinha feito.

Além disso, a maioria desses dispositivos dependia da nuvem do fabricante. Isso significava que, quando a internet caía, a casa simplesmente parava de responder. E quando acontecia uma queda de energia, alguns dispositivos voltavam com o estado errado ou perdiam a configuração, e era preciso ajustar tudo de novo.

Tendo isso em vista, comecei a procurar uma forma de centralizar tudo, que funcionasse **dentro de casa** e que não dependesse da internet para as coisas básicas. Foi assim que cheguei ao [Home Assistant](https://www.home-assistant.io/), uma plataforma open source de automação residencial que integra dispositivos de diferentes fabricantes num único lugar.

## Por que é tão divertido

O que mais gosto no Home Assistant é que ele transforma a casa num projeto que nunca termina, no bom sentido. Cada dispositivo novo é uma integração para entender, cada rotina da casa é uma automação esperando para ser escrita, e cada problema (o sensor que não responde, a automação que dispara na hora errada) é um bug para investigar.

Para quem gosta de IoT, é um playground completo: dá para mexer com hardware, rede, servidores, YAML, interface e até um pouco de UX, já que no fim quem usa o painel não é só quem montou. E a melhor parte é ver o resultado no dia a dia: a luz que acende quando você passa, a casa que se ajusta sozinha no fim do dia, tudo funcionando mesmo sem internet.

Nesta série vou apresentar como montei o meu, seguindo o seguinte fluxo: (1) visão geral e arquitetura, (2) instalação num Raspberry Pi 4, (3) instalação em Docker, (4) criação de cenas e automações, (5) construção dos dashboards e (6) integração de câmeras com acesso remoto seguro.

![Painel inicial do Home Assistant](/images/blog/ha-casa.jpg "O painel “Casa”: clima, cenas, cômodos e lista de compras.")

## O que ele faz hoje

- Controle de **luzes e tomadas** por cômodo, com cenas
- **Automações** baseadas em sensores, horário e presença
- Integração com **TV** e **câmeras**
- **Dashboards** organizados por cômodo
- **Acesso remoto** com HTTPS e autenticação em dois fatores

## A arquitetura

De forma resumida, a arquitetura pode ser dividida em quatro camadas:

```text
┌──────────────────────────────────────────────┐
│  Interface: dashboards (web e app)            │
├──────────────────────────────────────────────┤
│  Lógica: automações, cenas e scripts          │
├──────────────────────────────────────────────┤
│  Home Assistant (core)                        │
│  estado de tudo + integrações                 │
├──────────────────────────────────────────────┤
│  Dispositivos: lâmpadas, tomadas, sensores,  │
│  TV, câmeras                                  │
└──────────────────────────────────────────────┘
```

O Home Assistant armazena o **estado** de cada item da casa (luz acesa, porta fechada, movimento detectado) como uma *entidade*. As automações reagem às mudanças desses estados, enquanto o dashboard é a forma de visualizá-los e alterá-los. Para quem trabalha com desenvolvimento de apps, o padrão é bem familiar: um *state holder* orientado a eventos.

## Onde ele roda

Existem dois caminhos principais de instalação, e ambos serão abordados na série:

| | Home Assistant OS | Home Assistant em Docker |
|---|---|---|
| **Onde** | Máquina dedicada (ex.: Raspberry Pi 4) | Qualquer servidor Linux com Docker |
| **Instalação** | Grava a imagem e liga | `docker compose up -d` |
| **Add-ons** | Sim, pela interface | Não, cada extra vira um container |
| **Atualização** | Um clique | `pull` da imagem nova |
| **Para quem** | Quer simplicidade | Já tem um servidor e quer controle total |

Para quem está começando, o Raspberry Pi com o Home Assistant OS é a opção mais simples. Já para quem possui um servidor em casa rodando outros serviços, o Docker acaba fazendo mais sentido, visto que permite gerenciar tudo da mesma forma.

## O que o projeto envolve

Além da automação em si, o projeto permitiu exercitar diferentes áreas:

- **Integração entre sistemas** que nunca foram feitos para conversar
- **Tolerância a falhas**: o Wi-Fi caiu, a lâmpada ficou sem energia, e agora?
- **UX**: a interface precisa ser simples para quem não é técnico
- **Infraestrutura e segurança**: containers, rede, certificados, firewall

Nos próximos posts, cada uma dessas etapas será detalhada com as configurações utilizadas.
