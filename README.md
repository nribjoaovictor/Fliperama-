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

Os IDs usados hoje no catálogo são `orbita-do-saber`, `logica-em-dungeon`, `corrida-contra-o-sino` e `estrelas-da-ciencia`; devem coincidir com os IDs da API oficial quando ela for definida. Resultados antigos da fila com IDs numéricos 1, 2 e 3 são convertidos no envio.

**Jogar sem identificação nos quatro jogos:** depois da partida e da avaliação, o botão `JOGAR SEM IDENTIFICAÇÃO` salva pontuação e voto com apelido `ANON` e matrícula vazia e retorna à tela inicial. `Corrida-Contra-o-Sino` (com `GAME_OVER`) e `Estrelas da Ciência` (com `PLACAR`) já enviam mensagens nativamente. Na sincronização, o fliperama adapta somente as cópias locais de `Orbita-do-Saber` e `-Logic-Dungeon-` para enviar `PLACAR` com `payload.pontos`, sem pedir nome dentro do jogo. Os repositórios das equipes não são modificados. A integração usa o iframe com `sandbox="allow-scripts"`; não precisa de `localStorage`. Se a função de fim do jogo mudar, a sincronização informa o erro para revisão do adaptador.

Para testar com o mock do G2, rode o mock na porta 4000 (`PORT=4000`) e aponte `API_G1` para `http://localhost:4000`. Para testar só a captura, `public/jogos/jogo_teste/index.html` contém uma partida de exemplo que envia `GAME_OVER`.

---

## Demonstração Web e Deploy na Nuvem

**Deploy:** <https://fliperama-local.vercel.app/>

A aplicação conta com um modo de demonstração pública hospedado em camada gratuita:

* **Frontend e Jogos (Vercel Hobby)**: CDN global com catálogo estático gerado no build (`npm run sync:jogos`). A Vercel realiza deploy a cada push na branch `main`; a proteção contra versões com erro vem da branch protection do GitHub exigindo que o CI esteja verde nos PRs antes do merge.
* **Backend API (Render Free Web Service)**: serviço Node Fastify sem dependência de persistência em disco (`MODO_OPERACAO=web`). No painel do Render, configure **Auto-Deploy** como **After CI Checks Pass** para que o serviço aguarde o GitHub Actions concluir com sucesso.

### Variáveis de Ambiente

| Variável | Padrão | Onde configurar | Finalidade |
| --- | --- | --- | --- |
| `MODO_OPERACAO` | `local` | Render | `web`: inicialização imediata sem disco; `local`: quiosque físico com fila atômica |
| `CORS_ORIGIN` | `http://localhost:5173` | Render | `https://fliperama-local.vercel.app` |
| `PORT` | `3000` | Render | Porta dinâmica injetada pela plataforma de nuvem |
| `VITE_API_URL` | `http://localhost:3000` | Vercel | URL pública da API no Render |

### Limitações da Camada Gratuita

1. **Cold Start do Backend**: após 15 minutos sem uso, o Render suspende a instância gratuita. O primeiro envio de placar pode levar de 30 a 50 segundos até o servidor acordar. A navegação pelas telas e os jogos carregam instantaneamente via CDN.
2. **Placares Efêmeros**: em `MODO_OPERACAO=web`, os placares são validados e registrados apenas no log do console do Render para demonstração, sendo descartados em caso de reinício ou hibernação do container. O quiosque físico local (`MODO_OPERACAO=local`) mantém a gravação em disco em `data/fila/` inalterada.
