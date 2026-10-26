# Feature Specification: Adicionar jogo Encaixe Científico ao catálogo local

**Feature Branch**: `feature/adicionar-encaixe-cientifico`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "incluir esse jogo mockado: https://github.com/Arcade-IFES/Encaixe_cientifico"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jogador seleciona e joga Encaixe Científico no quiosque (Priority: P1)

Como jogador no quiosque físico do pátio, quero encontrar o jogo "Encaixe Científico" no catálogo, iniciar a partida e jogar até o fim para aprender sobre mulheres na ciência e registrar meu placar.

**Why this priority**: É a jornada principal de valor para o aluno no quiosque; disponibiliza o jogo na estação com suporte completo ao ciclo de vida e captura de placar.

**Independent Test**: Iniciar o quiosque, navegar pelo catálogo de jogos até o card "Encaixe Científico", iniciar a partida, jogar ou aguardar encerramento, e confirmar que a pontuação é recebida e apresentada na tela de resultado do quiosque.

**Acceptance Scenarios**:

1. **Given** o quiosque com catálogo carregado, **When** o jogador navega até "Encaixe Científico", **Then** o sistema exibe o card com título, autores ("Eliabe Loureiro, Isac Victor, Pedro Paglioni") e capa ilustrativa.
2. **Given** o jogo "Encaixe Científico" selecionado, **When** o jogador confirma o início da partida, **Then** o jogo carrega em iframe seguro com foco no teclado.
3. **Given** partida em andamento de "Encaixe Científico", **When** o jogo atinge o término, **Then** o quiosque captura o evento `PLACAR` contendo pontuação, acertos, erros e duração, avançando para a tela de avaliação e identificação.

---

### User Story 2 - Operador prepara quiosque para demonstração offline (Priority: P2)

Como operador preparando a máquina do quiosque para demonstração, quero que o jogo "Encaixe Científico" seja baixado, adaptado e armazenado em disco durante o build/sincronização para funcionar sem depender de conexão com a internet.

**Why this priority**: Garante que a estação física atenda ao princípio de operação Offline-First e que a demonstração de campo não falhe caso a rede esteja indisponível.

**Independent Test**: Executar a rotina de sincronização de jogos local, verificar que os arquivos do repositório `Encaixe_cientifico` foram extraídos em disco e desconectar a rede, comprovando que o jogo continua jogável.

**Acceptance Scenarios**:

1. **Given** conexão com a internet durante a preparação, **When** a sincronização de jogos é acionada, **Then** o pacote de "Encaixe Científico" é baixado do GitHub, extraído e registrado no catálogo local.
2. **Given** arquivos de "Encaixe Científico" em disco, **When** a máquina do quiosque opera offline, **Then** o jogo carrega normalmente a partir dos arquivos locais do servidor Fastify.

---

### Edge Cases

- O repositório do jogo contém arquivo `questoes.json`: o servidor deve garantir que os arquivos estáticos auxiliares sejam servidos corretamente pelo Fastify.
- Se a rede estiver indisponível durante o primeiro boot sem pré-sincronização, o quiosque utiliza os jogos já salvos em cache sem travar a interface.
- Se o jogo demorar mais de 15 segundos para carregar, o timeout de segurança do quiosque deve permitir retornar ao catálogo de forma limpa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST incluir "Encaixe Científico" na lista de jogos conhecidos com identificador `encaixe-cientifico`, apontando para o repositório `https://github.com/Arcade-IFES/Encaixe_cientifico` e arquivo inicial `index.html`.
- **FR-002**: A rotina de sincronização e build MUST baixar o zip da branch principal do repositório e extrair seus arquivos no diretório de dados de jogos local.
- **FR-003**: O catálogo servido para o frontend MUST conter metadados completos do jogo: ID, nome legível, autores e URL local de execução.
- **FR-004**: O runner em iframe MUST receber e validar o evento `PLACAR` emitido por "Encaixe Científico", repassando a pontuação para a máquina de estados da sessão do quiosque.
- **FR-005**: O jogo MUST operar de forma completa sem conexão à internet após ter sido sincronizado em disco.

### Key Entities

- **JogoCatalogo**: Entidade de catálogo local com identificador (`encaixe-cientifico`), nome ("Encaixe Científico"), autores ("Eliabe Loureiro, Isac Victor, Pedro Paglioni"), repositório e arquivo inicial.
- **ResultadoPartida**: Registro da partida finalizada contendo pontuação, contagem de acertos, contagem de erros, duração em segundos e identificador do jogo associado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O jogo "Encaixe Científico" aparece disponível no catálogo local imediatamente após a conclusão da rotina de sincronização/build.
- **SC-002**: 100% das partidas finalizadas de "Encaixe Científico" transmitem a pontuação para a tela de encerramento do quiosque sem erros de console ou travamento.
- **SC-003**: O quiosque inicia e executa partidas de "Encaixe Científico" em ambiente 100% desconectado da internet após sincronização inicial.

## Assumptions

- O jogo utiliza a branch padrão `main` e inicia pelo arquivo `index.html` na raiz do pacote zip.
- O jogo comunica término de partida através da mensagem `window.parent.postMessage` com `tipo: 'PLACAR'`.
- Os autores oficiais são "Eliabe Loureiro, Isac Victor, Pedro Paglioni", conforme registrado no arquivo `game.json` e nos commits do repositório.
