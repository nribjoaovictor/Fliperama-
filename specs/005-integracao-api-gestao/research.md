# Research: Integração MVP do Fliperama Local com a API da Plataforma de Gestão

## 1. Resolução de Configuração Externa (`API_G1` e `TOKEN_ESTACAO`)

- **Decision**: Ler `process.env.API_G1` (default `'http://localhost:4000'`) e `process.env.TOKEN_ESTACAO` (default `'dev-estacao'`) dinamicamente por função (`obterConfiguracaoG1()`) em vez de constantes estáticas avaliadas apenas no import, habilitando `--env-file-if-exists=.env` nos scripts do `package.json`.
- **Rationale**:
  - No Node.js 24 LTS, a flag nativa `--env-file-if-exists=.env` carrega variáveis de ambiente sem exigir o pacote `dotenv`.
  - Ler `process.env` por função a cada chamada permite que os testes automatizados (`node --test`) alterem `process.env.API_G1` e `process.env.TOKEN_ESTACAO` em tempo de execução sem precisar recarregar módulos ES.
  - O default `http://localhost:4000` evita colisão com a porta `3000` usada pelo próprio servidor Fastify do fliperama, e `dev-estacao` coincide com a credencial criada por `npm run db:seed` em `Portal-Web/api`.
- **Alternatives considered**:
  - Instalar `dotenv`: descartado por ser desnecessário no Node 24 (`--env-file-if-exists=.env`).
  - Constante `const API_G1 = ...` no topo do módulo: descartado porque impede testes de apontarem para servidores HTTP locais efêmeros em portas dinâmicas.

## 2. Contrato de Envio de Placares (`POST /api/placares`) e Compatibilidade com Testes Existentes

- **Decision**: Enviar cabeçalho `Authorization: Bearer <TOKEN_ESTACAO>` em `enviarResultadoParaG1()` e formatar o corpo em `formatarPlacar()` contendo `id_partida`, `jogo`, `jogo_id`, `jogador`, `pontos`, `feedback: { nota }`, `nota` e `jogado_em`.
- **Rationale**:
  - Na API oficial (`Portal-Web/api/src/placares/registrar.ts`), o schema Zod `placarSchema` aceita tanto `jogo` quanto `jogo_id`, e tanto `feedback: { nota }` quanto `nota` avulsa (`placar.feedback ?? (placar.nota ? { nota: placar.nota } : undefined)`), sem rejeitar a presença simultânea de ambos.
  - Enviar `jogo` e `feedback: { nota }` atende rigorosamente à especificação oficial (`docs-ref/integracao-api.md`), enquanto manter `jogo_id` e `nota` preserva compatibilidade retroativa.
  - Na rota `POST /resultados` (`server/routes/resultados.ts`), o disparo imediato de `reenviarPendentes()` será habilitado via opção de registro (`{ reenviarImediato: true }` passada pelo `server.ts`), garantindo que em execução real o placar seja enviado imediatamente em background sem quebrar os testes unitários existentes (`tests/anonimo.test.ts`) que inspecionam `data/fila/` logo após `fastify.inject`.
- **Alternatives considered**:
  - Disparar `reenviarPendentes()` incondicionalmente dentro de `registrarRotaResultados` mesmo em testes unitários: descartado porque causaria condição de corrida em `tests/anonimo.test.ts` quando uma API local estivesse rodando na porta `4000`.

## 3. Sincronização de Catálogo (`GET /api/jogos` + Download de Pacote + Fallback Local)

- **Decision**: Em `sincronizarJogos()`, consultar primeiro `GET ${API_G1}/api/jogos`; para cada jogo aprovado retornado:
  1. Verificar no `data/catalogo.json` atual se já existe entrada com mesmo `id` e `sha256` e se o arquivo `index.html` existe em `data/jogos/<id>/index.html`. Se sim, reutilizar sem novo download.
  2. Caso contrário, baixar o `.zip` de `pacote_url` (ou `${API_G1}/api/jogos/${id}/pacote`), calcular `sha256` com `node:crypto`, comparar com o `sha256` informado pela API (e cabeçalho `X-Sha256` quando presente), extrair em `data/jogos/<id>/`, aplicar `adaptarArquivoDoJogo()` em `data/jogos/<id>/index.html` e registrar no catálogo com `caminho: http://localhost:3000/arquivos-jogos/${id}/index.html`.
  3. Em seguida, processar os jogos da lista de fallback `JOGOS` que não vieram da API (mantendo o comportamento offline se a API ou o GitHub estiverem indisponíveis).
- **Rationale**:
  - Os pacotes gerados pela API oficial (`Portal-Web/api/src/pacotes/validador.ts` e `scripts/seed.ts`) sempre têm `index.html`, `game.json` e `questoes.json` na raiz do zip, portanto devem ser extraídos em `data/jogos/<id>/` (enquanto os zips de branch do GitHub já contêm a pasta `<repo>-main/`).
  - Aplicar `adaptarArquivoDoJogo()` ao `index.html` extraído em `data/jogos/<id>/index.html` garante que jogos da API que usam `fetch('questoes.json')` (como `quiz-invaders` ou jogos submetidos pelos grupos) funcionem dentro de `<iframe sandbox="allow-scripts">` sem erro de CORS.
- **Alternatives considered**:
  - Substituir totalmente a lista `JOGOS` pela resposta da API: descartado no MVP porque o seed padrão da API traz apenas `quiz-invaders` aprovado, o que removeria os 5 jogos da turma caso ainda não tivessem sido submetidos via GitHub tag.

## 4. Cadastro dos 5 Jogos do Fliperama no Banco Local da API (`Portal-Web/api`)

- **Decision**: Criar o script `fliperama-local/scripts/seed-jogos-api-local.ts` (acionável via `npm run seed:api-local`) que garante os 5 jogos de `JOGOS` (`orbita-do-saber`, `logica-em-dungeon`, `corrida-contra-o-sino`, `estrelas-da-ciencia`, `encaixe-cientifico`) cadastrados no banco PostgreSQL local da `Portal-Web/api` sem alterar nenhum arquivo do repositório `/home/user/projetos/arcade-ifes/Portal-Web`.
- **Rationale**:
  - `POST /api/placares` em `Portal-Web/api/src/placares/registrar.ts` executa `SELECT tema FROM jogos WHERE id = jogoId` e retorna `404 JOGO_NAO_ENCONTRADO` se o `id` não existir na tabela `jogos`.
  - Como `POST /api/jogos` da API exige uma tag no GitHub com manifesto `game.json` completo e `questoes.json` com 20 questões (e alguns dos 5 repositórios da turma não seguem todas as regras do validador de submissão), inserir os 5 registros na tabela `jogos` do Postgres local (via container Docker `docker exec` com `psql` Idempotente `ON CONFLICT (id) DO NOTHING`) é instantâneo, não depende de limite da API do GitHub e não modifica nenhum arquivo de `Portal-Web`.
- **Alternatives considered**:
  - Editar `Portal-Web/api/scripts/seed.ts`: descartado para manter 100% das alterações contidas no repositório `codigo/` (`fliperama-local/`) e preservar `Portal-Web` limpo.

