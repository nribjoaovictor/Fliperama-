# Quickstart: Validação da Integração Fliperama Local ↔ API da Plataforma de Gestão

# Guia rápido de validação da integração com a API da Plataforma de Gestão

## Pré-requisitos

- Node.js 24 LTS (`nvm use`)
- Docker ativo (para o PostgreSQL da API local em `/home/user/projetos/arcade-ifes/Portal-Web`)

## 1. Subir a API da Plataforma de Gestão Localmente (Porta 4000)

## Subir tudo com um comando

## Atalho em Comando Único

Na pasta `fliperama-local/`, este comando sobe o PostgreSQL no Docker, roda as migrations e o seed da API, cadastra os cinco jogos do fliperama no banco, inicia a API na porta `4000` e abre o Fastify (`:3000`) e o Vite (`:5173`):

Dentro de `fliperama-local/`, você pode subir todo o ambiente integrado (PostgreSQL no Docker, migrations, seed da API, cadastro dos 5 jogos, API na porta `4000`, Fastify na porta `3000` e Vite na porta `5173`) com um único comando:

```bash
cd /home/user/projetos/arcade-ifes/codigo/fliperama-local
npm run start:integrado
```

Para subir apenas o fliperama (modo local/offline, sem a API externa):
Para subir apenas o fliperama em modo local e offline, sem a API externa:

```bash
cd /home/user/projetos/arcade-ifes/codigo/fliperama-local
npm run start:local
```

---

## 1. Subir a API da Plataforma de Gestão manualmente (porta 4000)

## 1. Subir a API da Plataforma de Gestão Manualmente (Porta 4000)

Se preferir iniciar cada serviço no seu próprio terminal, suba primeiro o banco e a API clonada em `/home/user/projetos/arcade-ifes/Portal-Web`:

Em um terminal, inicialize o banco e suba a API clonada em `/home/user/projetos/arcade-ifes/Portal-Web`:

```bash
cd /home/user/projetos/arcade-ifes/Portal-Web
npm run install:all
cp -n api/.env.example api/.env
npm run demo:setup
PORT=4000 npm --prefix api run dev
```

Verifique se a API respondeu:
Confirme que a API está respondendo:

```bash
curl http://localhost:4000/health
# Esperado: {"ok":true,"service":"plataforma-gestao-api","status":"ok","banco":"ok"}
```

## 2. Configurar e Preparar o Fliperama Local (Porta 3000)

## 2. Configurar e preparar o fliperama local (porta 3000)

No diretório `fliperama-local/`:
Na pasta `fliperama-local/`, copie o arquivo de variáveis e cadastre os cinco jogos do fliperama (`orbita-do-saber`, `logica-em-dungeon`, `corrida-contra-o-sino`, `estrelas-da-ciencia` e `encaixe-cientifico`) na tabela `jogos` do banco local da API:

```bash
cd /home/user/projetos/arcade-ifes/codigo/fliperama-local
cp -n .env.example .env
npm run seed:api-local
```

O comando `npm run seed:api-local` garante que os 5 jogos do acervo do fliperama (`orbita-do-saber`, `logica-em-dungeon`, `corrida-contra-o-sino`, `estrelas-da-ciencia`, `encaixe-cientifico`) estejam cadastrados na tabela `jogos` do banco local da API para aceitar placares.

## 3. Rodar os testes automatizados

## 3. Executar a Suíte de Testes Automatizados

```bash
cd /home/user/projetos/arcade-ifes/codigo/fliperama-local
npm test
```

Todos os testes em `tests/*.test.ts` (incluindo `tests/integracao-api-g1.test.ts` e `tests/placar.test.ts`) devem passar validando:
A suíte em `tests/*.test.ts` (incluindo `tests/integracao-api-g1.test.ts` e `tests/placar.test.ts`) verifica o envio do cabeçalho `Authorization: Bearer <TOKEN_ESTACAO>` e o formato do placar descritos em [`contracts/api-g1-contract.md`](./contracts/api-g1-contract.md), a sincronização via `GET /api/jogos` com checagem de `sha256` e fallback local, e a movimentação dos registros de `data/fila/` para `data/enviadas/` quando a API responde `201` ou `200`.

- Envio do cabeçalho `Authorization: Bearer <TOKEN_ESTACAO>` e formato oficial do placar ([`contracts/api-g1-contract.md`](./contracts/api-g1-contract.md)).
- Sincronização de jogos aprovados via `GET /api/jogos` com conferência de `sha256`, cache sem redownload e mesclagem com fallback local.
- Preservação da fila em `data/fila/` quando offline e migração para `data/enviadas/` quando a API responde `201` ou `200`.

## 4. Testar o fluxo completo manualmente

## 4. Validar o Fluxo Fim a Fim Manualmente

1. Suba o servidor Fastify do fliperama:

   ```bash
   cd /home/user/projetos/arcade-ifes/codigo/fliperama-local
   npm run server
   ```

2. Confira o catálogo sincronizado (deve listar `quiz-invaders` vindo da API + os 5 jogos locais):

3. Consulte o catálogo sincronizado (deve listar `quiz-invaders` vindo da API e os cinco jogos locais):

   ```bash
   curl http://localhost:3000/jogos
   ```

4. Envie um resultado de partida para o fliperama local:

5. Envie um resultado de partida para o servidor do fliperama:

   ```bash
   curl -X POST http://localhost:3000/resultados \
     -H "Content-Type: application/json" \
     -d '{"matricula":"","apelido":"TESTE1","jogoId":"corrida-contra-o-sino","pontuacao":320,"avaliacao":5}'
   ```

6. Verifique no ranking da API (`porta 4000`) que o placar chegou imediatamente:

7. Consulte o ranking na API (`porta 4000`) para confirmar que o placar entrou:

   ```bash
   curl "http://localhost:4000/api/ranking/jogadores?jogo=corrida-contra-o-sino"
   ```
