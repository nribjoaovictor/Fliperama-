# Implementation Plan: Integração MVP do Fliperama Local com a API da Plataforma de Gestão

**Branch**: `feature/integracao-api-gestao` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-integracao-api-gestao/spec.md`

## Summary

Integrar o servidor local do Fliperama (`fliperama-local/server/`) com a API oficial da Plataforma de Gestão (`Portal-Web/api`) em escopo MVP:
1. Externalizar `API_G1` (default `http://localhost:4000`) e `TOKEN_ESTACAO` (default `dev-estacao`) com suporte a `.env` e `.env.example` (RF-L20, RNF-L06).
2. Autenticar o envio de placares (`POST /api/placares`) com `Authorization: Bearer <TOKEN_ESTACAO>` e payload compatível com o contrato oficial (`id_partida`, `jogo`, `jogo_id`, `jogador`, `pontos`, `feedback: { nota }`, `nota`, `jogado_em`), disparando tentativa imediata após enfileiramento no servidor sem bloquear o jogador e mantendo retentativa periódica de 30s (RF-L08).
3. Sincronizar jogos aprovados de `GET /api/jogos` comparando `sha256` com `data/catalogo.json`, baixando e validando pacotes `.zip` de `pacote_url`, extraindo em `data/jogos/<id>/` com adaptação para sandbox (`questoes.json`), mesclando com a lista local `JOGOS` como fallback e salvando `data/catalogo.json` atomicamente (RF-L01, RF-L02, RF-L15).
4. Fornecer script auxiliar em `fliperama-local/scripts/` para garantir os 5 jogos do acervo do fliperama cadastrados na instância local da API (`Portal-Web/api`) durante testes integrados, sem modificar arquivos rastreados do repositório externo.

## Technical Context

**Language/Version**: TypeScript 6 / Node.js 24 LTS  
**Primary Dependencies**: Fastify 5, `@fastify/cors`, `@fastify/static`, `adm-zip`, React 19, Vite 8  
**Storage**: Sistema de arquivos local (`./data/catalogo.json`, `./data/jogos/`, `./data/fila/`, `./data/enviadas/`) com persistência atômica (`.tmp` + `rename`)  
**Testing**: Node.js test runner nativo (`node --import tsx --test tests/*.test.ts`)  
**Target Platform**: Quiosque Linux x86_64 (WSL2 Ubuntu em dev / Linux kiosk em produção)  
**Project Type**: Web service local (Fastify) + SPA frontend (React/Vite)  
**Performance Goals**: Envio assíncrono sem bloquear `POST /resultados` (< 50 ms de resposta local); reutilização de pacotes em cache quando `sha256` inalterado  
**Constraints**: Operação Offline-First obrigatória; token da estação restrito ao processo Node.js local; zero modificações em arquivos versionados fora de `fliperama-local/`  
**Scale/Scope**: 1 quiosque local sincronizando catálogo de jogos aprovados + 5 jogos locais de fallback e fila local de placares

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Justificativa |
|---|---|---|
| I. Operação Offline-First e Autonomia Local | PASS | Se `GET /api/jogos` ou `POST /api/placares` falharem por ausência de rede/API, o quiosque preserva `data/catalogo.json` e mantém os placares em `data/fila/` sem interromper ou atrasar a sessão do jogador. |
| II. Idempotência e Confiabilidade na Coleta de Placares | PASS | Cada partida recebe UUID (`id_partida`) e `jogado_em` no momento da gravação local; `POST /api/placares` aceita tanto `201 Created` quanto `200 OK` (`duplicada: true`) para mover o arquivo para `data/enviadas/`. |
| III. Resiliência a Queda Abrupta de Energia (Atomic Persistence) | PASS | `filaResultadosService.ts` já utiliza escrita atômica (`.tmp` + `fs.sync` + `fs.rename`); `catalogoService.ts` passa a gravar `data/catalogo.json` com a mesma estratégia atômica *write-then-rename*. |
| IV. Isolamento Estrito de Jogos via Iframe (Security Sandbox) | PASS | Jogos baixados da API continuam executando em `<iframe sandbox="allow-scripts">` sem `allow-same-origin` e passam por `adaptarArquivoDoJogo` para embutir `questoes.json` localmente. |
| V. Testes Automatizados com Node Test Runner Nativo | PASS | Toda a validação de contrato, autenticação Bearer, sincronização com `sha256` e fallback offline é coberta com `node --test` sem dependências externas de teste. |

## Project Structure

### Documentation (this feature)

```text
specs/005-integracao-api-gestao/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-g1-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Gerado na próxima fase (/speckit-tasks)
```

### Source Code (repository root)

```text
fliperama-local/
├── .env.example                             # Documentação de API_G1, TOKEN_ESTACAO, PORT e CORS_ORIGIN
├── package.json                             # Suporte a --env-file-if-exists=.env e script seed:api-local
├── server/
│   ├── server.ts                            # Registro da rota /resultados com disparo assíncrono de reenvio
│   ├── routes/
│   │   └── resultados.ts                    # Disparo opcional não-bloqueante de envio após persistir na fila
│   └── services/
│       ├── configService.ts                 # Leitura centralizada de API_G1 e TOKEN_ESTACAO (env + defaults)
│       ├── catalogoService.ts               # Escrita atômica (write-then-rename) de data/catalogo.json
│       ├── envioResultadosService.ts        # Header Authorization: Bearer e payload oficial para /api/placares
│       └── sincronizacaoService.ts          # Sync GET /api/jogos + pacote_url + sha256 + fallback JOGOS
├── scripts/
│   └── seed-jogos-api-local.ts              # Utilitário para registrar os 5 jogos do G3 na API local (porta 4000)
└── tests/
    ├── placar.test.ts                       # Testes existentes + validação de header Bearer e formato oficial
    └── integracao-api-g1.test.ts            # Testes de integração da sincronização via API, sha256 e envio
```

**Structure Decision**: Manter a estrutura existente em `fliperama-local/server/` e `fliperama-local/scripts/`, adicionando `configService.ts` para isolar a resolução de `API_G1` e `TOKEN_ESTACAO` e `scripts/seed-jogos-api-local.ts` para preparar o banco da API local sem tocar no repositório clonado em `/home/user/projetos/arcade-ifes/Portal-Web`.

## Complexity Tracking

Nenhuma violação constitucional.
