---
title: Home Assistant 4/6 — devices, scenes and automations
date: 2026-10-17
description: How to organize entities and areas, create scenes and write automations in YAML, with generic examples to adapt to your home.
cover: /images/blog/covers/ha-04-en.jpg
tags: [home-assistant, automation, iot]
lang: en
translation: ha-04
---

> **Home Assistant series**
> 1. [Overview](/en/blog/home-assistant-01-overview/)
> 2. [Installing on a Raspberry Pi 4](/en/blog/home-assistant-02-raspberry-pi/)
> 3. [Home Assistant in Docker, with Portainer and HACS](/en/blog/home-assistant-03-docker/)
> 4. Devices, scenes and automations ← you are here
> 5. [Dashboards with Mushroom, button-card and card-mod](/en/blog/home-assistant-05-dashboards/)
> 6. [Cameras and secure remote access](/en/blog/home-assistant-06-cameras-remote-access/)

With the devices connected, the next step is to organize them and create the automations. In this post we'll see (1) how to organize entities, (2) how scenes work and (3) how an automation is structured. The examples are generic, with made-up entity names, in order to show the structure of each configuration so it can be adapted to any home.

## 1. Organization

This step should be done before the first automation. With few devices it may seem unnecessary, but as the house grows it gets harder and harder to organize.

**Areas.** Under **Settings → Areas**, create one area per room and assign each device to it. That lets you use `area_id` in automations instead of listing entities one by one.

**Standard entity IDs.** Home Assistant generates names like `light.wifi_bulb_3a7f`. Rename them to a `domain.room_description` pattern:

```text
light.living_room_ceiling
light.bedroom_lamp
binary_sensor.hallway_motion
binary_sensor.front_door
media_player.living_room_tv
```

**Groups.** Under **Settings → Devices & services → Helpers → Group**, create groups for things controlled together (for example, `light.living_room` with all living room lights).

## 2. Scenes

A scene stores the desired state of several entities and applies it all at once:

```yaml
# scenes.yaml
- name: Example - evening
  icon: mdi:weather-night
  entities:
    light.living_room:
      state: "on"
      brightness_pct: 30
      color_temp_kelvin: 2700
    light.kitchen: "off"
```

You can also create a scene on the fly, saving the current state to restore later. Useful when an action changes the house temporarily:

```yaml
# scripts.yaml
save_and_turn_off:
  alias: Save state and turn off
  sequence:
    - action: scene.create
      data:
        scene_id: previous_state
        snapshot_entities:
          - light.living_room
    - action: light.turn_off
      target:
        entity_id: light.living_room

restore:
  alias: Restore state
  sequence:
    - action: scene.turn_on
      target:
        entity_id: scene.previous_state
```

## 3. Anatomy of an automation

Every automation has three parts:

```text
triggers   → when something happens
conditions → if it's true
actions    → then do this
```

### Example: motion-activated light

Turns a light on when there's motion at night and off a few minutes after the last motion:

```yaml
alias: Example - motion light
mode: restart
triggers:
  - trigger: state
    entity_id: binary_sensor.hallway_motion
    to: "on"
conditions:
  - condition: sun
    after: sunset
    before: sunrise
actions:
  - action: light.turn_on
    target:
      entity_id: light.hallway
  - wait_for_trigger:
      - trigger: state
        entity_id: binary_sensor.hallway_motion
        to: "off"
        for: "00:02:00"
  - action: light.turn_off
    target:
      entity_id: light.hallway
```

`mode` defines what happens if the automation fires while it's still running. Here `restart` resets the countdown on every new motion:

| Mode | Behavior when triggered again |
|---|---|
| `single` | Ignores it (default) |
| `restart` | Cancels the current run and starts a new one |
| `queued` | Waits for the current run, then runs again |
| `parallel` | Runs both at the same time |

### Example: time-based

```yaml
alias: Example - turn off at night
triggers:
  - trigger: time
    at: "23:30:00"
conditions:
  - condition: state
    entity_id: media_player.living_room_tv
    state: "off"
actions:
  - action: light.turn_off
    target:
      area_id: living_room
    data:
      transition: 60
```

The condition avoids turning everything off while the TV is still in use.

### Example: presence-based

Uses the location from the Home Assistant mobile app:

```yaml
alias: Example - arriving home
triggers:
  - trigger: zone
    entity_id: person.example
    zone: zone.home
    event: enter
conditions:
  - condition: sun
    after: sunset
actions:
  - action: light.turn_on
    target:
      area_id: entrance
```

### Example: one trigger per event, with `choose`

When the same automation has to react to different events, you can tag each trigger with an `id` and pick the action:

```yaml
alias: Example - react to the TV
mode: restart
triggers:
  - trigger: state
    entity_id: media_player.living_room_tv
    to: playing
    id: playing
  - trigger: state
    entity_id: media_player.living_room_tv
    from: playing
    for: "00:00:30"
    id: stopped
actions:
  - choose:
      - conditions:
          - condition: trigger
            id: playing
        sequence:
          - action: script.save_and_turn_off
      - conditions:
          - condition: trigger
            id: stopped
        sequence:
          - action: script.restore
```

`for` keeps a short pause from triggering the action.

## 4. Debugging

Under **Settings → Automations**, open the automation and click **Traces**. It shows which trigger fired, which condition passed or failed and what was executed, step by step.

In the next post we'll see how to turn all of this into dashboards, using Mushroom, button-card and card-mod.
