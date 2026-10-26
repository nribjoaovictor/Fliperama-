# Implementation Plan: Adicionar jogo Encaixe Científico ao catálogo local

**Branch**: `feature/adicionar-encaixe-cientifico` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-adicionar-encaixe-cientifico/spec.md`

## Summary

Adicionar o jogo "Encaixe Científico" (`https://github.com/Arcade-IFES/Encaixe_cientifico`) à lista canônica `JOGOS` em `server/services/sincronizacaoService.ts`, permitindo que o servidor Fastify e o script de build (`scripts/sync-jogos-build.ts`) baixem, armazenem em cache e sirvam o jogo localmente em modo offline. O jogo já utiliza o protocolo nativo `postMessage` (`tipo: 'PLACAR'`) e tem seu `questoes.json` embutido automaticamente pelo serviço de adaptação.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 24 LTS
**Primary Dependencies**: Fastify 5, AdmZip, React 19, Vite 8
**Storage**: Sistema de arquivos local (`./data/jogos/` para runtime, `public/jogos/` para build estático)
**Testing**: Node.js test runner nativo (`node --test`)
**Target Platform**: Quiosque Linux x86_64 (Ubuntu 24.04 GNOME / Wayland)
**Project Type**: Web service + SPA frontend
**Performance Goals**: Tempo de carregamento do jogo < 3s a partir do disco local; < 100 MB RAM para o servidor Fastify
**Constraints**: Operação offline total; isolamento em `iframe sandbox="allow-scripts"`; persistência atômica
**Scale/Scope**: 5 jogos no catálogo local; 1 quiosque físico

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Justificativa |
|---|---|---|
| I. Operação Offline-First e Autonomia Local | PASS | O jogo é baixado na preparação da máquina e servido localmente via Fastify ou cache estático. Nenhuma chamada à internet em tempo de execução. |
| II. Idempotência e Coleta de Placares | PASS | O placar emitido pelo jogo (`tipo: 'PLACAR'`) é recebido e enfileirado com UUID e timestamp atômico. |
| III. Persistência Atômica | PASS | O catálogo de jogos e fila de resultados utilizam escrita segura *write-then-rename*. |
| IV. Isolamento Estrito via Sandbox | PASS | O jogo executa em `<iframe sandbox="allow-scripts">` sem `allow-same-origin`. O CORS de `questoes.json` é resolvido por injeção controlada de script inline. |
| V. Testes Automatizados Nativo | PASS | Suíte com `node --test` valida metadados, adaptação sem alterações indevidas e extração de pontuação. |

## Project Structure

### Documentation (this feature)

```text
specs/004-adicionar-encaixe-cientifico/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── game-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code

```text
fliperama-local/
├── server/
│   └── services/
│       ├── sincronizacaoService.ts    # Adicionar Encaixe Científico em JOGOS
│       └── adaptacaoJogosService.ts   # Garantir compatibilidade nativa
├── scripts/
│   └── sync-jogos-build.ts           # Utiliza JOGOS automaticamente
└── tests/
    └── adaptacao-jogos.test.ts        # Teste de integração do Encaixe Científico
```

**Structure Decision**: Monorepo existente em `fliperama-local/` mantendo separação entre `server/` (Fastify) e `src/` (React).

## Complexity Tracking

Nenhuma violação constitucional.
