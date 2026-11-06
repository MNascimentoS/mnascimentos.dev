---
title: Home Assistant 2/6 — instalação no Raspberry Pi 4
date: 2026-10-08
description: Hardware, gravação do Home Assistant OS, primeiro acesso, IP fixo e backups, passo a passo.
cover: /images/blog/covers/ha-02-pt.jpg
tags: [home-assistant, raspberry-pi, iot]
translation: ha-02
---

> **Série Home Assistant**
> 1. [Visão geral](/blog/home-assistant-01-visao-geral/)
> 2. Instalação no Raspberry Pi 4 ← você está aqui
> 3. [Home Assistant em Docker, com Portainer e HACS](/blog/home-assistant-03-docker/)
> 4. [Dispositivos, cenas e automações](/blog/home-assistant-04-automacoes/)
> 5. [Dashboards com Mushroom, button-card e card-mod](/blog/home-assistant-05-dashboards/)
> 6. [Câmeras e acesso remoto seguro](/blog/home-assistant-06-cameras-acesso-remoto/)

Neste post iremos entender como instalar o Home Assistant num Raspberry Pi 4, desde a escolha do hardware até a configuração dos backups. Na minha visão, o Pi é a forma mais simples de começar: é pequeno, silencioso, consome pouca energia e pode ficar ligado 24 horas.

## 1. Hardware

| Item | Recomendação | Por quê |
|---|---|---|
| Placa | Raspberry Pi 4, 4 GB ou mais | 2 GB funciona, mas fica no limite com muitas integrações |
| Armazenamento | SSD via USB 3 (ou cartão SD A2 de boa marca) | O banco de dados grava o tempo todo, e cartão SD barato costuma morrer cedo |
| Fonte | Oficial, 5 V / 3 A | Fonte fraca causa travamentos aleatórios, bem difíceis de diagnosticar |
| Rede | Cabo de rede | A central da casa merece uma conexão estável |
| Case | Com dissipador ou ventoinha | O Pi esquenta, e calor demais derruba o desempenho |

> Dica: se for usar SSD, conecte numa porta USB 3 (as azuis). Os Pi 4 mais recentes já dão boot por USB de fábrica.

## 2. Gravando o Home Assistant OS

O **Home Assistant OS** é a imagem oficial: um sistema enxuto que já vem com tudo pronto, incluindo atualizações e add-ons.

1. Instale o [Raspberry Pi Imager](https://www.raspberrypi.com/software/) no seu computador.
2. Em **Choose Device**, escolha *Raspberry Pi 4*.
3. Em **Choose OS**, vá em *Other specific-purpose OS → Home assistants and home automation → Home Assistant* e escolha a versão para o Pi 4.
4. Em **Choose Storage**, selecione o SSD (ou cartão SD).
5. Clique em **Next** e espere gravar e verificar.

Com isso, basta conectar o SSD no Pi, junto com o cabo de rede e a fonte.

## 3. Primeiro acesso

O primeiro boot demora alguns minutos, porque o sistema baixa a versão mais recente. Depois, no navegador de qualquer computador da mesma rede:

```text
http://homeassistant.local:8123
```

> Se esse endereço não abrir, procure o IP do Raspberry na lista de dispositivos do seu roteador e acesse `http://IP-DO-PI:8123`.

O assistente inicial pede:

1. **Nome e usuário** do administrador (com senha forte)
2. **Localização**: usada para clima, nascer e pôr do sol
3. **Fuso horário, unidade e moeda**
4. **Dados de uso** anônimos (opcional)

Ao terminar, o Home Assistant já começa a encontrar dispositivos na rede: TVs, Chromecasts, impressoras e lâmpadas Wi-Fi aparecem sozinhos em **Configurações → Dispositivos e serviços**.

## 4. IP fixo

Automações, apps e o acesso remoto dependem do endereço do Home Assistant, então, caso o IP mude, tudo para de funcionar. Para evitar isso, existem duas formas:

**Opção A (recomendada): reserva de DHCP no roteador.** No painel do roteador, procure algo como *DHCP → Reserva de endereço* e associe o MAC do Raspberry a um IP fixo.

**Opção B: pelo próprio Home Assistant.** Em **Configurações → Sistema → Rede**, abra a interface `end0`, troque IPv4 para **Estático** e preencha:

```text
Endereço IP:   192.168.0.50/24
Gateway:       192.168.0.1
Servidor DNS:  192.168.0.1
```

> Esses endereços são só um exemplo. Use uma faixa que exista na sua rede e que esteja fora do range de DHCP do roteador.

## 5. Backups (faça isso no primeiro dia)

Depois de configurado, perder o Home Assistant significa refazer toda a configuração. Visto isso, o ideal é configurar os backups logo no primeiro dia, em **Configurações → Sistema → Backups**:

1. Ative os **backups automáticos** (diários está ótimo)
2. Defina quantos manter (eu deixo os últimos 7)
3. **Guarde a chave de criptografia** num gerenciador de senhas: sem ela, o backup não restaura
4. Configure um **local fora do Pi** (um compartilhamento de rede ou nuvem), porque se o SSD morrer, o backup morre junto

## 6. Monitorando a máquina

Com a integração **System Monitor** (em *Adicionar integração → System Monitor*), dá para ver CPU, memória, disco e temperatura do Pi direto no dashboard:

![Uso de CPU, RAM, disco e temperatura](/images/blog/ha-sistema.jpg "Recursos da máquina acompanhados no próprio Home Assistant.")

Isso ajuda a identificar problemas antes que eles afetem a casa, como disco enchendo, temperatura alta ou memória no limite.

## Checklist

- [x] Home Assistant OS gravado no SSD
- [x] Usuário com senha forte
- [x] IP fixo
- [x] Backups automáticos fora do Pi
- [x] Monitoramento da máquina

No próximo post iremos ver o outro caminho de instalação: o Home Assistant em **Docker**, junto com Portainer e HACS.
