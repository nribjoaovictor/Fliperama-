# Feature Specification: Integração MVP do Fliperama Local com a API da Plataforma de Gestão

**Feature Branch**: `feature/integracao-api-gestao`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "preciso fazer a integraçao com essa api: https://github.com/EliabedeJesusL/Portal-Web (MVP: configuração externa de URL e token da estação, envio autenticado e idempotente de placares com tentativa imediata e fila offline, sincronização de catálogo aprovado com validação de integridade sha256 e fallback local)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Envio autenticado e idempotente de placares e avaliações (Priority: P1)

Como jogador e curador do Recreio Arcade, quero que a pontuação e a nota atribuídas ao término de uma partida no quiosque sejam transmitidas de forma autenticada para a Plataforma de Gestão assim que a partida é concluída — ou reenviadas automaticamente quando a conexão voltar — para que os resultados entrem no ranking oficial e nas estatísticas sem risco de perda ou duplicação.

**Why this priority**: É o fluxo central de retorno de dados do quiosque (RF-L06, RF-L07, RF-L08). Sem autenticação de estação e contrato alinhado, todas as partidas são rejeitadas pela plataforma central.

**Independent Test**: Concluir uma partida no quiosque com a plataforma central acessível, verificar que o placar e a avaliação são aceitos na primeira tentativa, que o registro local migra da fila pendente para confirmados, e que um reenvio do mesmo identificador de partida não duplica pontos no ranking.

**Acceptance Scenarios**:

1. **Given** o quiosque configurado com credencial de estação válida e conexão ativa com a plataforma central, **When** o jogador conclui a avaliação e identificação da partida, **Then** o quiosque salva o registro na fila local, transmite o placar autenticado imediatamente (contendo identificador único da partida, jogo, apelido, pontos, avaliação e data/hora) e move o registro para a pasta de enviados após confirmação.
2. **Given** partidas pendentes na fila local geradas durante indisponibilidade da plataforma central, **When** a conexão com a plataforma central é restabelecida no ciclo periódico de reenvio, **Then** o quiosque transmite cada partida pendente com seu identificador original e move os registros confirmados para a pasta de enviados.
3. **Given** uma partida cujo identificador único já foi processado anteriormente pela plataforma central, **When** o quiosque reenvia o mesmo registro por oscilação de rede, **Then** a plataforma reconhece a partida como duplicada sem criar novo registro no ranking e o quiosque marca o envio como concluído.

---

### User Story 2 - Sincronização de jogos aprovados com verificação de integridade e fallback local (Priority: P2)

Como operador do quiosque e curador, quero que o fliperama consulte o catálogo de jogos aprovados na Plataforma de Gestão, baixe e valide pacotes novos ou atualizados em disco e preserve os jogos locais conhecidos como fallback, para que os alunos tenham acesso tanto aos jogos publicados na plataforma quanto ao acervo local mesmo sem internet.

**Why this priority**: Atende aos requisitos de sincronização e operação offline (RF-L01, RF-L02), garantindo que jogos aprovados na curadoria cheguem ao quiosque sem quebrar os títulos já disponíveis na estação.

**Independent Test**: Acionar a sincronização com a plataforma central ativa contendo um jogo aprovado, verificar que o pacote é baixado, validado por hash de integridade, descompactado localmente e listado no catálogo ao lado dos jogos de fallback, permanecendo jogável após desconectar a rede.

**Acceptance Scenarios**:

1. **Given** a plataforma central disponível com jogos aprovados no catálogo, **When** o quiosque executa a sincronização, **Then** o sistema baixa apenas os pacotes cujo hash de integridade difere do catálogo local, valida o hash do pacote recebido, extrai os arquivos para execução em sandbox e atualiza o catálogo local.
2. **Given** um jogo aprovado na plataforma central cujo hash de integridade já coincide com a versão registrada no catálogo local em disco, **When** a sincronização é executada, **Then** o quiosque reaproveita os arquivos locais sem baixar novamente o pacote.
3. **Given** a plataforma central indisponível no momento da inicialização ou sincronização, **When** a rotina de sincronização falha ao consultar o catálogo remoto, **Then** o quiosque preserva o catálogo local existente e mantém os jogos em cache prontos para uso.

---

### User Story 3 - Configuração externa da estação e preparação do ambiente local integrado (Priority: P3)

Como operador do quiosque, quero configurar o endereço da plataforma central e o token da estação fora do código-fonte e contar com os jogos da estação reconhecidos na base local de testes, para alternar entre o ambiente local de desenvolvimento e o servidor de produção sem recompilar o sistema.

**Why this priority**: Cumpre o requisito de configuração externa e segurança de credenciais (RF-L20, RNF-L06) e viabiliza a validação fim a fim com o repositório da plataforma rodando localmente.

**Independent Test**: Alterar o endereço da plataforma e o token da estação nas variáveis de configuração externa, reiniciar o serviço local do quiosque e confirmar que a sincronização e o envio de placares utilizam os novos parâmetros sem expor o token ao navegador.

**Acceptance Scenarios**:

1. **Given** variáveis de ambiente ou arquivo de configuração externa definindo a URL da plataforma e o token da estação, **When** o quiosque é iniciado, **Then** todas as comunicações de catálogo e placares utilizam esses parâmetros sem expor a credencial ao cliente web.
2. **Given** ausência de variáveis externas customizadas em ambiente de desenvolvimento, **When** o quiosque é iniciado localmente, **Then** o sistema assume os padrões de desenvolvimento local (`http://localhost:4000` e token `dev-estacao`) documentados em arquivo de exemplo.
3. **Given** uma instância local da plataforma de gestão em execução para testes integrados, **When** o operador executa a rotina de preparação de jogos da estação, **Then** todos os 5 jogos do acervo do fliperama ficam registrados na plataforma local para receber placares sem erro de jogo inexistente.

---

### Edge Cases

- **Plataforma central offline durante o fim da partida**: a tentativa imediata de envio falha silenciosamente para o jogador, o placar permanece salvo atomicamente na fila em disco e a interface avança sem atraso para a tela inicial.
- **Pacote baixado com hash de integridade divergente**: o arquivo corrompido é descartado antes da extração e não sobrescreve a versão funcional já armazenada no quiosque.
- **Jogo em sandbox com carregamento de perguntas locais (`questoes.json`)**: pacotes baixados da plataforma central que requisitam `questoes.json` recebem a adaptação local para funcionar sob origem opaca do iframe restrito.
- **Rejeição por token inválido ou jogo não cadastrado (`401` / `404`)**: o registro não é marcado como enviado e permanece na fila local até que a configuração da estação ou o cadastro do jogo seja corrigido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST ler a URL base da Plataforma de Gestão (`API_G1`) e a credencial da estação (`TOKEN_ESTACAO`) a partir de configuração externa (variáveis de ambiente com suporte a arquivo `.env` e fallback para padrões locais de desenvolvimento), mantendo o token restrito ao servidor local (RF-L20, RNF-L06).
- **FR-002**: O sistema MUST enviar placares para a rota `/api/placares` da Plataforma de Gestão autenticando a requisição com cabeçalho `Authorization: Bearer <TOKEN_ESTACAO>` (RF-L08).
- **FR-003**: O payload enviado para `/api/placares` MUST seguir o contrato oficial contendo `id_partida` (UUID), `jogo` (identificador canônico do jogo), `jogador` (apelido normalizado de até 9 caracteres ou `ANON`), `pontos` (inteiro não negativo), `feedback: { nota }` (inteiro de 1 a 5) e `jogado_em` (timestamp ISO 8601).
- **FR-004**: Ao registrar um novo resultado local, o sistema MUST persistir o arquivo na fila em disco de forma atômica e disparar imediatamente uma tentativa assíncrona de envio à Plataforma de Gestão sem bloquear a resposta à interface do jogador (RF-L08, RF-L15).
- **FR-005**: O sistema MUST tratar tanto a resposta de criação (`201`) quanto a resposta de partida já recebida anteriormente (`200` com indicação de duplicidade) como sucesso, movendo o registro de `data/fila/` para `data/enviadas/`.
- **FR-006**: Na rotina de sincronização, o sistema MUST consultar o catálogo de jogos aprovados em `/api/jogos` na Plataforma de Gestão e comparar o hash `sha256` de cada jogo remoto com o registrado no catálogo local (`data/catalogo.json`) (RF-L01).
- **FR-007**: Quando um jogo aprovado na Plataforma de Gestão for novo ou tiver `sha256` diferente do local, o sistema MUST baixar o pacote zip a partir de `pacote_url`, validar o hash `sha256` do arquivo recebido, extrair seu conteúdo em diretório próprio do jogo e aplicar a adaptação de compatibilidade para execução em iframe sandbox.
- **FR-008**: A rotina de sincronização MUST mesclar os jogos obtidos da Plataforma de Gestão com a relação local de jogos conhecidos que ainda não constem no retorno da API, garantindo que todos os títulos fiquem disponíveis no catálogo local com seus respectivos hashes `sha256` quando aplicável.
- **FR-009**: Se a Plataforma de Gestão ou a rede estiverem indisponíveis durante a sincronização, o sistema MUST preservar o catálogo e os pacotes já existentes em disco sem interromper o funcionamento do quiosque (RF-L02).
- **FR-010**: O projeto MUST disponibilizar um arquivo `.env.example` documentando as variáveis `API_G1` e `TOKEN_ESTACAO` e um utilitário de preparação/seed para registrar os 5 jogos locais do quiosque no banco local da Plataforma de Gestão durante testes integrados, sem modificar arquivos rastreados do repositório externo da API.

### Key Entities

- **ConfiguracaoEstacao**: Parâmetros operacionais externos do quiosque, compreendendo URL base da API central (`API_G1`) e credencial de autenticação da estação (`TOKEN_ESTACAO`).
- **ItemCatalogoLocal**: Registro de jogo disponível no quiosque contendo identificador (`id`), título (`nome`), autoria (`autores`), caminho local de inicialização (`caminho`), versão (`versao`) e hash de integridade (`sha256`).
- **PlacarSincronizavel**: Registro de partida concluída persistido em `data/fila/<id>.json` e transmitido à API central com `id_partida`, `jogo`, `jogador`, `pontos`, `feedback` (`nota`) e `jogado_em`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das partidas concluídas com a plataforma central online são registradas na plataforma em até 2 segundos após a confirmação do jogador e movidas para a pasta de enviados.
- **SC-002**: 100% das partidas concluídas com a plataforma central offline permanecem íntegras em disco e são sincronizadas sem duplicação na primeira rodada de reenvio após o restabelecimento da conexão.
- **SC-003**: Durante sincronizações consecutivas sem alteração de versão nos jogos aprovados, 0 pacotes zip redundantes são baixados novamente para jogos cujo hash de integridade já consta atualizado em disco.
- **SC-004**: Os 5 jogos do acervo do fliperama e os jogos aprovados na plataforma central executam no quiosque e têm seus placares aceitos sem erro de autenticação ou de jogo não encontrado no ambiente integrado local.

## Assumptions

- Para desenvolvimento e demonstração local, a API da Plataforma de Gestão (clonada em `/home/user/projetos/arcade-ifes/Portal-Web/api`) roda na porta `4000` com banco PostgreSQL local inicializado com o token de estação `dev-estacao`, evitando conflito com a porta `3000` do servidor do quiosque.
- O escopo desta entrega limita-se ao MVP de integração (configuração externa, envio autenticado de placares com tentativa imediata + fila periódica de 30s e sincronização de catálogo aprovado com fallback local); exclusão automática de pastas obsoletas e consumo de rotas de ranking ficam fora deste escopo.
- Todas as alterações de código versionadas pertencem exclusivamente ao diretório `fliperama-local/` deste repositório.

