# Contract: Integração Fliperama Local (G3) ↔ API da Plataforma de Gestão (G1)

## 1. Consulta de Catálogo Aprovado

- **Endpoint**: `GET {API_G1}/api/jogos`
- **Autenticação**: Pública (sem cabeçalho `Authorization`)
- **Resposta Esperada (`200 OK`)**:
  ```json
  [
    {
      "id": "quiz-invaders",
      "nome": "Quiz Invaders",
      "autores": ["Equipe Exemplo"],
      "versao": "1.0.0",
      "status": "aprovado",
      "sha256": "<64-hex-chars>",
      "pacote_url": "http://localhost:4000/api/jogos/quiz-invaders/pacote?versao=1.0.0"
    }
  ]
  ```

## 2. Download de Pacote de Jogo

- **Endpoint**: `GET {pacote_url}` (ou `GET {API_G1}/api/jogos/{id}/pacote`)
- **Autenticação**: Pública
- **Cabeçalhos de Resposta Relevantes**:
  - `Content-Type: application/zip`
  - `X-Sha256: <64-hex-chars>`
  - `ETag: "<64-hex-chars>"`
- **Validação no Fliperama**:
  - Calcular `sha256` do `Buffer` recebido.
  - Comparar com o `sha256` informado no catálogo (e/ou `X-Sha256`).
  - Se divergir, descartar pacote e lançar erro sem sobrescrever arquivos extraídos.
  - Se coincidir, extrair em `./data/jogos/{id}/` e executar `adaptarArquivoDoJogo('./data/jogos/{id}/index.html', id)`.

## 3. Envio de Placar e Avaliação

- **Endpoint**: `POST {API_G1}/api/placares`
- **Cabeçalhos de Requisição**:
  ```http
  Authorization: Bearer {TOKEN_ESTACAO}
  Content-Type: application/json
  ```
- **Corpo da Requisição**:
  ```json
  {
    "id_partida": "550e8400-e29b-41d4-a716-446655440000",
    "jogo": "corrida-contra-o-sino",
    "jogo_id": "corrida-contra-o-sino",
    "jogador": "JOGADOR",
    "pontos": 150,
    "feedback": {
      "nota": 5
    },
    "nota": 5,
    "jogado_em": "2026-11-09T01:00:00.000Z"
  }
  ```
- **Respostas Tratadas como Sucesso (`resposta.ok === true`)**:
  - `201 Created`: Partida inédita registrada (`{ "ok": true, "duplicada": false, ... }`).
  - `200 OK`: `id_partida` já registrado anteriormente (`{ "ok": true, "duplicada": true, ... }`).
- **Respostas de Falha (`resposta.ok === false` ou erro de rede)**:
  - `401 Unauthorized` (`NAO_AUTENTICADO` / `TOKEN_INVALIDO`): Token ausente ou inválido.
  - `404 Not Found` (`JOGO_NAO_ENCONTRADO`): Jogo ainda não registrado no banco da API.
  - Falha de conexão / `5xx`: API indisponível; arquivo permanece em `data/fila/<id_partida>.json`.

