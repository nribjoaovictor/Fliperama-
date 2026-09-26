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
3. `POST /resultados` grava a partida em `fliperama-local/data/fila-resultados.json`. A cada 30 segundos o servidor tenta enviar os pendentes para `POST /api/placares` na API configurada por `API_G1` (padrão: `http://localhost:4000`). Uma partida sai da fila somente depois de resposta HTTP de sucesso.
4. O envio usa `id_partida`, `jogo_id`, `jogador`, `pontos`, `nota` e `jogado_em`, conforme o mock de integração do G2 em `Portal-Web/develop`. A matrícula fica apenas na fila local e **não** é enviada nesse contrato. O ranking oficial é calculado pela API que recebe os placares.

Os IDs usados hoje no catálogo são `orbita-do-saber`, `logica-em-dungeon` e `corrida-contra-o-sino`; devem coincidir com os IDs da API oficial quando ela for definida. Resultados antigos da fila com IDs numéricos 1, 2 e 3 são convertidos no envio.

**Integração pendente nos jogos:** `Corrida-Contra-o-Sino` já emite `GAME_OVER` com `payload.score`. Os repositórios `Orbita-do-Saber` e `-Logic-Dungeon-` ainda guardam o ranking apenas no navegador do próprio jogo; seus autores precisam emitir a mesma mensagem na função de fim de partida (`fim()` ou `gameOver()`). O placar interno pode continuar para execução isolada. A tela do fliperama na porta 5173 não consegue ler o `localStorage` dos jogos exibidos na porta 3000; por isso precisa da mensagem.

Para testar com o mock do G2, rode o mock na porta 4000 (`PORT=4000`) e aponte `API_G1` para `http://localhost:4000`. Para testar só a captura, `public/jogos/jogo_teste/index.html` contém uma partida de exemplo que envia `GAME_OVER`.
