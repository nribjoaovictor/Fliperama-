# Preparação da máquina do pátio para a demonstração

Passo a passo para deixar a máquina do pátio pronta para a demonstração do Fliperama Local. A instalação é manual, feita pelo grupo seguindo este documento na ordem.

## Decisões

| Tema | Decisão | Motivo |
| --- | --- | --- |
| Hardware | Máquina real do pátio, x86_64 | Os testes já saem com os números da máquina que vai ficar no pátio. |
| Sistema | Ubuntu 24.04 LTS com GNOME (sessão Wayland padrão) | Sistema conhecido pelo grupo, o que facilita preparar a máquina. |
| Navegador | Google Chrome `.deb` (repositório do Google) | O Chromium do Ubuntu só existe como snap, que demora mais para abrir. O motor é o mesmo e a opção `--kiosk` funciona igual. |
| Node | Node 24 LTS via NodeSource | Fica em `/usr/bin/node` e não depende do shell interativo, ao contrário do nvm. |
| Execução | `npm run build` e o Fastify serve `dist/` na porta 3000 | Um processo só, sem o servidor de desenvolvimento do Vite consumindo memória. |
| Usuário | Usuário dedicado `arcade`, sem sudo, com login automático | Se alguém escapar do kiosk, cai numa conta sem privilégio. |
| Bloqueio de atalhos | Só `gsettings` do GNOME | Configuração simples, sem mexer no Xorg. |
| Inicialização | Um script no autostart do GNOME sobe o servidor e abre o Chrome | Mais simples de montar e de entender. |
| Plataforma de Gestão (G1) | Desligada na demo; `API_G1` aponta para um endereço sem serviço | Os placares ficam na fila local, o que demonstra a operação offline. |

## Pré-requisito no código

O `server/server.ts` hoje só serve `data/jogos` em `/arquivos-jogos/`. Antes de seguir este checklist, o servidor precisa passar a servir também o build do frontend (`dist/`) na raiz `/`. Sem essa mudança, abrir `http://localhost:3000` no Chrome não carrega a interface.

## 1. Instalar o Ubuntu

1. Instalar o Ubuntu 24.04 LTS Desktop pela opção de instalação padrão.
2. Criar a conta de administração do grupo (com sudo) durante a instalação.
3. Ao final, atualizar o sistema:

   ```bash
   sudo apt update && sudo apt full-upgrade -y
   sudo apt install -y git curl
   ```

4. Em Configurações > Telas, ajustar a resolução para 1024×768 se o monitor 4:3 não vier assim por padrão.

## 2. Instalar o Google Chrome

```bash
cd /tmp
curl -fLO https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb
google-chrome --version
```

O pacote adiciona o repositório do Google, então o Chrome passa a atualizar junto com o `apt`.

## 3. Instalar o Node 24

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # deve mostrar v24.x
```

## 4. Criar o usuário `arcade`

```bash
sudo adduser arcade
```

Não adicionar o usuário ao grupo `sudo`. Guardar a senha com o grupo, porque ela é necessária para entrar pelo TTY em caso de manutenção.

## 5. Clonar e construir o projeto

Todos os comandos desta seção rodam como `arcade`, para que os arquivos em `data/` pertençam ao usuário que executa o servidor.

```bash
sudo -iu arcade
git clone https://github.com/Arcade-IFES/Fliperama-.git ~/fliperama
cd ~/fliperama/fliperama-local
npm ci
npm run build
```

O `npm run build` executa `sync:jogos`, que baixa os 5 jogos do GitHub (incluindo o Encaixe Científico). Por isso esta etapa precisa de internet. Depois dela, os jogos ficam em disco e a demonstração funciona sem rede.

O `npm ci` precisa instalar as dependências de desenvolvimento, porque o servidor roda com `tsx`. Não usar `--omit=dev`.

Criar o arquivo `.env` (já ignorado pelo git):

```bash
cat > ~/fliperama/fliperama-local/.env <<'EOF'
PORT=3000
MODO_OPERACAO=local
CORS_ORIGIN=http://localhost:3000
API_G1=http://127.0.0.1:9
EOF
```

`API_G1=http://127.0.0.1:9` aponta para uma porta sem serviço. O envio falha na hora e o placar fica na fila de reenvio.

## 6. Script de inicialização

Ainda como `arcade`, criar `~/iniciar-quiosque.sh`:

```bash
cat > ~/iniciar-quiosque.sh <<'EOF'
#!/usr/bin/env bash
cd "$HOME/fliperama/fliperama-local" || exit 1

node --env-file=.env --import tsx server/server.ts >> "$HOME/fliperama-server.log" 2>&1 &

until curl -sf http://localhost:3000/health > /dev/null; do
  sleep 1
done

exec google-chrome \
  --kiosk \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-translate \
  --password-store=basic \
  http://localhost:3000
EOF
chmod +x ~/iniciar-quiosque.sh
```

A opção `--password-store=basic` evita que o Chrome peça a senha do chaveiro do GNOME, o que acontece sempre que o login é automático.

Registrar o script no autostart do GNOME:

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/fliperama.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Fliperama Local
Exec=/home/arcade/iniciar-quiosque.sh
X-GNOME-Autostart-enabled=true
EOF
exit
```

## 7. Bloquear atalhos do GNOME

O `gsettings` precisa rodar dentro da sessão gráfica do `arcade`. Sair da conta do grupo, entrar como `arcade` pela tela de login, abrir um terminal (Ctrl+Alt+T) e executar:

```bash
# Troca de janelas, fechar, minimizar, tela cheia
for k in switch-applications switch-applications-backward switch-windows \
         switch-windows-backward switch-group switch-group-backward \
         close minimize toggle-fullscreen toggle-maximized panel-main-menu \
         switch-to-workspace-left switch-to-workspace-right; do
  gsettings set org.gnome.desktop.wm.keybindings "$k" "[]"
done

# Tecla Super e visão geral
gsettings set org.gnome.mutter overlay-key ''
for k in toggle-overview toggle-application-view toggle-message-tray \
         focus-active-notification toggle-quick-settings; do
  gsettings set org.gnome.shell.keybindings "$k" "[]"
done

# Terminal, logout e bloqueio de tela
gsettings set org.gnome.settings-daemon.plugins.media-keys terminal "[]"
gsettings set org.gnome.settings-daemon.plugins.media-keys logout "[]"
gsettings set org.gnome.settings-daemon.plugins.media-keys screensaver "[]"

# Sem bloqueio, sem suspensão, sem notificações
gsettings set org.gnome.desktop.screensaver lock-enabled false
gsettings set org.gnome.desktop.session idle-delay 0
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing'
gsettings set org.gnome.settings-daemon.plugins.power idle-dim false
gsettings set org.gnome.desktop.notifications show-banners false
gsettings set org.gnome.desktop.lockdown disable-lock-screen true
gsettings set org.gnome.desktop.lockdown disable-log-out true

# Dock do Ubuntu
gnome-extensions disable ubuntu-dock@ubuntu.com
```

Depois disso, o Ctrl+Alt+T deixa de funcionar na conta `arcade`. Para voltar a mexer, usar a conta do grupo.

Se alguma chave não existir na versão instalada, o `gsettings` mostra erro e segue para a próxima. Vale conferir com `gsettings list-keys <schema>`.

## 8. Ativar o login automático

De volta na conta do grupo, editar `/etc/gdm3/custom.conf` e deixar a seção `[daemon]` assim:

```ini
[daemon]
AutomaticLoginEnable=true
AutomaticLogin=arcade
```

Opcional: remover o aviso gráfico de atualizações para que ele não apareça por cima do jogo.

```bash
sudo apt purge -y update-notifier
```

## 9. Validação antes da demo

| Teste | Como fazer | Resultado esperado |
| --- | --- | --- |
| Boot automático | Desligar puxando da tomada e ligar de novo | A tela de atração aparece sem ninguém tocar no teclado. |
| Memória | Pela conta do grupo, rodar `free -h` com o quiosque aberto e um jogo rodando | Anotar o valor. O orçamento do contexto do G3 prevê cerca de 700 MB para sistema e interface gráfica. |
| Offline | Desconectar o cabo de rede e jogar uma partida | Painel e partida funcionam e o placar fica na fila. |
| Escape | Testar Alt+Tab, Super, F11, Alt+F4, Ctrl+W | Ver a seção de riscos: Ctrl+W e talvez Alt+F4 fecham o Chrome. |
| Log | `tail ~/fliperama-server.log` como `arcade` | Mensagem "Servidor rodando em <http://0.0.0.0:3000>". |

## Riscos aceitos

- Ctrl+W fecha o Chrome. O próprio navegador trata o atalho e o `gsettings` não chega nele. Como o script não reabre o Chrome, a área de trabalho do `arcade` fica à mostra. O teste de escape do E3 lista esse atalho.
- Ctrl+Alt+F3 e combinações parecidas abrem um TTY. Na sessão Wayland o `gsettings` não desliga isso. O TTY pede usuário e senha, e a conta `arcade` não tem sudo.
- Se o processo do Node cair, o servidor só volta com a máquina reiniciada, porque não há reinício automático.
- O GNOME deve gastar mais que os cerca de 700 MB que o contexto do G3 reserva para sistema e interface. Medir com `free -h` e registrar o valor.
- A documentação do projeto cita Chromium e a demo usa Chrome. O motor é o mesmo, mas o desvio precisa constar no relatório.
- O RNF-L09 não é atendido. Ele pede instalação por comando único documentado no README, e este checklist é manual.
- O envio real de placares ao G1 não aparece na demo, só o enfileiramento.
