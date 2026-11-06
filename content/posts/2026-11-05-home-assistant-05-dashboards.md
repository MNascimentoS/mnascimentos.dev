---
title: Home Assistant 5/6 — dashboards com Mushroom, button-card e card-mod
date: 2026-10-23
description: Como monto dashboards por cômodo que qualquer pessoa da casa consegue usar, com cards da comunidade, templates reutilizáveis e cards condicionais.
cover: /images/blog/covers/ha-05-pt.jpg
tags: [home-assistant, dashboard, ui]
translation: ha-05
---

> **Série Home Assistant**
> 1. [Visão geral](/blog/home-assistant-01-visao-geral/)
> 2. [Instalação no Raspberry Pi 4](/blog/home-assistant-02-raspberry-pi/)
> 3. [Home Assistant em Docker, com Portainer e HACS](/blog/home-assistant-03-docker/)
> 4. [Dispositivos, cenas e automações](/blog/home-assistant-04-automacoes/)
> 5. Dashboards com Mushroom, button-card e card-mod ← você está aqui
> 6. [Câmeras e acesso remoto seguro](/blog/home-assistant-06-cameras-acesso-remoto/)

Um dashboard de automação residencial tem o mesmo desafio de um app: **quem usa nem sempre é quem fez**. Caso o painel não seja claro em poucos segundos, as pessoas acabam voltando para o interruptor. Tendo isso em mente, neste post iremos ver como montar um dashboard organizado por cômodo, utilizando cards da comunidade.

## 1. A estrutura

Uma boa divisão é separar o dashboard em **views** (as abas do topo), cada uma com um propósito: um resumo da casa, iluminação, mídia, sistema. O layout **Sections** organiza os cards numa grade responsiva, que funciona bem no celular e no computador:

```yaml
views:
  - title: Casa
    path: inicio
    icon: mdi:home
    type: sections
    max_columns: 2
    sections:
      - type: grid
        cards:
          - type: heading
            heading: Agora
            icon: mdi:clock-outline
          # ...cards da seção
```

## 2. Cards da comunidade (via HACS)

- **[Mushroom](https://github.com/piitaya/lovelace-mushroom)**: cards limpos e consistentes, ótimos para luzes, chips e templates
- **[button-card](https://github.com/custom-cards/button-card)**: o "canivete suíço" para criar cards totalmente customizados
- **[card-mod](https://github.com/thomasloven/lovelace-card-mod)**: CSS direto nos cards, para os ajustes finos

### Mushroom: luz com controle de brilho

```yaml
type: custom:mushroom-light-card
entity: light.sala
name: Sala de estar
icon: mdi:sofa
use_light_color: true
show_brightness_control: true
collapsible_controls: true
```

O `collapsible_controls` esconde a barra de brilho quando a luz está apagada, diminuindo o ruído na tela.

### Mushroom: saudação com template

O `mushroom-template-card` aceita Jinja, o que permite textos dinâmicos, como uma saudação:

```yaml
type: custom:mushroom-template-card
primary: >
  {% set h = now().hour %}
  {% if h < 12 %}Bom dia{% elif h < 18 %}Boa tarde{% else %}Boa noite{% endif %}
secondary: >
  {{ 'Em casa' if is_state('person.exemplo', 'home') else 'Fora de casa' }}
icon: mdi:account
icon_color: >
  {{ 'green' if is_state('person.exemplo', 'home') else 'grey' }}
```

Ou um contador de luzes acesas:

```yaml
type: custom:mushroom-template-card
primary: Luzes acesas
secondary: >
  {{ states.light | selectattr('state', 'eq', 'on') | list | count }}
icon: mdi:lightbulb-group
icon_color: amber
tap_action:
  action: navigate
  navigation_path: /lovelace/iluminacao
```

## 3. button-card com templates reutilizáveis

Quando vários botões têm o mesmo visual (por exemplo, botões de cena), em vez de repetir o estilo em cada um, dá para criar um **template** no topo do YAML do dashboard (*Editar → ⋮ → Editor de configuração bruta*):

```yaml
button_card_templates:
  cena:
    show_state: false
    show_label: true
    styles:
      card:
        - border-radius: 16px
        - padding: 14px
        - background: var(--cor-cena)
        - border: 1px solid rgba(255, 255, 255, 0.08)
      icon:
        - width: 28px
        - color: var(--cor-icone)
      name:
        - font-weight: 600
        - font-size: 14px
      label:
        - font-size: 11px
        - opacity: 0.7
```

E cada botão só define o que muda:

```yaml
type: custom:button-card
template: cena
entity: scene.exemplo_noite
name: Noite
label: Luzes baixas
icon: mdi:weather-night
tap_action:
  action: call-service
  service: scene.turn_on
  service_data:
    entity_id: scene.exemplo_noite
styles:
  card:
    - "--cor-cena": rgba(229, 57, 53, 0.18)
    - "--cor-icone": "#ef5350"
```

É o mesmo princípio de um **Design System**: um componente base e variações por parâmetro.

## 4. card-mod para os ajustes finos

Para mudar algo que o card não expõe como opção, entra o card-mod. Por exemplo, destacar a borda quando a luz está acesa:

```yaml
type: custom:mushroom-light-card
entity: light.sala
card_mod:
  style: |
    ha-card {
      border-radius: 16px;
      {% if is_state(config.entity, 'on') %}
        box-shadow: 0 0 12px rgba(255, 193, 7, 0.35);
        border-color: rgba(255, 193, 7, 0.5);
      {% endif %}
    }
```

## 5. Cards condicionais: mostrar só o que importa

Cards condicionais ajudam a esconder o que não é relevante no momento, como avisos que só aparecem quando há problema:

```yaml
type: conditional
conditions:
  - condition: numeric_state
    entity: sensor.dispositivos_offline
    above: 0
card:
  type: custom:mushroom-template-card
  primary: "{{ states('sensor.dispositivos_offline') }} dispositivos offline"
  secondary: Toque para ver quais
  icon: mdi:lan-disconnect
  icon_color: red
```

O sensor `dispositivos_offline` é um **template sensor** (*Auxiliares → Template → Sensor*) que conta entidades indisponíveis:

```jinja
{{ states | selectattr('state', 'eq', 'unavailable') | list | count }}
```

## Dicas

- **Celular primeiro**: a maior parte do uso é no celular
- **Poucas cores, com significado**: amarelo = luz acesa, vermelho = alerta, verde = tudo certo
- **Ações principais com um toque**: cenas e luzes; configurações ficam numa aba separada
- **Ícones consistentes**: todos do [Material Design Icons](https://pictogrammers.com/library/mdi/), mesmo estilo

No último post da série iremos ver como integrar **câmeras** e configurar o **acesso remoto** com segurança.
