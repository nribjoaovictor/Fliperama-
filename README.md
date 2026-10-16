# Fliperama local — Recreio Arcade (G3)

## Rodar no computador

Na pasta `fliperama-local`, execute `npm ci`. Em dois terminais, rode `npm run server` (API local na porta 3000) e `npm run dev` (telas na porta 5173). O servidor baixa os jogos dos repositórios configurados em `server/services/sincronizacaoService.ts` e guarda o catálogo em `fliperama-local/data/`.

## Como o placar entra no ranking

1. O jogador escolhe um jogo. Quando a partida termina, o jogo manda **uma vez** a mensagem abaixo para a janela do fliperama:

   ```js
   window.parent.postMessage({
     type: 'GAME_OVER',
     jogo: 'id-do-jogo',
     payload: { score: pontuacaoFinal }
   }, '*')
   ```

2. O fliperama aceita a mensagem apenas do iframe do jogo aberto e da origem desse iframe. Exibe a pontuação, pede a nota e, em seguida, a matrícula e o apelido.
3. `POST /resultados` grava a partida em `fliperama-local/data/fila/<id>.json`. A cada 30 segundos o servidor tenta enviar os pendentes para `POST /api/placares` na API configurada por `API_G1` (padrão: `http://localhost:4000`). Depois de resposta HTTP de sucesso, o registro é arquivado em `data/enviadas/`.
4. O envio usa `id_partida`, `jogo_id`, `jogador`, `pontos`, `nota` e `jogado_em`, conforme o mock de integração do G2 em `Portal-Web/develop`. A matrícula fica apenas na fila local e **não** é enviada nesse contrato. O ranking oficial é calculado pela API que recebe os placares.

Os IDs usados hoje no catálogo são `orbita-do-saber`, `logica-em-dungeon` e `corrida-contra-o-sino`; devem coincidir com os IDs da API oficial quando ela for definida. Resultados antigos da fila com IDs numéricos 1, 2 e 3 são convertidos no envio.

**Jogar sem identificação nos três jogos:** depois da partida e da avaliação, o botão `JOGAR SEM IDENTIFICAÇÃO` salva pontuação e voto com apelido `ANON` e matrícula vazia e retorna à tela inicial. `Corrida-Contra-o-Sino` já envia `GAME_OVER`. Na sincronização, o fliperama adapta somente as cópias locais de `Orbita-do-Saber` e `-Logic-Dungeon-` para enviar `PLACAR` com `payload.pontos`, sem pedir nome dentro do jogo. Os repositórios das equipes não são modificados. A integração usa o iframe com `sandbox="allow-scripts"`; não precisa de `localStorage`. Se a função de fim do jogo mudar, a sincronização informa o erro para revisão do adaptador.

Para testar com o mock do G2, rode o mock na porta 4000 (`PORT=4000`) e aponte `API_G1` para `http://localhost:4000`. Para testar só a captura, `public/jogos/jogo_teste/index.html` contém uma partida de exemplo que envia `GAME_OVER`.

---

## Demonstração Web e Deploy Contínuo

A aplicação possui modo de demonstração pública na nuvem operando sem custos:

- **Frontend + Jogos Estáticos (Vercel Hobby)**: CDN global com 100 GB/mês de transferência gratuita e zero cold start.
- **Backend API (Render Free Web Service)**: serviço Node (512 MB) sem dependência de persistência em disco.

> **Aviso para a equipe**: este deploy web é mantido na infraestrutura gratuita pessoal do mantenedor do fork (`nribjoaovictor/Fliperama-`). Se os serviços na nuvem forem suspensos ou hibernarem, o quiosque físico local continua operando de forma 100% autônoma (`MODO_OPERACAO=local`).

### Variáveis de Ambiente

| Variável | Padrão | Onde configurar | Finalidade |
| --- | --- | --- | --- |
| `MODO_OPERACAO` | `local` | Render / Local | `local`: fila em disco e boot com sync; `web`: boot em <1s sem disco |
| `FONTE_JOGOS` | `github-fixo` | Render / Vercel | `github-fixo`: repositórios conhecidos; `g1`: catálogo dinâmico da API central |
| `DESTINO_PLACARES` | `local` (ou `log` em web) | Render | `local`: fila atômica em disco; `log`: registro em log na demo; `g1`: envio à API |
| `CORS_ORIGIN` | `http://localhost:5173` | Render | Origem autorizada do frontend na Vercel (ex: `https://fliperama-local.vercel.app`) |
| `PORT` | `3000` | Render | Porta dinâmica injetada pela nuvem |
| `VITE_API_URL` | `http://localhost:3000` | Vercel | URL pública do backend no Render |
| `VITE_DESTINO_PLACARES` | — | Vercel | Quando definido como `log`, ativa o aviso de modo demo no frontend |

> **Atenção**: O deploy só acontece via GitHub Actions; não reative o auto-deploy nas plataformas. Isso impede que versões quebradas cheguem à produção e elimina builds duplicados a cada push.

### Configuração Inicial (Checklist)

1. **Habilitar Actions no Fork**: acesse a aba *Actions* do fork e clique em *"I understand my workflows, go ahead and enable them"*.
2. **Backend no Render**:
   - Crie um *Web Service* conectando o fork (`branch: main`, `Root Directory: fliperama-local`).
   - Build: `npm ci --include=dev` | Start: `npx tsx server/server.ts` | Health Check: `/health`.
   - Em *Settings → Build & Deploy*, altere **Auto-Deploy** para **No**. O Render deixará de compilar a cada push, aguardando o sinal do CI.
   - Variáveis: `MODO_OPERACAO=web`, `FONTE_JOGOS=github-fixo`, `DESTINO_PLACARES=log`, `NODE_VERSION=24`.
   - Em *Settings → Deploy Hook*, crie um gancho e cadastre a URL no secret `RENDER_DEPLOY_HOOK_URL` do repositório no GitHub. O Deploy Hook continua funcionando normalmente mesmo com o auto-deploy desativado.
3. **Frontend na Vercel**:
   - Importe o fork no plano Hobby (`Root Directory: fliperama-local`, `Framework: Vite`).
   - O arquivo `vercel.json` do repositório já contém `"git": { "deploymentEnabled": false }`, o que desativa automaticamente as publicações a cada push no Git.
   - Variáveis: `FONTE_JOGOS=github-fixo`, `VITE_API_URL=<URL do Render>`, `VITE_DESTINO_PLACARES=log`.
   - Em *Settings → Git → Deploy Hooks*, crie um gancho apontando para a branch `main` e cadastre a URL no secret `VERCEL_DEPLOY_HOOK_URL` do GitHub. O Deploy Hook ignora a trava do Git e publica normalmente quando acionado pelo GitHub Actions pós-CI verde.
4. **CORS no Render**: adicione a variável `CORS_ORIGIN` no Render com a URL gerada pela Vercel.

### Rollback em 1 Clique

- **Render**: no dashboard do serviço, aba *Deploys*, selecione a versão funcional anterior e clique em **Rollback to this deploy**.
- **Vercel**: no painel do projeto, aba *Deployments*, clique em `...` na versão estável anterior e selecione **Promote to Production**.

### Atualização dos Jogos (Workflows Agendados)

O script `sync-jogos-build.mjs` roda automaticamente no build da Vercel, baixando pacotes, validando SHA-256 e gerando o catálogo estático.
O workflow `.github/workflows/sync-jogos.yml` aciona um rebuild diário. No GitHub, execuções agendadas (`cron`) são pausadas automaticamente após 60 dias sem atividade no repositório; para atualizar imediatamente, use o botão manual **Run workflow** na aba *Actions*.
