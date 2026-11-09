# Quickstart: Validação da Integração Fliperama Local ↔ API da Plataforma de Gestão

## Pré-requisitos

- Node.js 24 LTS (`nvm use`)
- Docker ativo (para o PostgreSQL da API local em `/home/user/projetos/arcade-ifes/Portal-Web`)

## 1. Subir a API da Plataforma de Gestão Localmente (Porta 4000)

Em um terminal, inicialize o banco e suba a API clonada em `/home/user/projetos/arcade-ifes/Portal-Web`:

```bash
cd /home/user/projetos/arcade-ifes/Portal-Web
npm run install:all
cp -n api/.env.example api/.env
npm run demo:setup
PORT=4000 npm --prefix api run dev
```

Verifique se a API respondeu:

```bash
curl http://localhost:4000/health
# Esperado: {"ok":true,"service":"plataforma-gestao-api","status":"ok","banco":"ok"}
```

## 2. Configurar e Preparar o Fliperama Local (Porta 3000)

No diretório `fliperama-local/`:

```bash
cd /home/user/projetos/arcade-ifes/codigo/fliperama-local
cp -n .env.example .env
npm run seed:api-local
```

O comando `npm run seed:api-local` garante que os 5 jogos do acervo do fliperama (`orbita-do-saber`, `logica-em-dungeon`, `corrida-contra-o-sino`, `estrelas-da-ciencia`, `encaixe-cientifico`) estejam cadastrados na tabela `jogos` do banco local da API para aceitar placares.

## 3. Executar a Suíte de Testes Automatizados

```bash
cd /home/user/projetos/arcade-ifes/codigo/fliperama-local
npm test
```

Todos os testes em `tests/*.test.ts` (incluindo `tests/integracao-api-g1.test.ts` e `tests/placar.test.ts`) devem passar validando:
- Envio do cabeçalho `Authorization: Bearer <TOKEN_ESTACAO>` e formato oficial do placar ([`contracts/api-g1-contract.md`](./contracts/api-g1-contract.md)).
- Sincronização de jogos aprovados via `GET /api/jogos` com conferência de `sha256`, cache sem redownload e mesclagem com fallback local.
- Preservação da fila em `data/fila/` quando offline e migração para `data/enviadas/` quando a API responde `201` ou `200`.

## 4. Validar o Fluxo Fim a Fim Manualmente

1. Suba o servidor Fastify do fliperama:
   ```bash
   cd /home/user/projetos/arcade-ifes/codigo/fliperama-local
   npm run server
   ```
2. Confira o catálogo sincronizado (deve listar `quiz-invaders` vindo da API + os 5 jogos locais):
   ```bash
   curl http://localhost:3000/jogos
   ```
3. Envie um resultado de partida para o fliperama local:
   ```bash
   curl -X POST http://localhost:3000/resultados \
     -H "Content-Type: application/json" \
     -d '{"matricula":"","apelido":"TESTE1","jogoId":"corrida-contra-o-sino","pontuacao":320,"avaliacao":5}'
   ```
4. Verifique no ranking da API (`porta 4000`) que o placar chegou imediatamente:
   ```bash
   curl "http://localhost:4000/api/ranking/jogadores?jogo=corrida-contra-o-sino"
   ```

