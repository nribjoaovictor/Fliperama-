# Data Model: Adicionar jogo Encaixe Científico

## Entities

### JogoDefinicao (Configuração em `sincronizacaoService.ts`)
- **id**: `string` - Identificador único e canônico (`'encaixe-cientifico'`).
- **nome**: `string` - Nome amigável para exibição no card de seleção (`'Encaixe Científico'`).
- **autores**: `string` - Nomes dos desenvolvedores (`'Eliabe Loureiro, Isac Victor, Pedro Paglioni'`).
- **repositorio**: `string` - URL do repositório no GitHub (`'https://github.com/Arcade-IFES/Encaixe_cientifico'`).
- **arquivoInicial**: `string` - Ponto de entrada do jogo dentro do pacote extraído (`'index.html'`).

### ItemCatalogo (Servido via `GET /jogos` e `catalogo.json`)
- **id**: `string` - `'encaixe-cientifico'`
- **nome**: `string` - `'Encaixe Científico'`
- **autores**: `string` - `'Eliabe Loureiro, Isac Victor, Pedro Paglioni'`
- **caminho**: `string` - URL relativa ou absoluta para carregar no iframe (`/jogos/Encaixe_cientifico-main/index.html` ou `http://localhost:3000/arquivos-jogos/Encaixe_cientifico-main/index.html`).

### MensagemPlacar (PostMessage do Iframe para o Quiosque)
- **tipo**: `'PLACAR'`
- **jogo**: `'encaixe-cientifico'`
- **versao**: `'1.0.0'`
- **pontos**: `number` (inteiro >= 0)
- **duracao_s**: `number` (segundos de duração)
- **acertos**: `number` (quantidade de acertos no quiz)
- **erros**: `number` (quantidade de erros no quiz)
- **tema**: `'Mulheres na Ciência'`
