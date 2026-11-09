# Data Model: Integração MVP do Fliperama Local com a API da Plataforma de Gestão

## 1. `ConfiguracaoG1` (`server/services/configService.ts`)

Representa a configuração externa de comunicação entre o quiosque local e a API da Plataforma de Gestão.

| Campo | Tipo | Origem / Default | Regra de Validação |
|---|---|---|---|
| `apiUrl` | `string` | `process.env.API_G1` (default `'http://localhost:4000'`) | URL base sem barra final (`/` removida). |
| `tokenEstacao` | `string` | `process.env.TOKEN_ESTACAO` (default `'dev-estacao'`) | String não vazia; enviada apenas pelo servidor Fastify no cabeçalho `Authorization: Bearer <tokenEstacao>`. |

---

## 2. `ItemCatalogoLocal` (`data/catalogo.json`)

Representa um jogo instalado e disponível para seleção no quiosque local. Gravado atomicamente via arquivo temporário e renomeação (`data/catalogo.json.tmp` -> `data/catalogo.json`).

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `string` | Sim | Identificador único do jogo (ex.: `'quiz-invaders'`, `'orbita-do-saber'`). |
| `nome` | `string` | Sim | Título exibido no painel do quiosque. |
| `autores` | `string` | Sim | Lista de autores formatada como texto para exibição no card. |
| `caminho` | `string` | Sim | URL local do ponto de entrada HTML servido pelo Fastify (`http://localhost:3000/arquivos-jogos/...`). |
| `versao` | `string` | Não | Versão do pacote quando sincronizado via API central (ex.: `'1.0.0'`). |
| `sha256` | `string` | Não | Hash SHA-256 em hexadecimal minúsculo do pacote `.zip` aprovado na API central, usado para evitar redownload redundante. |

---

## 3. `JogoRemotoAPI` (Resposta de `GET /api/jogos`)

Subconjunto dos campos retornados pela API da Plataforma de Gestão consumidos pelo sincronizador do fliperama.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string` | Identificador único do jogo na plataforma central. |
| `nome` | `string` | Título do jogo. |
| `autores` | `string[] \| string` | Autores do jogo (convertido para `string` separada por vírgula no catálogo local). |
| `versao` | `string` | Versão aprovada (ex.: `'1.0.0'`). |
| `sha256` | `string` | Hash SHA-256 hexadecimal do pacote zip aprovado. |
| `pacote_url` | `string` | URL de download do pacote `.zip` da versão aprovada. |

---

## 4. `PayloadPlacarG1` (Corpo de `POST /api/placares`)

Estrutura transmitida pelo servidor do fliperama para a API central a partir de um `ResultadoPartida` armazenado em `data/fila/<id>.json`.

| Campo | Tipo | Obrigatório | Regra / Mapeamento |
|---|---|---|---|
| `id_partida` | `string` (UUID) | Sim | `resultado.id` gerado no encerramento da partida (garante idempotência). |
| `jogo` | `string` | Sim | Identificador canônico do jogo (`IDS_ANTIGOS[jogoId] ?? jogoId`). |
| `jogo_id` | `string` | Sim | Mesmo valor de `jogo` (mantido para compatibilidade retroativa com testes locais). |
| `jogador` | `string` | Sim | `resultado.apelido.trim().toUpperCase().slice(0, 9)` (ou `'ANON'`). |
| `pontos` | `number` | Sim | `resultado.pontuacao` (inteiro não negativo). |
| `feedback` | `{ nota: number }` | Sim | `{ nota: resultado.avaliacao }` (inteiro de 1 a 5). |
| `nota` | `number` | Sim | `resultado.avaliacao` (mantido junto a `feedback.nota` por compatibilidade). |
| `jogado_em` | `string` (ISO 8601) | Opcional | `resultado.jogadoEm` quando presente. |

### Transição de Estado na Fila Local

```text
[Partida Finalizada no Quiosque]
       │
       ▼ (escrita atômica .tmp -> rename)
data/fila/<id_partida>.json
       │
       ├─► Tentativa imediata (assíncrona no POST /resultados)
       │     ou ciclo periódico (setInterval 30s)
       ▼
POST ${API_G1}/api/placares (Authorization: Bearer ${TOKEN_ESTACAO})
       │
       ├── HTTP 201 (nova) ou HTTP 200 (duplicada: true)
       │     └──► rename para data/enviadas/<id_partida>.json
       │
       └── Falha de rede / HTTP 4xx / HTTP 5xx
             └──► Permanece em data/fila/<id_partida>.json para próxima tentativa
```

