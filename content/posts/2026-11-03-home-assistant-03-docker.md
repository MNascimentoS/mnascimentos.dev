---
title: Home Assistant 3/6 — rodando em Docker, com Portainer e HACS
date: 2026-10-14
description: docker-compose, volumes, Portainer para gerenciar os containers, HACS para integrações da comunidade e como atualizar sem dor.
cover: /images/blog/covers/ha-03-pt.jpg
tags: [home-assistant, docker, homelab]
translation: ha-03
---

> **Série Home Assistant**
> 1. [Visão geral](/blog/home-assistant-01-visao-geral/)
> 2. [Instalação no Raspberry Pi 4](/blog/home-assistant-02-raspberry-pi/)
> 3. Home Assistant em Docker, com Portainer e HACS ← você está aqui
> 4. [Dispositivos, cenas e automações](/blog/home-assistant-04-automacoes/)
> 5. [Dashboards com Mushroom, button-card e card-mod](/blog/home-assistant-05-dashboards/)
> 6. [Câmeras e acesso remoto seguro](/blog/home-assistant-06-cameras-acesso-remoto/)

Quando já existe um servidor Linux rodando outros serviços em containers, faz mais sentido colocar o Home Assistant junto deles do que manter uma máquina dedicada. Neste post iremos ver como montar esse setup, passando pelo `docker-compose`, pelo Portainer, pela instalação do HACS e pelo processo de atualização.

## Home Assistant OS vs. Container

Antes de tudo, vale entender a troca que está sendo feita:

- **Ganha**: uma máquina só, atualização igual à dos outros serviços, backup = copiar uma pasta, controle total
- **Perde**: os *add-ons* da interface. Cada extra (banco de dados, MQTT, etc.) vira o seu próprio container

## 1. Pré-requisitos

Um servidor Linux com Docker e o plugin do Compose. No Debian/Ubuntu, o jeito oficial é o script da Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # para usar docker sem sudo (faça logout/login)
docker compose version          # confere se o compose está instalado
```

## 2. Estrutura de pastas

Uma pasta por serviço, com o `docker-compose.yml` e os dados juntos:

```text
~/homeassistant/
├── docker-compose.yml
└── config/            ← toda a configuração do Home Assistant fica aqui
```

## 3. O docker-compose.yml

```yaml
services:
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    container_name: homeassistant
    restart: unless-stopped
    privileged: true          # acesso a dispositivos USB (ex.: dongle Zigbee)
    network_mode: host        # necessário para descobrir dispositivos na rede
    environment:
      - TZ=Etc/UTC            # troque pelo seu fuso horário
    volumes:
      - ./config:/config
      - /etc/localtime:/etc/localtime:ro
      - /run/dbus:/run/dbus:ro   # necessário para Bluetooth
```

Alguns detalhes importantes:

- **`network_mode: host`**: muitas integrações descobrem dispositivos por mDNS/SSDP na rede local. Em rede *bridge*, essa descoberta não funciona.
- **`restart: unless-stopped`**: se o servidor reiniciar, o Home Assistant volta sozinho.
- **`./config:/config`**: tudo que importa fica nessa pasta. Backup é literalmente copiar ela.
- **`privileged`** e **`/run/dbus`**: só se você usar dongles USB ou Bluetooth. Se não usar, pode remover.

Subindo:

```bash
cd ~/homeassistant
docker compose up -d
docker compose logs -f   # acompanha o primeiro boot
```

Depois de alguns minutos, o Home Assistant estará em `http://IP-DO-SERVIDOR:8123`, e o assistente inicial é o mesmo do [post anterior](/blog/home-assistant-02-raspberry-pi/).

## 4. Portainer: uma interface para os containers

Com vários serviços rodando, o [Portainer](https://www.portainer.io/) facilita bastante o gerenciamento, já que mostra os containers, logs e uso de recursos, além de permitir reiniciar ou atualizar com um clique.

```yaml
# ~/portainer/docker-compose.yml
services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data:/data
```

Acesse `https://IP-DO-SERVIDOR:9443`, crie o usuário admin e pronto. Uma dica: no Portainer, dá para criar o próprio Home Assistant como uma **Stack**, colando o compose acima em *Stacks → Add stack*. Assim tudo fica gerenciado num lugar só.

> ⚠️ O Portainer tem acesso total ao Docker. Não exponha ele para a internet.

## 5. HACS: integrações e cards da comunidade

O [HACS](https://hacs.xyz/) (Home Assistant Community Store) é onde moram as integrações e os cards que a comunidade cria, como os que vou usar no post de dashboards. Na versão em container, a instalação é por linha de comando:

```bash
docker exec -it homeassistant bash -c "wget -O - https://get.hacs.xyz | bash -"
docker restart homeassistant
```

Depois:

1. Limpe o cache do navegador (Ctrl + F5)
2. **Configurações → Dispositivos e serviços → Adicionar integração → HACS**
3. Aceite os termos e autorize com a sua conta do GitHub

Com isso, o HACS passa a aparecer no menu lateral.

## 6. Atualizando sem dor

O Home Assistant lança uma versão nova todo mês. Visando evitar surpresas, o fluxo que sigo é:

1. **Ler as notas de versão**, principalmente a seção *Backward-incompatible changes*
2. **Fazer backup** da pasta `config`
3. Atualizar:

```bash
cd ~/homeassistant
docker compose pull
docker compose up -d
docker image prune -f   # remove a imagem antiga
```

Se algo der errado, dá para voltar fixando a versão anterior na imagem (`ghcr.io/home-assistant/home-assistant:2026.10.4`, por exemplo) e restaurando o backup.

## Resumo

```text
servidor Linux
├── homeassistant   (network_mode: host, porta 8123)
├── portainer       (porta 9443, só na rede local)
└── ...outros serviços
```

No próximo post iremos entender como organizar **dispositivos, cenas e automações**.
