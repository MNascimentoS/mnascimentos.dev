---
title: Home Assistant 4/6 — dispositivos, cenas e automações
date: 2026-10-17
description: Como organizar entidades e áreas, criar cenas e escrever automações em YAML, com exemplos genéricos para adaptar à sua casa.
cover: /images/blog/covers/ha-04-pt.jpg
tags: [home-assistant, automacao, iot]
translation: ha-04
---

> **Série Home Assistant**
> 1. [Visão geral](/blog/home-assistant-01-visao-geral/)
> 2. [Instalação no Raspberry Pi 4](/blog/home-assistant-02-raspberry-pi/)
> 3. [Home Assistant em Docker, com Portainer e HACS](/blog/home-assistant-03-docker/)
> 4. Dispositivos, cenas e automações ← você está aqui
> 5. [Dashboards com Mushroom, button-card e card-mod](/blog/home-assistant-05-dashboards/)
> 6. [Câmeras e acesso remoto seguro](/blog/home-assistant-06-cameras-acesso-remoto/)

Com os dispositivos conectados, o próximo passo é organizá-los e criar as automações. Neste post iremos entender (1) como organizar as entidades, (2) como funcionam as cenas e (3) como é estruturada uma automação. Os exemplos são genéricos, com nomes de entidades fictícios, a fim de mostrar a estrutura de cada configuração para que possa ser adaptada a qualquer casa.

## 1. Organização

Essa etapa deve ser feita antes da primeira automação. Com poucos dispositivos pode parecer desnecessária, porém, conforme a casa cresce, fica cada vez mais difícil de organizar.

**Áreas.** Em **Configurações → Áreas**, crie uma área por cômodo e associe cada dispositivo a ela. Isso permite usar `area_id` nas automações em vez de listar entidade por entidade.

**IDs de entidade padronizados.** O Home Assistant gera nomes como `light.lampada_wifi_3a7f`. Renomeie para um padrão `dominio.comodo_descricao`:

```text
light.sala_teto
light.quarto_abajur
binary_sensor.corredor_movimento
binary_sensor.porta_entrada
media_player.sala_tv
```

**Grupos.** Em **Configurações → Dispositivos e serviços → Auxiliares → Grupo**, crie grupos para o que é controlado junto (por exemplo, `light.sala` com todas as luzes da sala).

## 2. Cenas

Uma cena guarda o estado desejado de várias entidades e aplica tudo de uma vez:

```yaml
# scenes.yaml
- name: Exemplo - noite
  icon: mdi:weather-night
  entities:
    light.sala:
      state: "on"
      brightness_pct: 30
      color_temp_kelvin: 2700
    light.cozinha: "off"
```

Também dá para criar uma cena "na hora", salvando o estado atual para restaurar depois. Útil quando uma ação muda a casa temporariamente:

```yaml
# scripts.yaml
salvar_e_apagar:
  alias: Salvar estado e apagar
  sequence:
    - action: scene.create
      data:
        scene_id: estado_anterior
        snapshot_entities:
          - light.sala
    - action: light.turn_off
      target:
        entity_id: light.sala

restaurar:
  alias: Restaurar estado
  sequence:
    - action: scene.turn_on
      target:
        entity_id: scene.estado_anterior
```

## 3. Estrutura de uma automação

Toda automação tem três partes:

```text
triggers   → quando algo acontece
conditions → se for verdade
actions    → então faça isso
```

### Exemplo: luz com sensor de movimento

Acende uma luz quando há movimento à noite e apaga alguns minutos depois do último movimento:

```yaml
alias: Exemplo - luz por movimento
mode: restart
triggers:
  - trigger: state
    entity_id: binary_sensor.corredor_movimento
    to: "on"
conditions:
  - condition: sun
    after: sunset
    before: sunrise
actions:
  - action: light.turn_on
    target:
      entity_id: light.corredor
  - wait_for_trigger:
      - trigger: state
        entity_id: binary_sensor.corredor_movimento
        to: "off"
        for: "00:02:00"
  - action: light.turn_off
    target:
      entity_id: light.corredor
```

O `mode` define o que acontece se a automação disparar enquanto ainda está rodando. Aqui `restart` reinicia a contagem a cada novo movimento:

| Modo | Comportamento ao disparar de novo |
|---|---|
| `single` | Ignora (padrão) |
| `restart` | Cancela a execução atual e começa outra |
| `queued` | Espera a atual terminar e roda em seguida |
| `parallel` | Roda as duas ao mesmo tempo |

### Exemplo: por horário

```yaml
alias: Exemplo - desligar à noite
triggers:
  - trigger: time
    at: "23:30:00"
conditions:
  - condition: state
    entity_id: media_player.sala_tv
    state: "off"
actions:
  - action: light.turn_off
    target:
      area_id: sala
    data:
      transition: 60
```

A condição evita desligar tudo enquanto a TV ainda está em uso.

### Exemplo: por presença

Usa a localização do app do Home Assistant no celular:

```yaml
alias: Exemplo - ao chegar em casa
triggers:
  - trigger: zone
    entity_id: person.exemplo
    zone: zone.home
    event: enter
conditions:
  - condition: sun
    after: sunset
actions:
  - action: light.turn_on
    target:
      area_id: entrada
```

### Exemplo: um trigger por evento, com `choose`

Quando a mesma automação precisa reagir a eventos diferentes, dá para identificar cada trigger com `id` e escolher a ação:

```yaml
alias: Exemplo - reagir à TV
mode: restart
triggers:
  - trigger: state
    entity_id: media_player.sala_tv
    to: playing
    id: tocando
  - trigger: state
    entity_id: media_player.sala_tv
    from: playing
    for: "00:00:30"
    id: parou
actions:
  - choose:
      - conditions:
          - condition: trigger
            id: tocando
        sequence:
          - action: script.salvar_e_apagar
      - conditions:
          - condition: trigger
            id: parou
        sequence:
          - action: script.restaurar
```

O `for` evita que uma pausa curta dispare a ação.

## 4. Depurando

Em **Configurações → Automações**, abra a automação e clique em **Traces**. Ele mostra qual trigger disparou, qual condição passou ou falhou e o que foi executado, passo a passo.

No próximo post iremos ver como transformar tudo isso em dashboards, utilizando Mushroom, button-card e card-mod.
