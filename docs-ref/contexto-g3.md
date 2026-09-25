# Contexto do G3: Fliperama Local

> Resumo extraído da documentação do curso em `docs-fonte/docs/`.
> Última atualização: 24/09/2026.

## 1. O que é o G3

O G3 (Fliperama Local) é um dos quatro grupos do trabalho Recreio Arcade, projeto de extensão da turma. O grupo desenvolve e mantém a plataforma local que roda na máquina do pátio: sincroniza jogos com a plataforma de gestão online, apresenta o painel de seleção, executa cada jogo, registra placar e voto, e opera de forma autônoma, sem necessidade de operador ou conexão contínua com a internet.

## 2. Requisitos funcionais do G3 (RF-L01 a RF-L26)

Todos os requisitos abaixo são de responsabilidade do G3.

| ID | Requisito | Resumo |
| --- | --- | --- |
| RF-L01 | Sincronizar com a gestão | Baixar todos os pacotes aprovados e guardá-los descompactados em cache local no disco |
| RF-L02 | Operar offline | Jogos já baixados continuam jogáveis sem internet |
| RF-L03 | Painel de seleção | Nome, autores, controles e capa, com busca ou filtro |
| RF-L04 | Identificação do jogador | Apelido de até 9 caracteres (`A-Z`, `0-9`), digitado ou montado com setas; Enter confirma; vazio gera `ANON` |
| RF-L05 | Execução do jogo | Execução a partir do cache local, em tela cheia e com saída visível |
| RF-L06 | Captura de placar | Integração pelo protocolo `postMessage` (`PLACAR`) |
| RF-L07 | Voto ao fim da partida | Nota de 1 a 5 e comentário opcional, puláveis com uma única tecla |
| RF-L08 | Fila de reenvio | Persistir em disco e reenviar com espera crescente sem duplicar dados, usando `id_partida` para idempotência |
| RF-L09 | Retorno automático à atração | Tempo limite sem interação retorna ao painel e depois à tela de atração |
| RF-L10 | Encerramento limpo do jogo | Remoção do iframe e liberação de memória após cada partida |
| RF-L11 | 100% teclado | Navegação por setas e Enter, com foco visual sempre ativo e sem dependência de mouse |
| RF-L12 | Kiosk restrito | Bloqueio de atalhos para fechar abas, sair de tela cheia ou exibir o sistema operacional |
| RF-L13 | Mapa de teclas e remapeamento | Mapa visual na tela de atração e suporte a remapeamento caso alguma tecla falhe |
| RF-L14 | Resolução mínima | Resolução a partir de 1024×768 em proporção 4:3 com alto contraste |
| RF-L15 | Persistência em disco (JSON) | Armazenamento de pacotes, fila de placares, histórico e logs com escrita atômica (arquivo temporário e renomeação) |
| RF-L16 | Dados somente-leitura para o jogo | Fornecimento de apelido e recordes do jogo ativo por meio do SDK |
| RF-L17 | Histórico de partidas em disco | Cálculo do ranking local combinando `partidas.jsonl` com o ranking oficial da última sincronização |
| RF-L18 | Ranking offline | Exibição do ranking mesmo sem rede, indicando se os dados são oficiais ou locais |
| RF-L19 | Boot automático | Inicialização direta na tela de atração ao ligar o computador na tomada, sem intervenção manual |
| RF-L20 | Arquivo de configuração | Definição da URL do portal, token da estação e intervalo de sincronização fora do código e do navegador |
| RF-L21 | Tela de diagnóstico | Combinação reservada de teclas para exibir conectividade, última sincronização, fila e uso de disco |
| RF-L22 | Timeout de jogo | Encerramento automático de jogos que não carregam em 15 segundos ou partidas que excedem 5 minutos, com log do motivo |
| RF-L23 | Mudo global | Alternância de áudio por tecla única, retendo o estado entre partidas |
| RF-L24 | Erros em linguagem de jogador | Mensagens de erro amigáveis, sem detalhes técnicos na interface |
| RF-L25 | Exportar relatório da sessão | Exportação de dados em JSON e CSV para alimentar `docs/campo.md` |
| RF-L26 | Barrar apelido ofensivo | Filtragem baseada em lista de bloqueio presente no arquivo de configuração |

### Requisitos compartilhados com outros grupos

| ID | Requisito | Parceria |
| --- | --- | --- |
| RF-L06 | Captura de placar pelo contrato de mensagens | G3 + G4 (SDK) |
| RF-L08 | Fila de reenvio com idempotência no servidor | G3 + G1 |
| RE-04 | Fluxo clicável de ponta a ponta no protótipo (E1) | G3 + G2 |
| RE-10 | Fliperama sincronizando, executando e devolvendo placar (E2) | G3 |
| RE-13 | Teste de queda de rede com reenvio sem duplicação (E2) | G3 + G1 |
| RE-16 | Voto do jogador e ranking de jogos (E3) | G3 + G1 + G2 |
| RE-17 | Modo kiosk restrito e operação sem operador (E3) | G3 |

## 3. Requisitos não funcionais do G3 (RNF-L01 a RNF-L10)

| ID | Requisito | Meta |
| --- | --- | --- |
| RNF-L01 | Desempenho de tela | Resposta a teclas em até 150 ms; painel carregado em até 2 s |
| RNF-L02 | Desempenho de carga | Intervalo entre o Enter e a primeira tela do jogo em até 5 s |
| RNF-L03 | Memória | Processo local em até 150 MB; consumo total com Chromium e jogo em até 1,5 GB |
| RNF-L04 | Integridade | Desligamento direto da tomada não corrompe arquivos nem perde partidas salvas |
| RNF-L05 | Disponibilidade | Operação autônoma por ao menos 60 minutos; reinício automático do navegador em falhas |
| RNF-L06 | Segurança | Atributo `sandbox` sem `allow-same-origin`, validação de origem no `postMessage` e token fora do navegador |
| RNF-L07 | Usabilidade de pátio | Interface legível a 2 metros de distância; comandos por setas e Enter; apelido como única digitação |
| RNF-L08 | Observabilidade | Log em `jsonl` registrando início, fim, abandono, sincronização e falhas de envio |
| RNF-L09 | Instalação | Processo executado via comando único documentado em instalação limpa de Linux |
| RNF-L10 | Privacidade | Coleta restrita ao apelido, sem armazenar nome completo, matrícula ou endereço IP |

## 4. Restrições da máquina de destino

| Item | Valor |
| --- | --- |
| Sistema operacional | Linux |
| Memória | 4 GB de RAM no total (distribuídos entre sistema, navegador, plataforma e jogo) |
| Disco | 200 GB de disco rígido |
| Entrada | Teclado comum de PC, sem mouse e sem botões adicionais |
| Vídeo | Tela com resolução a partir de 1024×768, proporção 4:3, legível sob iluminação externa |
| Execução | Navegador web (Chromium ou Firefox), sem uso de plugins |

### Orçamento de memória estimado

| Item | Consumo |
| --- | --- |
| Linux e interface gráfica enxuta | ~700 MB |
| Chromium em modo kiosk | ~400 MB |
| Processo Node da plataforma local | ~100 MB |
| Aba do jogo (teto definido em RJ-03) | 400 MB |
| Folga disponível | ~2 GB |

> O uso de Electron deve ser evitado porque inicializa uma instância adicional do Chromium e compromete a memória disponível. A alternativa recomendada é Node com Fastify para servir a interface, executando o Chromium do sistema com a opção `--kiosk`.

## 5. Arquitetura interna do G3

### Módulos

| Módulo | Responsabilidade |
| --- | --- |
| Sincronizador | Compara o catálogo remoto com o local, realiza o download, valida o hash `sha256` e descompacta os pacotes |
| Armazém em disco | Guarda pacotes descompactados, versões anteriores, fila de envio e arquivos de log (RF-L15) |
| Índice local | Mantém os arquivos JSON locais: catálogo, partidas, ranking oficial, fila e mapeamento de teclas |
| Runner | Abre o jogo em `<iframe sandbox>`, fornece os arquivos do disco e encerra o processo ao sair |
| Sessão | Gerencia a máquina de estados: ATRAÇÃO, APELIDO, PAINEL, EM_JOGO e FIM |
| Captura de placar | Escuta o evento `postMessage`, valida a origem da mensagem e registra a partida com `id_partida` |
| Fila de envio | Grava pendências em disco, tenta o envio com espera progressiva (5 s, 15 s, 1 min, 5 min) e marca registros concluídos |
| Teclado | Normaliza entradas, descarta repetição automática de teclas e aplica remapeamentos configurados |
| Supervisor kiosk | Bloqueia comandos de saída, reinicia o navegador em falhas e retorna à tela de atração por inatividade |
| Log de sessão | Grava eventos em formato `jsonl` para o relatório da entrega E3 |

### Máquina de estados da sessão

```text
[*] → ATRAÇÃO → APELIDO → PAINEL → EM_JOGO → FIM → PAINEL
                                                  ↘ ATRAÇÃO (20 s)
                            PAINEL → ATRAÇÃO (60 s sem tecla)
```

### Layout em disco

```text
/var/lib/recreio-arcade/
├── jogos/<jogo-id>/<versao>/       # pacote descompactado
├── catalogo.json                   # jogos disponíveis, versão e sha256
├── partidas.jsonl                  # uma partida por linha, append-only
├── ranking-oficial.json            # cópia do ranking do portal + data
├── teclas.json                     # mapeamento de teclas
├── fila/<id_partida>.json          # pendência por arquivo
├── enviadas/<id_partida>.json      # pendência confirmada
└── logs/sessao-AAAA-MM-DD.jsonl    # eventos do campo
```

### Gravação em disco e integridade de dados

1. Gravação com arquivo temporário e renomeação atômica para arquivos de estado. O `catalogo.json`, por exemplo, nunca é sobrescrito de forma direta.
2. Armazenamento incremental em `partidas.jsonl`. Quedas de energia afetam, no máximo, a linha que estiver sendo escrita.
3. Arquivo individual por partida na fila de reenvio. A criação do arquivo é atômica, e a confirmação consiste em movê-lo para o diretório `enviadas/`.

## 6. Contrato de mensagens entre fliperama e jogo

A comunicação entre a plataforma e o jogo ocorre por meio de três mensagens:

| Mensagem | Direção | Momento |
| --- | --- | --- |
| `ARCADE_INIT` | Fliperama → Jogo | Na inicialização da partida (apelido, estado do mudo e melhores pontuações) |
| `ARCADE_MUDO` | Fliperama → Jogo | Em alterações no estado do áudio global |
| `PLACAR` | Jogo → Fliperama | Ao encerrar a partida (pontos, tempo, acertos, erros e tema) |

Validação de mensagens: o fliperama processa a mensagem apenas se `event.source === iframe.contentWindow` e `event.data.jogo` corresponder ao jogo em execução.

Antes de encaminhar a pontuação ao servidor via `POST /api/placares`, a plataforma local adiciona os campos `jogador`, `id_partida` (UUID) e `jogado_em`, autenticando a requisição com o token da estação.

## 7. Telas do G3 (protótipo e implementação)

| Tela | Elementos e comportamentos esperados | Requisitos |
| --- | --- | --- |
| Atração (em espera) | Mensagem de boas-vindas para o público e chamada para pressionar uma tecla | RF-L09 |
| Identificação | Campo para inserção de apelido de até 9 caracteres e informativo sobre o ranking público | RF-L04 |
| Painel de seleção | Grade de jogos exibindo capa, autoria, tema, nível e controles, com navegação por setas | RF-L03, RF-L11 |
| Em jogo | Exibição do jogo em tela cheia com instrução visível para sair | RF-L05 |
| Fim de partida | Pontuação obtida, posição no ranking, votação de 1 a 5, comentário opcional e botão para pular | RF-L06, RF-L07 |
| Sincronização | Painel com relação de jogos armazenados, estado da conexão e pendências da fila | RF-L01, RF-L02, RF-L08 |
| Mapa de teclas | Representação gráfica do teclado indicando as teclas ativas e função para remapeamento | RF-L13 |

## 8. Cronograma e datas relevantes para o G3

### Entregas do trabalho (mensais)

| Entrega | Data | Escopo entregue pelo G3 | IDs |
| --- | --- | --- | --- |
| E1 | Seg, 31/08/2026 | Protótipo navegável das 7 telas no Figma Maker, fluxo clicável e demonstração de iframe com captura de `postMessage` | RE-03, RE-04, RE-05 |
| E2 | Seg, 28/09/2026 | Sincronização de jogos, execução local e retorno de placares (RF-L01 a RF-L08), com teste de falha de conexão | RE-10, RE-13 |
| E3 | Seg, 26/10/2026 | Ambiente kiosk restrito (RF-L09, RF-L11 a RF-L15), coleta de votos (RF-L07) e realização do teste de campo | RE-16, RE-17 |
| E4 | Seg, 30/11/2026 | Implementação de três ajustes decorrentes do teste de campo, encerramento de pendências e documentação final | RE-20 a RE-22 |

### Checkpoints práticos (entrevista individual)

| CP | Data | Conteúdo avaliado | Exemplos de tarefas |
| --- | --- | --- | --- |
| CP1 | Seg, 31/08 | Discovery (Aulas 01 a 04) | Justificar o público-alvo com base no PRD |
| CP2 | Seg, 28/09 | Definição e planejamento (Aulas 06 e 07) | Posicionar funcionalidade na DSM e dividi-la em histórias |
| CP3 | Seg, 26/10 | Especificação e contexto de agentes (Aulas 09 e 10) | Implementar atributo de ponta a ponta, corrigir falha ou rodar Spec-Kit |
| CP4 | Seg, 30/11 | Comunicação enxuta, épicos e agentes (Aulas 12 a 14) | Escrever cenários em Gherkin para regra existente e derivar especificação a partir de épico |

### Teste de campo no pátio

- Período: entre terça-feira (06/10) e sexta-feira (16/10/2026), com preferência para a semana de 13 a 16 de outubro.
- Participação mínima: 10 jogadores externos e 15 partidas concluídas.
- Duração: no mínimo 60 minutos ininterruptos de operação.
- Registro: relatório estruturado em `docs/campo.md` entregue no mesmo dia.

### Feriados e datas sem aula

| Data | Motivo |
| --- | --- |
| Seg, 07/09 | Independência do Brasil |
| Seg, 12/10 | Nossa Senhora Aparecida |
| Seg, 02/11 | Finados |

### Prazos finais

| Data | Marco |
| --- | --- |
| Ter, 08/12/2026 | Data limite para entrega ou reenvio de pendências |
| Seg, 14/12/2026 | Prova final para quem não alcançar 60 pontos |

## 9. Escopo de construção do G3 por entrega

| Fase | E2 (até 28/09) | E3 (até 26/10) | Opcionais |
| --- | --- | --- | --- |
| G3 | Sincronização, cache em disco, painel de seleção, execução do jogo, captura e envio de placar, e fila de reenvio | Votação ao término da partida, proteção de kiosk, mapa de teclas, retorno por inatividade e registro de log da sessão | Modo torneio ou placar da sessão, e script de instalação empacotado |

## 10. Critérios de avaliação

### Nota geral (100 pontos)

| Componente | Valor | Natureza |
| --- | --- | --- |
| Código próprio | 25 pts | Individual |
| Minicurso no YouTube | 25 pts | Individual |
| Trabalho em grupo | 50 pts | Coletiva |
| Observabilidade (opcional) | +10 pts | Coletiva |
| Entrevista | Multiplicador de 0 ou 1 que valida ou anula a nota do grupo | Individual |

Fórmula de cálculo: `NF = min(100, COD + CUR + (GRP + EXT) × ENT)`

### Composição do trabalho em grupo (50 pontos)

| Item | Pontos |
| --- | --- |
| Produto entregue | 10 |
| Disponibilidade em produção com URL pública | 10 |
| Qualidade da documentação | 10 |
| Qualidade do código | 10 |
| Apresentações (4 mensais) | 10 |

> A não entrega do produto anula os 50 pontos da nota de grupo para todos os participantes.
> A reprovação em qualquer checkpoint individual zera o fator da entrevista (ENT = 0), desconsiderando a nota do grupo para o estudante.

### Critérios de aceitação gerais (E2 e E3)

| Critério | Descrição |
| --- | --- |
| Fluxo de ponta a ponta | Processo contínuo desde envio, aprovação e download até execução e registro do placar no ranking, sem intervenções manuais |
| Disponibilidade | Plataforma de gestão acessível por URL pública estável |
| Validação de campo | Participação de público externo atingindo as metas mínimas de partidas e avaliações |
| Consistência de ranking | Jogos com apenas uma avaliação não devem distorcer a liderança; métricas e contagens visíveis |
| Conformidade de contratos | Definições de pacotes, rotas de API, mensagens de placar e retorno rigorosamente alinhadas com o código |
| Tratamento de exceções | Rejeição de pacotes inválidos, exclusão de jogos reprovados, prevenção de duplicatas na fila e tolerância a quedas de rede sem perda de dados |
| Ambiente de execução | Funcionamento em Linux com navegador, respeitando limites de memória, navegação por teclado e resolução mínima de 1024×768 |
| Integração entre módulos | Comunicação regular e estável entre os quatro módulos do sistema |
| Domínio técnico | Capacidade de cada participante explicar sua parte no código e sua integração com o sistema geral |

### Cenários de validação do G3

| Teste | Condição de aprovação |
| --- | --- |
| Sincronização: excluir jogo do disco e acionar sincronização | O pacote é recuperado com verificação de hash `sha256` e reaparece no painel sem necessidade de reiniciar |
| Operação offline: desconectar o cabo de rede | Painel, partidas, votação e ranking local continuam funcionais, indicando o estado offline na interface |
| Perda de conexão durante partida | O placar é armazenado na fila local e transmitido sem duplicação assim que a rede for restabelecida |
| Queda de energia: corte repentino de alimentação | Ao reiniciar, o sistema sobe direto na tela de atração sem perder nenhuma partida registrada |
| Reenvio em duplicidade: reenviar a fila duas vezes | O ranking no servidor permanece inalterado na segunda tentativa |
| Falha de tecla: desativar a seta direcional esquerda | O remapeamento configurado assume a função e persiste após reiniciar o sistema |
| Tentativas de escape do modo kiosk (Ctrl+W, Alt+F4, F11, Alt+Tab) | O jogador permanece restrito à interface do fliperama, sem acesso à área de trabalho |
| Jogo corrompido: iniciar jogo que não responde | A sessão é encerrada em até 15 segundos com retorno ao painel e registro do motivo em log |
| Abandono: usuário deixa o jogo durante a partida | A desistência é registrada sem enviar pontuação ao ranking, e a tela retorna ao painel inicial |
| Inatividade no painel de seleção | Após 60 segundos sem comandos no teclado, a interface volta à tela de atração e limpa o apelido |
| Consumo de memória: executar três partidas sucessivas | O uso de memória retorna aos níveis de referência após o término de cada partida |
| Instalação em máquina limpa | O fliperama inicializa com sucesso em outra máquina Linux executando apenas o comando documentado no README |

## 11. Diretrizes do Recreio Arcade aplicadas ao G3

### Diretrizes de integração

- Decisões sobre contratos são tratadas coletivamente em plenária. O G3 não altera unilateralmente as interfaces compartilhadas.
- Qualquer proposta de mudança em contratos deve ser comunicada aos outros três grupos antes de ser enviada ao repositório.
- Enquanto os serviços externos estiverem em desenvolvimento, o G3 utiliza dados simulados estruturados segundo a especificação combinada.
- O checkpoint de integração da aula de 01/09 reserva trinta minutos para validar a ligação entre os quatro módulos.
- Os testes no pátio envolvem a presença conjunta de todos os grupos da turma.

### Autoridade de dados e persistência

- A plataforma local coleta e encaminha dados. Caso haja divergência com o servidor central, prevalecem as informações do servidor.
- O ranking armazenado em disco atende à operação offline e não pode ser apresentado como listagem oficial (RF-L18).
- A operação do fliperama local depende unicamente do fornecimento de energia elétrica na tomada.

### Limites de escopo do G3

- Escopo direto do G3: ciclo de vida da sessão, tratamento de entrada por teclado, cache local, execução isolada dos jogos, fila de retransmissão e restrição de ambiente kiosk.
- Fora do escopo do G3: fluxo de aprovação de jogos, autoridade sobre o ranking oficial e armazenamento de dados pessoais além do apelido.

### Sugestão de arquitetura técnica

| Camada | Tecnologia sugerida |
| --- | --- |
| Servidor local | Node com Fastify servindo a interface |
| Renderização | Chromium em modo kiosk com atalhos de sistema desativados |
| Cache | Diretório local em disco com arquivos JSON (`catalogo.json`, `partidas.jsonl`) |
| Testes | Vitest |
| Organização | Monorepo com pnpm workspaces compartilhando `contratos/` |

### Política de reenvio de entregas

- Reenvios ilimitados são aceitos dentro do período da própria entrega, sem desconto de nota.
- As entrevistas individuais dos checkpoints não são passíveis de reenvio.
- Data limite final: terça-feira, 08/12/2026.

### Pontos extras: observabilidade (até 10 pontos)

| Recurso | Pontuação |
| --- | --- |
| Endpoint de integridade (health check) | 3 |
| Log estruturado de erros | 3 |
| Rotina de verificação externa agendada | 4 |

> O G3 pode disponibilizar health check e logs na plataforma local para contribuir com a pontuação extra coletiva.

## 12. Apresentações e demonstrações do G3

### E1 (31/08)

- Navegação pelo protótipo cobrindo atração, identificação, seleção, partida, placar e votação.
- Demonstração funcional de página carregando jogo em `<iframe sandbox>` e capturando a mensagem `postMessage` com o placar.

### E2 (28/09)

- Demonstração de sincronização da plataforma local com exibição imediata do novo jogo no painel.
- Partida curta com atualização correspondente no ranking.
- Partida com a rede desconectada comprovando o enfileiramento local e o envio do placar quando a conexão é restabelecida.

### E3 (26/10)

- Demonstração do modo kiosk bloqueando tentativas de saída pelo teclado.
- Apresentação dos dados levantados no pátio (total de partidas, jogadores participantes e taxa de conclusão).

### E4 (30/11)

- Demonstração dos três ajustes implementados com base no retorno do teste de campo.
- Resolução e validação de pendências técnicas pendentes.
- Comparação dos dados de campo caso uma segunda rodada de testes tenha sido conduzida no pátio.
