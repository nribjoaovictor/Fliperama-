# Fliperama local (Recreio Arcade, G3)

## Rodar no computador

Instale as dependências na pasta `fliperama-local`:

```bash
cd fliperama-local
npm ci
```

Para subir apenas o fliperama em modo local e offline, rode:

```bash
npm run start:local
```

Esse comando cria o `.env` a partir de `.env.example` quando necessário e inicia no mesmo terminal o servidor Fastify na porta `3000` e o frontend Vite na porta `5173`. Se preferir terminais separados, rode `npm run server` em um e `npm run dev` em outro.

Para subir o fliperama junto com a API da Plataforma de Gestão (`Portal-Web/api`) e o PostgreSQL no Docker, deixe o repositório `Portal-Web` clonado em `../Portal-Web` (ou defina o caminho em `PORTAL_WEB_DIR`) e execute:

```bash
npm run start:integrado
```

O script sobe o container PostgreSQL da API, aplica as migrations e o seed (`dev-estacao` e `dev-curador`), cadastra os cinco jogos do fliperama na tabela `jogos` do banco local (`npm run seed:api-local`), inicia a API na porta `4000` e abre o servidor (`:3000`) e o frontend (`:5173`) do fliperama.

Para rodar os testes automatizados:

```bash
npm test
```

## Sincronização do catálogo

Na inicialização do servidor ou ao receber `POST /sincronizar`, o fliperama consulta `GET /api/jogos` no endereço configurado em `API_G1` (padrão `http://localhost:4000`).

Para cada jogo aprovado que a API retorna, o servidor compara o `sha256` com o registrado em `fliperama-local/data/catalogo.json`. Se o pacote já estiver em `data/jogos/<id>/` com o mesmo hash, o fliperama reutiliza os arquivos locais sem baixar o zip de novo. Quando o pacote é novo ou mudou de hash, o servidor baixa o `.zip` em `pacote_url`, confere o SHA-256, extrai os arquivos em `data/jogos/<id>/` e embute o `questoes.json` dentro do `index.html`, já que o iframe com `sandbox="allow-scripts"` tem origem opaca e bloqueia `fetch('questoes.json')` por CORS.

Depois de processar a lista da API, o sincronizador inclui os cinco jogos de fallback definidos em `server/services/sincronizacaoService.ts` (`orbita-do-saber`, `logica-em-dungeon`, `corrida-contra-o-sino`, `estrelas-da-ciencia` e `encaixe-cientifico`) e salva `data/catalogo.json` por escrita atômica. Se a API e a internet estiverem fora do ar, o servidor mantém o catálogo já salvo em disco.

## Como o placar entra no ranking

1. O jogador escolhe um jogo. Ao fim da partida, o jogo envia uma única mensagem para a janela do fliperama (`type: 'PLACAR'` com `payload: { pontos }`, ou o formato antigo `type: 'GAME_OVER'` com `payload: { score }`):

   ```js
   window.parent.postMessage({
     type: 'PLACAR',
     jogo: 'id-do-jogo',
     payload: { pontos: pontuacaoFinal }
   }, '*')
   ```

2. O fliperama aceita a mensagem somente quando ela vem do `contentWindow` do iframe ativo e traz o identificador do jogo aberto. A interface mostra a pontuação, pede uma nota de 1 a 5 e solicita matrícula e apelido.
3. `POST /resultados` grava a partida em `fliperama-local/data/fila/<id>.json` e dispara uma tentativa imediata de envio em segundo plano. Uma rotina periódica repete a tentativa a cada 30 segundos para os arquivos que continuarem pendentes.
4. O servidor envia `POST /api/placares` para `API_G1` com o cabeçalho `Authorization: Bearer <TOKEN_ESTACAO>` e um JSON com `id_partida`, `jogo`, `jogo_id`, `jogador`, `pontos`, `feedback: { nota }`, `nota` e `jogado_em`. Quando a API responde `201` (nova partida) ou `200` (`duplicada: true`), o servidor move o arquivo de `data/fila/` para `data/enviadas/`. A matrícula fica apenas no arquivo local e não segue para a API.

O catálogo local usa os identificadores `orbita-do-saber`, `logica-em-dungeon`, `corrida-contra-o-sino`, `estrelas-da-ciencia` e `encaixe-cientifico`, além dos jogos aprovados vindos da API (como `quiz-invaders` no seed local). No envio, o servidor converte partidas antigas que ainda tenham os IDs numéricos 1, 2 e 3.

Depois da partida e da avaliação, o botão `JOGAR SEM IDENTIFICAÇÃO` salva a pontuação e o voto com apelido `ANON` e matrícula vazia e volta para a tela inicial. `Corrida-Contra-o-Sino` (com `GAME_OVER`), `Estrelas da Ciência` e `Encaixe Científico` (com `PLACAR`) já enviam o placar por conta própria. Na sincronização, o fliperama altera apenas as cópias locais de `Orbita-do-Saber` e `-Logic-Dungeon-` para emitirem `PLACAR` com `payload.pontos` sem pedir nome dentro do jogo, sem mexer nos repositórios das equipes. Para testar apenas a recepção de mensagens, `public/jogos/jogo_teste/index.html` traz uma partida de exemplo que envia `GAME_OVER`.

## Demonstração web e deploy na nuvem

A demonstração pública está em <https://fliperama-local.vercel.app/> e usa o plano gratuito de dois serviços:

- Na Vercel (Hobby), ficam o frontend e o catálogo estático de jogos gerado durante o build (`npm run sync:jogos`). A Vercel publica cada push na branch `main`, e a proteção da branch no GitHub exige que o CI passe nos pull requests antes do merge.
- No Render (Free Web Service), roda o servidor Node Fastify com `MODO_OPERACAO=web`, sem gravação em disco. No painel do Render, deixe o Auto-Deploy em `After CI Checks Pass` para aguardar o GitHub Actions antes de publicar.

### Variáveis de ambiente

| Variável | Padrão | Onde configurar | Finalidade |
| --- | --- | --- | --- |
| `API_G1` | `http://localhost:4000` | `.env` local / Render | URL base da API da Plataforma de Gestão (G1) sem `/api` no final |
| `TOKEN_ESTACAO` | `dev-estacao` | `.env` local / Render | Token da estação (`est_...` em produção ou `dev-estacao` no seed local) |
| `MODO_OPERACAO` | `local` | Render | `web`: inicialização imediata sem disco; `local`: quiosque físico com fila atômica |
| `CORS_ORIGIN` | `http://localhost:5173` | `.env` local / Render | Origem liberada no CORS (`https://fliperama-local.vercel.app` em produção) |
| `PORT` | `3000` | `.env` local / Render | Porta do servidor Fastify local ou definida pela nuvem |
| `VITE_API_URL` | `http://localhost:3000` | Vercel | URL do backend Fastify do fliperama chamada pelo React |

### Limitações da camada gratuita

Depois de 15 minutos sem acesso, o Render hiberna a instância gratuita e o primeiro envio de placar pode levar de 30 a 50 segundos até o serviço responder. A navegação pelas telas e os jogos continuam abrindo direto pela CDN da Vercel.

Com `MODO_OPERACAO=web`, o servidor valida os placares e registra o resultado apenas no log do console do Render, então esses dados somem quando o container reinicia. No quiosque físico (`MODO_OPERACAO=local`), os arquivos continuam salvos em `data/fila/` e `data/enviadas/`.
