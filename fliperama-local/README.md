# Fliperama local — integração com o G1

O servidor local consulta os jogos **aprovados** da API do G1, confere o SHA-256 de cada pacote, guarda o jogo no computador e o executa isolado em um iframe. O placar `PLACAR` vem do jogo; o fliperama mostra a pontuação, pede a nota e guarda a partida em `data/fila-resultados.json`. Se a API do G1 estiver indisponível, tenta reenviar a mesma partida a cada 30 segundos. O catálogo é atualizado ao iniciar, a cada 3 horas e manualmente em `/manage`.

## Preparar a estação

1. Dentro de `fliperama-local`, execute `npm ci`.
2. Copie `.env.example` para `.env` e preencha `TOKEN_ESTACAO_G1` com o token `est_...` que um curador do G1 criar para este fliperama. **Não envie o token para o GitHub ou para os jogos.** A URL padrão da API já está configurada.
3. Em um terminal execute `npm run server`; em outro, `npm run dev`. Abra a URL do Vite (`http://localhost:5173`). A API local (`http://localhost:3000`) não tem página inicial: consulte `/health` ou `/jogos`.
4. Para atualizar manualmente, acesse `http://localhost:5173/manage` e use **SINCRONIZAR JOGOS**.

Sem token, a partida continua salva na fila local e o terminal informa que o envio ao G1 está pendente. Para conferir a publicação, abra `https://plataforma-gestao-api.onrender.com/api/ranking/jogadores?jogo=jogo-exemplo` depois de jogar e de a fila ser esvaziada.

## Contrato com jogos e ranking

- O G1 publica o catálogo por `GET /api/jogos` e os zips por `pacote_url`. Só jogos aprovados aparecem no fliperama. Uma falha na rede ou no hash preserva o catálogo que já estava no disco.
- Um jogo aprovado recebe `ARCADE_INIT` e, ao terminar, envia uma única mensagem para o pai: `{ tipo: 'PLACAR', jogo: 'jogo-exemplo', versao: '1.1.0', jogador: 'ANA', pontos: 1450, duracao_s: 95, acertos: 8, erros: 2, tema: 'Matemática' }`. O ID e a versão devem corresponder aos do jogo aberto. Jogos anteriores que emitem `GAME_OVER` continuam com um caminho de compatibilidade, mas não entram no catálogo aprovado até serem publicados no G1.
- O apelido dos jogos aprovados é preenchido **no fim do próprio jogo**, conforme a decisão da turma registrada pelo G1 em 23/09. Após o resultado, o fliperama pede a nota; não solicita matrícula. O envio ao G1 é `POST /api/placares` com `Authorization: Bearer est_...`, `id_partida` UUID, `jogo`, `jogador`, `pontos`, métricas e `feedback: { nota }`. O token permanece apenas no servidor local.
- Um resultado só sai da fila após resposta HTTP `200` ou `201`. O mesmo `id_partida` é mantido em todas as tentativas, para que a API do G1 ignore repetições.

Referência: [guia de integração do G1](https://github.com/Arcade-IFES/Plataforma-Gestao-API/blob/develop/docs/integracao.md), [contrato de placares](https://github.com/Arcade-IFES/Plataforma-Gestao-API/blob/develop/docs/placares.md) e [catálogo](https://github.com/Arcade-IFES/Plataforma-Gestao-API/blob/develop/docs/catalogo.md).

## Verificar antes do PR

Execute `npm test`, `npm run build` e `npm run lint`. Para demonstrar o fluxo de ponta a ponta no ranking público, é preciso que um curador disponibilize um token de estação válido, e que o jogo apareça em `/api/jogos` como aprovado.
