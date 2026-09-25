# Integração do Fliperama (G3) com a API de Gestão (G1)

> Resumo consolidado dos documentos de referência do G1.
> Fontes: `integracao.md`, `catalogo.md`, `placares.md`, `ranking.md` e `autenticacao.md`.

- Base da API: `https://plataforma-gestao-api.onrender.com/api`
- Swagger: <https://plataforma-gestao-api.onrender.com/docs>
- CORS: liberado para qualquer origem.
- Formato padrão de erro (todas as rotas):

  ```json
  { "codigo": "IDENTIFICADOR", "erro": "mensagem legível" }
  ```

## 1. Autenticação (token de estação)

O fliperama se autentica utilizando um token de estação (prefixo `est_…`), gerado uma única vez por um usuário curador.

| Detalhe | Valor |
| --- | --- |
| Prefixo | `est_` |
| Envio | Cabeçalho `Authorization: Bearer est_…` |
| Criação | `POST /api/estacoes` (requisição feita por curador usando token `cur_…`) |
| Armazenamento | Apenas o hash SHA-256 é persistido no banco; o token em texto puro é exibido uma única vez no momento da criação |
| Uso | Envio de placares via `POST /api/placares` |

### Criação da estação (feita pelo curador)

```http
POST /api/estacoes
Authorization: Bearer cur_...
Content-Type: application/json

{ "nome": "Fliperama do bloco A" }
```

Resposta `201`:

```json
{
  "id": "9b1e…",
  "nome": "Fliperama do bloco A",
  "token": "est_…",
  "criado_em": "2026-09-23T13:40:00.000Z"
}
```

> O token gerado deve ser salvo imediatamente, pois o valor original não pode ser recuperado depois.

### Erros de autenticação

| Status | Código | Motivo |
| --- | --- | --- |
| 401 | `NAO_AUTENTICADO` | Ausência de cabeçalho ou formato diferente de `Bearer <token>` |
| 401 | `TOKEN_INVALIDO` | Token não reconhecido ou de tipo incompatível |

### Desenvolvimento local

O comando `npm run db:seed` inicializa a base local com o curador `dev-curador` e a estação `dev-estacao`, utilizando esses mesmos identificadores como tokens no banco de desenvolvimento.

## 2. Endpoints consumidos pelo fliperama

### 2.1 Catálogo de jogos aprovados

```http
GET /api/jogos
```

Rota pública (sem necessidade de token) que retorna a relação dos jogos aprovados.

Resposta `200` (lista JSON):

```json
[
  {
    "id": "jogo-exemplo",
    "nome": "Quiz Invaders (exemplo)",
    "descricao": "…",
    "resumo": "…",
    "autores": ["G1 — Plataforma de Gestão"],
    "controles": "…",
    "classico_referencia": "Space Invaders",
    "mecanica": "tiro",
    "tema": "Matemática",
    "nivel": "ensino médio",
    "capa": "capa.png",
    "repositorio_url": "https://github.com/Arcade-IFES/jogo-exemplo",

    "versao": "1.0.0",
    "status": "aprovado",
    "versao_id": "44caf359-…",
    "tamanho_bytes": 8200,
    "sha256": "de6bba7d…",

    "capa_url": "https://…/api/versoes/44caf359-…/preview/capa.png",
    "preview_url": "https://…/api/versoes/44caf359-…/preview/index.html",
    "pacote_url": "https://…/api/jogos/jogo-exemplo/pacote?versao=1.0.0",

    "nota_media": 4.33,
    "votos": 3,
    "jogadores_distintos": 3,
    "partidas_jogadas": 6,
    "versoes": [{ "id": "…", "versao": "1.0.0", "estado": "aprovado", "…": "…" }]
  }
]
```

Campos utilizados pelo fliperama:

| Campo | Finalidade |
| --- | --- |
| `id` | Identificador do jogo, usado no envio de placares e na organização de arquivos em disco |
| `sha256` | Hash do pacote para comparação com o arquivo armazenado localmente |
| `pacote_url` | Endereço para download do pacote compactado (zip) do jogo |
| `nome` | Título para exibição na interface do painel |
| `capa_url` | Imagem da capa para apresentação no catálogo local |

### 2.2 Download do pacote

```http
GET /api/jogos/{id}/pacote              # versão aprovada atual
GET /api/jogos/{id}/pacote?versao=1.0.0 # versão específica
```

Retorna o arquivo zip contendo a estrutura do jogo na raiz (`index.html`, `game.json`, entre outros).

Cabeçalhos da resposta:

| Cabeçalho | Valor |
| --- | --- |
| `ETag` | `"<sha256>"` |
| `X-Sha256` | Hash sha256 do arquivo zip para validação de integridade pós-download |
| `X-Versao` | Número da versão fornecida |
| `Cache-Control` | `no-cache` quando a versão não for informada; `immutable` para versão específica |

Para evitar transferências redundantes, envie o cabeçalho `If-None-Match: "<sha256 local>"`. Se o pacote não tiver sido modificado, a API responde com status `304` sem corpo.

### 2.3 Envio de placar

```http
POST /api/placares
Authorization: Bearer est_...
Content-Type: application/json
```

Corpo da requisição:

```json
{
  "id_partida": "<UUID gerado pelo fliperama>",
  "jogo": "jogo-exemplo",
  "jogador": "ANA",
  "pontos": 1450,
  "duracao_s": 95,
  "acertos": 8,
  "erros": 2,
  "tema": "Matemática",
  "jogado_em": "2026-09-27T14:30:00-03:00",
  "feedback": { "nota": 5, "comentario": "..." }
}
```

Campos da carga útil:

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| `id_partida` | Recomendado | UUID gerado pelo fliperama para garantir idempotência em reenvios; se omitido, a API gera um identificador |
| `jogo` | Sim | Identificador do jogo (`id`), aceitando também o alias `jogo_id` |
| `jogador` | Não | Apelido com até 9 caracteres alfanuméricos (`A-Z`, `0-9`), convertido para maiúsculas; ausência gera `ANON`, sem inclusão no ranking |
| `pontos` | Sim | Valor numérico maior ou igual a zero (arredondado) |
| `duracao_s` | Não | Duração em segundos maior ou igual a zero; padrão: 0 |
| `acertos` | Não | Contagem de acertos maior ou igual a zero; padrão: 0 |
| `erros` | Não | Contagem de erros maior ou igual a zero; padrão: 0 |
| `tema` | Não | Tema temático associado; assume por padrão o tema cadastrado no jogo |
| `jogado_em` | Não | Data e hora em formato ISO 8601 com fuso horário; padrão: horário de recebimento pela API |
| `feedback` | Não | Objeto `{ "nota": 1-5, "comentario": "..." }`, aceitando também campos avulsos |

Respostas esperadas:

- `201`: nova partida registrada com sucesso.
- `200`: `id_partida` já processado anteriormente; nenhum dado duplicado é gravado e o retorno inclui `"duplicada": true`.

```json
{
  "ok": true,
  "duplicada": false,
  "partida": { "id_partida": "7d0f…", "jogo": "jogo-exemplo", "jogador": "ANA", "pontos": 1450, "…": "…" },
  "voto": { "nota": 5, "comentario": "Muito bom" }
}
```

Códigos de erro:

| Status | Código | Motivo |
| --- | --- | --- |
| 400 | `REQUISICAO_INVALIDA` | Dados incorretos (como apelido fora do padrão ou nota fora do intervalo de 1 a 5) |
| 401 | `NAO_AUTENTICADO` / `TOKEN_INVALIDO` | Ausência ou inconsistência no token de estação |
| 404 | `JOGO_NAO_ENCONTRADO` | O jogo informado não consta na base de dados |
| 409 | `PARTIDA_CONFLITANTE` | O `id_partida` já foi associado a um jogo diferente |

> A rota `POST /api/resultados` funciona como alias temporário e deve ser substituída por `/api/placares`.

### 2.4 Ranking de jogadores (por jogo)

```http
GET /api/ranking/jogadores?jogo=jogo-exemplo
GET /api/ranking/jogadores?jogo=jogo-exemplo&limite=10
```

Rota pública. O parâmetro `jogo` é obrigatório (gera erro `400` se omitido). Não há ranking geral entre jogos diferentes.

- Retorna apenas a melhor pontuação de cada apelido no jogo selecionado.
- Critério de desempate: o jogador que alcançou a pontuação primeiro ocupa a posição mais alta.
- Partidas registradas como `ANON` não entram no ranking.
- Parâmetro `limite`: aceita valores de 1 a 500, com valor padrão de 100.

Resposta `200` (lista JSON):

```json
[
  {
    "posicao": 1,
    "apelido": "CAIO42",
    "pontos": 1800,
    "jogo_id": "jogo-exemplo",
    "jogo": "Quiz Invaders (exemplo)",
    "acertos": 18,
    "erros": 1,
    "duracao_s": 110,
    "jogado_em": "2026-09-23T14:05:00.000Z",
    "partidas": 3
  }
]
```

### 2.5 Ranking de jogos

```http
GET /api/ranking/jogos
```

Rota pública com a listagem dos jogos aprovados classificados pela nota ajustada (média ponderada bayesiana):

```text
nota_ajustada = v/(v+m) · R + m/(v+m) · C
```

| Variável | Descrição |
| --- | --- |
| `v` | Quantidade de votos recebidos pelo jogo |
| `R` | Média das notas do próprio jogo |
| `m` | Peso mínimo de confiança igual a 5 (para a nota individual pesar mais que a média geral) |
| `C` | Média global de todos os votos entre todos os jogos (assume 3 para jogos sem avaliações) |

Resposta `200` (lista JSON):

```json
[
  {
    "posicao": 1,
    "jogo_id": "jogo-exemplo",
    "jogo": "Quiz Invaders (exemplo)",
    "nota": 4.8,
    "votos": 10,
    "partidas": 25,
    "jogadores_distintos": 12,
    "nota_ajustada": 4.7
  }
]
```

## 3. Fluxo de sincronização de jogos

```text
[Fliperama]                             [API G1]
    │                                      │
    ├── GET /api/jogos ──────────────────▶ │
    │◀──────── 200 (lista com sha256) ─────┤
    │                                      │
    │  Para cada jogo:                     │
    │  ┌─ sha256 == disco?                 │
    │  │   SIM → pular                     │
    │  │   NÃO ↓                           │
    │  ├── GET /api/jogos/{id}/pacote ───▶ │
    │  │   (If-None-Match: "<sha256>")     │
    │  │◀──── 304 (sem corpo) ─────────────┤  ← nada mudou
    │  │◀──── 200 (zip + X-Sha256) ────────┤  ← baixar
    │  │                                   │
    │  ├─ Conferir sha256 do arquivo       │
    │  │   OK  → extrair e atualizar disco │
    │  │   FAIL → descartar / retry        │
    │  └───────────────────────────────────┘
    │                                      │
    │  Jogos no disco mas fora do catálogo │
    │  → podem ser removidos              │
    └──────────────────────────────────────┘
```

### Etapas da sincronização

1. Consulta de catálogo: requisição `GET /api/jogos` para obter a relação de jogos aprovados com os respectivos hashes `sha256` e URLs de pacote (`pacote_url`).
2. Comparação de integridade: conferência de cada item para verificar se o hash `sha256` difere da versão em disco local.
3. Download condicional: se houver diferença, disparo de `GET` para o `pacote_url`. O cabeçalho `If-None-Match: "<sha256 local>"` poupa banda retornando resposta `304` sem corpo caso o arquivo permaneça o mesmo.
4. Validação de integridade: checagem do hash sha256 do zip recebido contra o cabeçalho `X-Sha256`. Se houver divergência, o pacote é descartado para nova tentativa.
5. Descompactação: extração do zip na pasta do jogo preservando os arquivos na raiz (`index.html`, `game.json`, etc.).
6. Limpeza de obsoletos: exclusão local dos jogos que não constam mais na resposta do catálogo remoto.

## 4. Fluxo de envio de placar

```text
[Jogo (G4)]              [Fliperama (G3)]              [API (G1)]
    │                          │                            │
    │  postMessage PLACAR ───▶ │                            │
    │  (tipo, jogo, versao,    │                            │
    │   jogador, pontos,       │                            │
    │   duracao_s, acertos,    │                            │
    │   erros, tema)           │                            │
    │                          │                            │
    │                          ├─ Pedir nota (1-5)          │
    │                          │  ao jogador                │
    │                          │                            │
    │                          ├─ Gerar id_partida (UUID)   │
    │                          │                            │
    │                          ├── POST /api/placares ─────▶│
    │                          │   Authorization: Bearer    │
    │                          │   est_…                    │
    │                          │◀──── 201 / 200 ────────────│
    │                          │                            │
    │                          │  Se falhar na rede:        │
    │                          │  reenviar com mesmo        │
    │                          │  id_partida (idempotente)  │
    │                          │                            │
```

### Sequência de eventos

1. O jogo notifica o encerramento da partida disparando `postMessage` para a janela mãe (`window.parent`):

   ```js
   window.parent.postMessage({
     tipo: 'PLACAR',
     jogo: 'jogo-exemplo',
     versao: '1.1.0',
     jogador: 'ANA',
     pontos: 1450,
     duracao_s: 95,
     acertos: 8,
     erros: 2,
     tema: 'Matemática',
   }, '*')
   ```

2. A plataforma local escuta o evento via `window.addEventListener('message', …)`.
3. A interface do fliperama solicita a avaliação da partida ao jogador (nota opcional de 1 a 5).
4. O fliperama gera um identificador único UUID (`id_partida`) e compõe o corpo da requisição para `POST /api/placares`, incluindo o bloco `feedback`.
5. A requisição `POST /api/placares` é transmitida com o cabeçalho `Authorization: Bearer est_…`.
6. Em caso de instabilidade na conexão, o envio pode ser repetido com o mesmo corpo e o mesmo `id_partida`. A API reconhece a chave existente e retorna status `200` com `"duplicada": true`, evitando múltiplos registros.

### Regras de votação

- O sistema aceita um voto por par (jogo, apelido). Caso o mesmo jogador registre uma nova nota, o valor mais recente sobrescreve o anterior.
- Partidas anônimas (`ANON`) podem votar normalmente; as avaliações anônimas não se substituem entre si.
