# Fliperama local (`fliperama-local`)

Aplicação web e servidor local do quiosque do Recreio Arcade (G3). A descrição completa dos fluxos de sincronização, contratos de placar e deploy está no [`README.md` na raiz do repositório](../README.md).

## Comandos principais

```bash
# Instalar dependências
npm ci

# Subir apenas o fliperama (Fastify :3000 + Vite :5173) em um único terminal
npm run start:local

# Subir ambiente integrado (Postgres Docker + API G1 :4000 + Fliperama :3000 e :5173)
npm run start:integrado

# Subir os processos separadamente
npm run server          # Servidor Fastify na porta 3000 (carrega .env se existir)
npm run dev             # Frontend React/Vite na porta 5173

# Cadastrar os 5 jogos do fliperama no banco local da API G1
npm run seed:api-local

# Testes, lint e build
npm test                # Testes automatizados com node --test
npm run lint            # ESLint
npm run build           # Baixa os jogos em public/jogos/ e compila o frontend
```

## Configuração local (`.env`)

Se você usar `npm run start:local` ou `npm run start:integrado`, o script cria o arquivo `.env` a partir de `.env.example` quando ele ainda não existe. Para criar manualmente:

```dotenv
API_G1=http://localhost:4000
TOKEN_ESTACAO=dev-estacao
PORT=3000
CORS_ORIGIN=http://localhost:5173
```
