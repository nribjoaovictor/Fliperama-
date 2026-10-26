# Tasks: Adicionar jogo Encaixe Científico ao catálogo local

**Feature**: Adicionar jogo Encaixe Científico ao catálogo local
**Branch**: `feature/adicionar-encaixe-cientifico`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verificação do ambiente e alinhamento com a base de código

- [X] T001 Inspecionar a lista atual de jogos em `fliperama-local/server/services/sincronizacaoService.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Garantir que as rotinas de adaptação e extração suportam o novo jogo

- [X] T002 Verificar compatibilidade de `extrairPontuacao` e injeção de `questoes.json` em `fliperama-local/server/services/adaptacaoJogosService.ts`

---

## Phase 3: User Story 1 - Jogador seleciona e joga Encaixe Científico (Priority: P1) 🎯 MVP

**Goal**: Adicionar Encaixe Científico ao catálogo de jogos do quiosque com suporte a carregamento e extração de placar.

**Independent Test**: Executar teste automatizado em `fliperama-local/tests/adaptacao-jogos.test.ts` e verificar que o jogo `encaixe-cientifico` é reconhecido, não sofre corrupção de código e preserva integração própria.

### Tests for User Story 1

- [X] T003 [P] [US1] Adicionar asserção para `encaixe-cientifico` em `fliperama-local/tests/adaptacao-jogos.test.ts`

### Implementation for User Story 1

- [X] T004 [US1] Incluir objeto com id `'encaixe-cientifico'`, nome `'Encaixe Científico'`, autores `'Eliabe Loureiro, Isac Victor, Pedro Paglioni'`, repositorio `'https://github.com/Arcade-IFES/Encaixe_cientifico'` e arquivoInicial `'index.html'` na constante `JOGOS` em `fliperama-local/server/services/sincronizacaoService.ts`
- [X] T005 [US1] Executar `npm test` em `fliperama-local` e validar que todos os 35+ testes passam

---

## Phase 4: User Story 2 - Operador prepara quiosque para demonstração offline (Priority: P2)

**Goal**: Permitir download, extração do pacote e geração do catálogo estático para operação 100% offline.

**Independent Test**: Executar `npm run sync:jogos` em `fliperama-local` e verificar a extração dos arquivos em `public/jogos/Encaixe_cientifico-main/` e entrada correspondente em `public/jogos/catalogo.json`.

### Implementation for User Story 2

- [X] T006 [US2] Executar script `npm run sync:jogos` em `fliperama-local` para baixar `Encaixe_cientifico` e embutir `questoes.json`
- [X] T007 [US2] Validar integridade dos arquivos extraídos (`index.html`, `questoes.json`, `capa.png`) em `fliperama-local/public/jogos/Encaixe_cientifico-main/`

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verificação de build e consistência final

- [X] T008 [P] Atualizar `docs/ambiente-demo.md` registrando a inclusão do Encaixe Científico no catálogo da demo
- [X] T009 Executar `npm run build` e `npm test` em `fliperama-local` para garantir integridade completa antes do merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências
- **Foundational (Phase 2)**: Depende do Setup
- **User Story 1 (Phase 3)**: Depende da Phase 2 (MVP)
- **User Story 2 (Phase 4)**: Depende da conclusão de User Story 1
- **Polish (Phase 5)**: Depende de US1 e US2

### Implementation Strategy

1. TDD: Atualizar teste em `adaptacao-jogos.test.ts` (T003)
2. Implementar entrada em `sincronizacaoService.ts` (T004)
3. Executar `npm test` (T005) - MVP concluído
4. Executar `npm run sync:jogos` (T006) e validar arquivos locais (T007)
5. Build de produção e docs (T008, T009)
