# Quickstart & Validation Guide: Encaixe Científico

## Validação da Integração

### 1. Testes Automatizados
Executar na pasta `fliperama-local`:
```bash
npm test
```
**Resultado esperado**: Todos os testes passando, incluindo a asserção de que `encaixe-cientifico` não sofre alterações indevidas de código e aceita `questoes.json`.

### 2. Sincronização Local dos Jogos
Executar:
```bash
npm run sync:jogos
```
**Resultado esperado**:
- Log exibindo download e adaptação de `Encaixe Científico`.
- Pasta `fliperama-local/public/jogos/Encaixe_cientifico-main/` criada contendo `index.html`, `questoes.json`, `capa.png`.
- Arquivo `fliperama-local/public/jogos/catalogo.json` contendo a entrada `encaixe-cientifico`.

### 3. Execução no Navegador
Iniciar o servidor local e o frontend:
```bash
npm run server
```
Em outro terminal:
```bash
npm run dev
```
Acessar `http://localhost:5173`:
- Localizar o card "Encaixe Científico" no catálogo.
- Clicar para jogar; verificar que o quiz e o tetris carregam.
- Concluir a partida e verificar o avanço para a tela de avaliação e identificação com o placar correto.
