# Research: Adicionar jogo Encaixe Científico

## Unknowns & Decisions

### Decision 1: Protocolo de comunicação de placar
- **Decision**: Utilizar o contrato nativo do jogo `tipo: 'PLACAR'` emitido via `window.parent.postMessage`.
- **Rationale**: A inspeção do código-fonte de `Arcade-IFES/Encaixe_cientifico` revelou que o jogo já implementa nativamente o envio de:
  ```javascript
  window.parent.postMessage({
    tipo: 'PLACAR', jogo: 'encaixe-cientifico', versao: '1.0.0',
    pontos: Math.max(0, Math.round(P.pontos)),
    duracao_s: Math.min(TEMPO_TOTAL, Math.round(P.quadros / FPS)),
    acertos: P.acertos, erros: P.erros, tema: 'Mulheres na Ciência'
  }, '*');
  ```
  Isso é 100% compatível com a função `extrairPontuacao` do frontend (`tipo === 'PLACAR'` e campo direto `pontos`), sem necessidade de monkey patching de função de fim no `adaptacaoJogosService.ts`.
- **Alternatives considered**:
  - Criar um interceptador de função no `adaptacaoJogosService.ts`: desnecessário e frágil, pois o jogo já adota o padrão oficial do fliperama.

### Decision 2: Tratamento de CORS para `questoes.json`
- **Decision**: O mecanismo existente de embutir `questoes.json` em `adaptarHtmlDoJogo` já atende automaticamente `Encaixe_cientifico`.
- **Rationale**: `adaptacaoJogosService.ts` possui a regra:
  ```typescript
  if (questoesJson !== undefined && /fetch\(\s*['"]questoes\.json/.test(resultado)) {
    resultado = embutirQuestoes(resultado, questoesJson)
  }
  ```
  Como o jogo executa `fetch('questoes.json')` ao inicializar, o serviço detecta o padrão e embute o JSON como script inline, contornando a restrição de origem nula do sandbox `<iframe>`.
- **Alternatives considered**:
  - Servir sem sandbox ou com `allow-same-origin`: violaria o Princípio Constitucional IV (Isolamento Estrito via Sandbox).

### Decision 3: Estrutura de metadados no catálogo estático e dinâmico
- **Decision**: Adicionar entrada em `JOGOS` em `server/services/sincronizacaoService.ts`:
  ```typescript
  {
    id: 'encaixe-cientifico',
    nome: 'Encaixe Científico',
    autores: 'Eliabe Loureiro, Isac Victor, Pedro Paglioni',
    repositorio: 'https://github.com/Arcade-IFES/Encaixe_cientifico',
    arquivoInicial: 'index.html',
  }
  ```
- **Rationale**: Tanto o backend Fastify quanto o script de build `scripts/sync-jogos-build.ts` consomem esse array `JOGOS` como fonte canônica.
