---
title: Home Assistant 5/6 — dashboards with Mushroom, button-card and card-mod
date: 2026-10-23
description: How I build per-room dashboards anyone in the house can use, with community cards, reusable templates and conditional cards.
cover: /images/blog/covers/ha-05-en.jpg
tags: [home-assistant, dashboard, ui]
lang: en
translation: ha-05
---

> **Home Assistant series**
> 1. [Overview](/en/blog/home-assistant-01-overview/)
> 2. [Installing on a Raspberry Pi 4](/en/blog/home-assistant-02-raspberry-pi/)
> 3. [Home Assistant in Docker, with Portainer and HACS](/en/blog/home-assistant-03-docker/)
> 4. [Devices, scenes and automations](/en/blog/home-assistant-04-automations/)
> 5. Dashboards with Mushroom, button-card and card-mod ← you are here
> 6. [Cameras and secure remote access](/en/blog/home-assistant-06-cameras-remote-access/)

A home automation dashboard has the same challenge as an app: **the people who use it aren't always the people who built it**. If the panel isn't clear within a few seconds, people end up going back to the light switch. With that in mind, in this post we'll see how to build a per-room dashboard using community cards.

## 1. The structure

A good split is to divide the dashboard into **views** (the tabs at the top), each with a purpose: a home summary, lighting, media, system. The **Sections** layout arranges cards in a responsive grid that works on both phone and desktop:

```yaml
views:
  - title: Home
    path: home
    icon: mdi:home
    type: sections
    max_columns: 2
    sections:
      - type: grid
        cards:
          - type: heading
            heading: Now
            icon: mdi:clock-outline
          # ...section cards
```

## 2. Community cards (via HACS)

- **[Mushroom](https://github.com/piitaya/lovelace-mushroom)**: clean, consistent cards, great for lights, chips and templates
- **[button-card](https://github.com/custom-cards/button-card)**: the "Swiss army knife" for fully customized cards
- **[card-mod](https://github.com/thomasloven/lovelace-card-mod)**: CSS right on the cards, for fine-tuning

### Mushroom: light with brightness control

```yaml
type: custom:mushroom-light-card
entity: light.living_room
name: Living room
icon: mdi:sofa
use_light_color: true
show_brightness_control: true
collapsible_controls: true
```

`collapsible_controls` hides the brightness bar when the light is off, reducing noise on the screen.

### Mushroom: greeting with a template

`mushroom-template-card` accepts Jinja, which allows dynamic text, like a greeting:

```yaml
type: custom:mushroom-template-card
primary: >
  {% set h = now().hour %}
  {% if h < 12 %}Good morning{% elif h < 18 %}Good afternoon{% else %}Good evening{% endif %}
secondary: >
  {{ 'Home' if is_state('person.example', 'home') else 'Away' }}
icon: mdi:account
icon_color: >
  {{ 'green' if is_state('person.example', 'home') else 'grey' }}
```

Or a count of lights that are on:

```yaml
type: custom:mushroom-template-card
primary: Lights on
secondary: >
  {{ states.light | selectattr('state', 'eq', 'on') | list | count }}
icon: mdi:lightbulb-group
icon_color: amber
tap_action:
  action: navigate
  navigation_path: /lovelace/lighting
```

## 3. button-card with reusable templates

When several buttons share the same look (scene buttons, for example), instead of repeating the style in each one you can create a **template** at the top of the dashboard YAML (*Edit → ⋮ → Raw configuration editor*):

```yaml
button_card_templates:
  scene:
    show_state: false
    show_label: true
    styles:
      card:
        - border-radius: 16px
        - padding: 14px
        - background: var(--scene-color)
        - border: 1px solid rgba(255, 255, 255, 0.08)
      icon:
        - width: 28px
        - color: var(--icon-color)
      name:
        - font-weight: 600
        - font-size: 14px
      label:
        - font-size: 11px
        - opacity: 0.7
```

And each button only defines what changes:

```yaml
type: custom:button-card
template: scene
entity: scene.example_evening
name: Evening
label: Dim lights
icon: mdi:weather-night
tap_action:
  action: call-service
  service: scene.turn_on
  service_data:
    entity_id: scene.example_evening
styles:
  card:
    - "--scene-color": rgba(229, 57, 53, 0.18)
    - "--icon-color": "#ef5350"
```

It's the same principle as a **Design System**: one base component and variations by parameter.

## 4. card-mod for fine-tuning

To change something the card doesn't expose as an option, card-mod comes in. For example, highlighting the border when the light is on:

```yaml
type: custom:mushroom-light-card
entity: light.living_room
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

## 5. Conditional cards: show only what matters

Conditional cards help hide what isn't relevant right now, like warnings that only show up when there's a problem:

```yaml
type: conditional
conditions:
  - condition: numeric_state
    entity: sensor.offline_devices
    above: 0
card:
  type: custom:mushroom-template-card
  primary: "{{ states('sensor.offline_devices') }} devices offline"
  secondary: Tap to see which ones
  icon: mdi:lan-disconnect
  icon_color: red
```

The `offline_devices` sensor is a **template sensor** (*Helpers → Template → Sensor*) that counts unavailable entities:

```jinja
{{ states | selectattr('state', 'eq', 'unavailable') | list | count }}
```

## Tips

- **Mobile first**: most of the usage happens on the phone
- **Few colors, with meaning**: yellow = light on, red = alert, green = all good
- **Main actions in one tap**: scenes and lights; settings go in a separate tab
- **Consistent icons**: all from [Material Design Icons](https://pictogrammers.com/library/mdi/), same style

In the last post of the series we'll see how to integrate **cameras** and set up **remote access** securely.
