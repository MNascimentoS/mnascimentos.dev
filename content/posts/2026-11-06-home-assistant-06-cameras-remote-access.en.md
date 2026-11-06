---
title: Home Assistant 6/6 — cameras and secure remote access
date: 2026-10-29
description: Cameras via ONVIF and RTSP, motion alerts, Nginx Proxy Manager with Let's Encrypt, firewall and two-factor authentication.
cover: /images/blog/covers/ha-06-en.jpg
tags: [home-assistant, security, docker, homelab]
lang: en
translation: ha-06
---

> **Home Assistant series**
> 1. [Overview](/en/blog/home-assistant-01-overview/)
> 2. [Installing on a Raspberry Pi 4](/en/blog/home-assistant-02-raspberry-pi/)
> 3. [Home Assistant in Docker, with Portainer and HACS](/en/blog/home-assistant-03-docker/)
> 4. [Devices, scenes and automations](/en/blog/home-assistant-04-automations/)
> 5. [Dashboards with Mushroom, button-card and card-mod](/en/blog/home-assistant-05-dashboards/)
> 6. Cameras and secure remote access ← you are here

In this last post of the series we'll look at two parts that require more care: integrating cameras and accessing the house from outside. In both, a configuration mistake can end up exposing the house on the internet, so each step is done with security in mind.

## Part 1: cameras

### The protocols

Most IP cameras speak at least one of these:

- **RTSP**: the video stream itself. Almost every camera has it.
- **ONVIF**: a standard that, besides video, exposes events (motion), PTZ control and device info.

Before buying a camera, check that it supports ONVIF or at least RTSP. Cameras that only work through the vendor's app are much harder to integrate.

### ONVIF integration

If the camera supports ONVIF, it's the best path:

1. In the camera's app, enable **ONVIF/RTSP** and create a user just for it
2. In Home Assistant: **Settings → Devices & services → Add integration → ONVIF**
3. Enter the camera's IP, the port (usually `80` or `8000`) and the user

The integration creates the camera entity and, if supported, a motion `binary_sensor`.

### Generic Camera integration (RTSP only)

If the camera only has RTSP, use **Add integration → Generic Camera** and enter the stream URL:

```text
rtsp://user:password@CAMERA-IP:554/stream1
```

> The final path (`/stream1`, `/live`, `/h264`...) varies by vendor. Search for your camera model + "RTSP URL".

### On the dashboard

```yaml
type: picture-entity
entity: camera.example
camera_view: live     # "auto" saves bandwidth: shows snapshots and only opens video on tap
show_name: false
show_state: false
```

### Motion alert when nobody is home

Example: if the camera detects motion and nobody is home, send a notification to the phone **with the picture**.

```yaml
alias: Camera - motion with nobody home
mode: single
triggers:
  - trigger: state
    entity_id: binary_sensor.example_camera_motion
    to: "on"
conditions:
  - condition: numeric_state
    entity_id: zone.home
    below: 1        # nobody home
actions:
  - action: camera.snapshot
    target:
      entity_id: camera.example
    data:
      filename: /config/www/snapshots/example.jpg
  - action: notify.mobile_app_phone
    data:
      title: Motion detected
      message: The camera detected motion.
      data:
        image: /local/snapshots/example.jpg
  - delay: "00:05:00"   # avoids notification spam
```

### Camera best practices

- **Separate network**: keep cameras on a network (VLAN or guest Wi-Fi) **with no internet access**. Only Home Assistant needs to talk to them.
- **A dedicated user** for RTSP/ONVIF, never the camera's admin
- **Passwords out of the YAML**: use `secrets.yaml` so passwords aren't scattered across the config

## Part 2: secure remote access

There are a few ways to use Home Assistant away from home. The simplest is **Home Assistant Cloud (Nabu Casa)**, a paid service that also helps fund the project. Here I show the self-hosted alternative, with a reverse proxy.

### The architecture

```text
Internet
   │  only port 443 (HTTPS)
   ▼
Router ── port forward 80/443 ──► Nginx Proxy Manager
                                    │  Let's Encrypt certificate
                                    ▼
                               Home Assistant :8123
                               (never exposed directly)
```

Home Assistant is **never** exposed directly. A reverse proxy receives the connections, handles HTTPS and forwards them inside.

### 1. Nginx Proxy Manager

[Nginx Proxy Manager](https://nginxproxymanager.com/) is Nginx with a very friendly web UI for creating proxies and certificates:

```yaml
# ~/npm/docker-compose.yml
services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: npm
    restart: unless-stopped
    ports:
      - "80:80"      # HTTP (needed to issue the certificate)
      - "443:443"    # HTTPS
      - "81:81"      # admin panel, local network only!
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

With a domain pointing to your home IP, create a **Proxy Host**:

| Field | Value |
|---|---|
| Domain Names | `home.yourdomain.com` |
| Scheme | `http` |
| Forward Hostname / IP | Home Assistant server IP |
| Forward Port | `8123` |
| Websockets Support | ✅ **required** (Home Assistant uses websockets) |
| Block Common Exploits | ✅ |

In the **SSL** tab: *Request a new SSL Certificate*, check **Force SSL** and **HTTP/2 Support**. The Let's Encrypt certificate is issued and renewed automatically.

### 2. Tell Home Assistant it's behind a proxy

Without this, Home Assistant rejects connections coming from the proxy (error 400):

```yaml
# configuration.yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 172.16.0.0/12   # Docker network; adjust to your proxy's IP
  ip_ban_enabled: true
  login_attempts_threshold: 5
```

`ip_ban_enabled` automatically bans IPs that get the password wrong 5 times.

### 3. Firewall

On the server, only what's needed stays open. With `ufw`:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.0.0/24 to any port 22    # SSH from the local network only
sudo ufw allow from 192.168.0.0/24 to any port 81    # NPM panel from the local network only
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

> Heads up: Docker writes to `iptables` directly and can bypass `ufw` for ports published by containers. So besides the firewall, the ideal is to **not publish** ports that don't need to be reached from outside.

### 4. Two-factor authentication

Finally, for each user: **Profile → Security → Multi-factor authentication modules → Authenticator app**. Scan the QR code with an app like Aegis or Google Authenticator. From then on, login requires password + code.

## Security checklist

- [x] Home Assistant never exposed directly, only through the proxy
- [x] HTTPS with a valid certificate
- [x] Automatic IP ban after failed attempts
- [x] Firewall allowing only 80/443 from the internet
- [x] Admin panels on the local network only
- [x] 2FA for every user
- [x] Isolated cameras and passwords in `secrets.yaml`

## Wrapping up the series

This series showed how I built my home automation with Home Assistant, from installation to secure remote access. The project started as a way to bring the house's apps into one place, and ended up covering infrastructure, networking, security, automation and UX.

To get started, a Raspberry Pi, one bulb and one automation are enough. From there, new integrations can be added gradually, as needed.
