---
title: Home Assistant 6/6 — câmeras e acesso remoto seguro
date: 2026-10-29
description: Câmeras via ONVIF e RTSP, alertas de movimento, Nginx Proxy Manager com Let's Encrypt, firewall e autenticação em dois fatores.
cover: /images/blog/covers/ha-06-pt.jpg
tags: [home-assistant, seguranca, docker, homelab]
translation: ha-06
---

> **Série Home Assistant**
> 1. [Visão geral](/blog/home-assistant-01-visao-geral/)
> 2. [Instalação no Raspberry Pi 4](/blog/home-assistant-02-raspberry-pi/)
> 3. [Home Assistant em Docker, com Portainer e HACS](/blog/home-assistant-03-docker/)
> 4. [Dispositivos, cenas e automações](/blog/home-assistant-04-automacoes/)
> 5. [Dashboards com Mushroom, button-card e card-mod](/blog/home-assistant-05-dashboards/)
> 6. Câmeras e acesso remoto seguro ← você está aqui

Neste último post da série iremos ver duas partes que exigem mais cuidado: a integração das câmeras e o acesso de fora de casa. Em ambas, um erro de configuração pode acabar expondo a casa na internet, então cada etapa será feita visando a segurança.

## Parte 1: câmeras

### Os protocolos

A maioria das câmeras IP fala pelo menos um destes:

- **RTSP**: o stream de vídeo em si. Quase toda câmera tem.
- **ONVIF**: um padrão que, além do vídeo, expõe eventos (movimento), controle de PTZ e informações do dispositivo.

Antes de comprar uma câmera, vale conferir se ela suporta ONVIF ou pelo menos RTSP. Câmeras que só funcionam pelo app do fabricante dão muito mais trabalho para integrar.

### Integração ONVIF

Se a câmera suporta ONVIF, é o melhor caminho:

1. No app da câmera, ative o **ONVIF/RTSP** e crie um usuário só para isso
2. No Home Assistant: **Configurações → Dispositivos e serviços → Adicionar integração → ONVIF**
3. Informe o IP da câmera, a porta (geralmente `80` ou `8000`) e o usuário

A integração cria a entidade da câmera e, se ela suportar, um `binary_sensor` de movimento.

### Integração Generic Camera (só RTSP)

Se a câmera só tem RTSP, use **Adicionar integração → Generic Camera** e informe a URL do stream:

```text
rtsp://usuario:senha@IP-DA-CAMERA:554/stream1
```

> O caminho final (`/stream1`, `/live`, `/h264`...) muda de fabricante para fabricante. Procure pelo modelo da câmera + "RTSP URL".

### No dashboard

```yaml
type: picture-entity
entity: camera.exemplo
camera_view: live     # "auto" economiza banda: mostra snapshots e só abre o vídeo ao tocar
show_name: false
show_state: false
```

### Alerta de movimento com a casa vazia

Exemplo: se a câmera detectar movimento e não houver ninguém em casa, envia uma notificação para o celular **com a foto**.

```yaml
alias: Câmera - movimento com a casa vazia
mode: single
triggers:
  - trigger: state
    entity_id: binary_sensor.camera_exemplo_movimento
    to: "on"
conditions:
  - condition: numeric_state
    entity_id: zone.home
    below: 1        # ninguém em casa
actions:
  - action: camera.snapshot
    target:
      entity_id: camera.exemplo
    data:
      filename: /config/www/snapshots/exemplo.jpg
  - action: notify.mobile_app_celular
    data:
      title: Movimento detectado
      message: A câmera detectou movimento.
      data:
        image: /local/snapshots/exemplo.jpg
  - delay: "00:05:00"   # evita spam de notificações
```

### Boas práticas com câmeras

- **Rede separada**: deixe as câmeras numa rede (VLAN ou Wi-Fi de convidados) **sem acesso à internet**. Só o Home Assistant precisa falar com elas.
- **Usuário próprio** para o RTSP/ONVIF, nunca o admin da câmera
- **Senhas fora do YAML**: use o arquivo `secrets.yaml` para não espalhar senha pela configuração

## Parte 2: acesso remoto seguro

Para usar o Home Assistant fora de casa, existem alguns caminhos. O mais simples é o **Home Assistant Cloud (Nabu Casa)**, pago, que também ajuda a financiar o projeto. Aqui mostro a alternativa self-hosted, com proxy reverso.

### A arquitetura

```text
Internet
   │  só a porta 443 (HTTPS)
   ▼
Roteador ── port forward 80/443 ──► Nginx Proxy Manager
                                      │  certificado Let's Encrypt
                                      ▼
                                 Home Assistant :8123
                                 (nunca exposto direto)
```

O Home Assistant **nunca** fica exposto direto. Quem recebe as conexões é um proxy reverso, que cuida do HTTPS e repassa para dentro.

### 1. Nginx Proxy Manager

O [Nginx Proxy Manager](https://nginxproxymanager.com/) é um Nginx com uma interface web muito amigável para criar proxies e certificados:

```yaml
# ~/npm/docker-compose.yml
services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: npm
    restart: unless-stopped
    ports:
      - "80:80"      # HTTP (necessário para emitir o certificado)
      - "443:443"    # HTTPS
      - "81:81"      # painel de administração, só na rede local!
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

Com um domínio apontando para o IP da sua casa, crie um **Proxy Host**:

| Campo | Valor |
|---|---|
| Domain Names | `casa.seudominio.com` |
| Scheme | `http` |
| Forward Hostname / IP | IP do servidor do Home Assistant |
| Forward Port | `8123` |
| Websockets Support | ✅ **obrigatório** (o Home Assistant usa websockets) |
| Block Common Exploits | ✅ |

Na aba **SSL**: *Request a new SSL Certificate*, marque **Force SSL** e **HTTP/2 Support**. O certificado do Let's Encrypt é emitido e renovado sozinho.

### 2. Dizer ao Home Assistant que ele está atrás de um proxy

Sem isso, o Home Assistant recusa as conexões vindas do proxy (erro 400):

```yaml
# configuration.yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 172.16.0.0/12   # rede do Docker; ajuste para o IP do seu proxy
  ip_ban_enabled: true
  login_attempts_threshold: 5
```

O `ip_ban_enabled` bane automaticamente IPs que errarem a senha 5 vezes.

### 3. Firewall

No servidor, só o necessário fica aberto. Com o `ufw`:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.0.0/24 to any port 22    # SSH só da rede local
sudo ufw allow from 192.168.0.0/24 to any port 81    # painel do NPM só da rede local
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

> Atenção: o Docker mexe direto no `iptables` e pode passar por cima do `ufw` em portas publicadas por containers. Por isso, além do firewall, o ideal é **não publicar** portas que não precisam ser acessadas de fora.

### 4. Autenticação em dois fatores

Por fim, em cada usuário: **Perfil → Segurança → Módulos de autenticação multifator → Aplicativo autenticador**. Leia o QR code com um app como o Aegis ou o Google Authenticator. A partir daí, login só com senha + código.

## Checklist de segurança

- [x] Home Assistant nunca exposto direto, só via proxy
- [x] HTTPS com certificado válido
- [x] Banimento automático de IP após tentativas erradas
- [x] Firewall liberando só 80/443 para a internet
- [x] Painéis de administração só na rede local
- [x] 2FA para todos os usuários
- [x] Câmeras isoladas e senhas no `secrets.yaml`

## Fechando a série

Nesta série foi apresentado como montei a automação da minha casa com o Home Assistant, desde a instalação até o acesso remoto seguro. O projeto começou como uma forma de juntar os aplicativos da casa num lugar só, e acabou passando por infraestrutura, redes, segurança, automação e UX.

Para quem quer começar, um Raspberry Pi, uma lâmpada e uma automação já são suficientes. A partir disso, novas integrações podem ser adicionadas aos poucos, conforme a necessidade.
