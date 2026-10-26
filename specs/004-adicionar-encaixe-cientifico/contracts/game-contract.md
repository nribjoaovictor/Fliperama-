# Contract: Encaixe Científico e Quiosque Fliperama

## 1. Inicialização (Fliperama → Jogo)

O fliperama envia via `postMessage` ao carregar o iframe:

```json
{
  "tipo": "ARCADE_INIT",
  "jogador": "JOGADOR1"
}
```

- `tipo`: Obrigatório, `'ARCADE_INIT'`.
- `jogador`: Apelido opcional do jogador (1-9 caracteres alfanuméricos) apenas para exibição decorativa. O jogo não persiste nem valida o apelido.

## 2. Término de Partida (Jogo → Fliperama)

Ao encerrar o jogo (tempo esgotado ou fim de blocos), o jogo emite para `window.parent`:

```json
{
  "tipo": "PLACAR",
  "jogo": "encaixe-cientifico",
  "versao": "1.0.0",
  "pontos": 1250,
  "duracao_s": 170,
  "acertos": 4,
  "erros": 1,
  "tema": "Mulheres na Ciência"
}
```

### Validações do Quiosque (`extrairPontuacao`):
- `tipo === 'PLACAR'` ou `type === 'PLACAR'`.
- `mensagem.jogo === 'encaixe-cientifico'`.
- `pontos` deve ser número finito, não negativo (`>= 0`).
