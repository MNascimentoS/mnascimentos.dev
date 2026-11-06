---
title: Home Assistant 3/6 — running in Docker, with Portainer and HACS
date: 2026-10-14
description: docker-compose, volumes, Portainer to manage containers, HACS for community integrations and how to update painlessly.
cover: /images/blog/covers/ha-03-en.jpg
tags: [home-assistant, docker, homelab]
lang: en
translation: ha-03
---

> **Home Assistant series**
> 1. [Overview](/en/blog/home-assistant-01-overview/)
> 2. [Installing on a Raspberry Pi 4](/en/blog/home-assistant-02-raspberry-pi/)
> 3. Home Assistant in Docker, with Portainer and HACS ← you are here
> 4. [Devices, scenes and automations](/en/blog/home-assistant-04-automations/)
> 5. [Dashboards with Mushroom, button-card and card-mod](/en/blog/home-assistant-05-dashboards/)
> 6. [Cameras and secure remote access](/en/blog/home-assistant-06-cameras-remote-access/)

When there's already a Linux server running other services in containers, it makes more sense to put Home Assistant next to them than to keep a dedicated machine. In this post we'll see how to build that setup, going through `docker-compose`, Portainer, installing HACS and the update process.

## Home Assistant OS vs. Container

First, it's worth understanding the trade-off being made:

- **You gain**: a single machine, the same update flow as your other services, backup = copying a folder, full control
- **You lose**: UI *add-ons*. Each extra (database, MQTT, etc.) becomes its own container

## 1. Prerequisites

A Linux server with Docker and the Compose plugin. On Debian/Ubuntu, the official way is Docker's script:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # to use docker without sudo (log out and back in)
docker compose version          # checks that compose is installed
```

## 2. Folder structure

One folder per service, with the `docker-compose.yml` and the data together:

```text
~/homeassistant/
├── docker-compose.yml
└── config/            ← all Home Assistant configuration lives here
```

## 3. The docker-compose.yml

```yaml
services:
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    container_name: homeassistant
    restart: unless-stopped
    privileged: true          # access to USB devices (e.g. a Zigbee dongle)
    network_mode: host        # needed to discover devices on the network
    environment:
      - TZ=Etc/UTC            # change to your time zone
    volumes:
      - ./config:/config
      - /etc/localtime:/etc/localtime:ro
      - /run/dbus:/run/dbus:ro   # needed for Bluetooth
```

A few important details:

- **`network_mode: host`**: many integrations discover devices via mDNS/SSDP on the local network. In *bridge* networking, discovery doesn't work.
- **`restart: unless-stopped`**: if the server reboots, Home Assistant comes back on its own.
- **`./config:/config`**: everything that matters is in this folder. Backup is literally copying it.
- **`privileged`** and **`/run/dbus`**: only if you use USB dongles or Bluetooth. If not, remove them.

Starting it:

```bash
cd ~/homeassistant
docker compose up -d
docker compose logs -f   # follow the first boot
```

After a few minutes, Home Assistant will be at `http://SERVER-IP:8123`, and the onboarding is the same as in the [previous post](/en/blog/home-assistant-02-raspberry-pi/).

## 4. Portainer: a UI for your containers

With several services running, [Portainer](https://www.portainer.io/) makes management much easier, since it shows containers, logs and resource usage, and lets you restart or update with one click.

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

Go to `https://SERVER-IP:9443`, create the admin user and you're done. Tip: in Portainer you can create Home Assistant itself as a **Stack**, pasting the compose above under *Stacks → Add stack*. That way everything is managed in one place.

> ⚠️ Portainer has full access to Docker. Don't expose it to the internet.

## 5. HACS: community integrations and cards

[HACS](https://hacs.xyz/) (Home Assistant Community Store) is where the community's integrations and cards live, like the ones I use in the dashboards post. In the container version, you install it from the command line:

```bash
docker exec -it homeassistant bash -c "wget -O - https://get.hacs.xyz | bash -"
docker restart homeassistant
```

Then:

1. Clear your browser cache (Ctrl + F5)
2. **Settings → Devices & services → Add integration → HACS**
3. Accept the terms and authorize with your GitHub account

With that, HACS shows up in the sidebar.

## 6. Updating painlessly

Home Assistant ships a new version every month. To avoid surprises, the flow I follow is:

1. **Read the release notes**, especially the *Backward-incompatible changes* section
2. **Back up** the `config` folder
3. Update:

```bash
cd ~/homeassistant
docker compose pull
docker compose up -d
docker image prune -f   # removes the old image
```

If something goes wrong, you can roll back by pinning the previous version in the image (`ghcr.io/home-assistant/home-assistant:2026.10.4`, for example) and restoring the backup.

## Summary

```text
Linux server
├── homeassistant   (network_mode: host, port 8123)
├── portainer       (port 9443, local network only)
└── ...other services
```

In the next post we'll see how to organize **devices, scenes and automations**.
