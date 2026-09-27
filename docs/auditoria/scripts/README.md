# Scripts da auditoria

Scripts usados na auditoria de 27/09/2026 ([`docs/auditoria.md`](../../auditoria.md)). Servem para repetir os testes e confirmar as correções.

**Só contra uma instância local, com dados fictícios.** Criam oficinas, clientes, veículos e folhas de teste, param o SQL Server durante uns segundos (`api-falhas.mjs`) e fazem rajadas de pedidos. Nunca os corras contra uma instalação com dados reais.

## Preparação

```bash
# 1. SQL Server e base de dados com os dados fictícios
docker compose up -d
cd backend && npm run db:setup
npm run db:seed > /caminho/da/pasta/seed-output.txt   # a password e os PINs ficam só neste ficheiro

# 2. a API em modo produção, a servir o frontend compilado
cd ../frontend && npm run build
cd ../backend
NODE_ENV=production COOKIE_SECURE=false APP_ORIGINS=http://localhost:3000 npm start

# 3. dependências dos testes no browser (fora do package.json do projeto)
cd ../docs/auditoria/scripts
npm install --no-save playwright axe-core
```

Variáveis de ambiente:

| Variável | Para quê |
|---|---|
| `AUDITORIA_DIR` | pasta com o `seed-output.txt`; os resultados (JSON e capturas) ficam lá |
| `DB_ADMIN_PASSWORD` | password do `sa`, para preparar casos que a API não deixa criar (datas no passado) |
| `SQL_CONTAINER` | nome do container do SQL Server (por omissão `bancada_sql`, como no `docker-compose.yml`) |
| `CHROMIUM` | caminho de um Chromium já instalado (opcional) |

O limite de 8 logins por email em 15 minutos também se aplica aos testes. Entre corridas seguidas, reinicia a API (os contadores vivem na memória).

## Scripts

| Script | O que faz |
|---|---|
| `comum.mjs` | cliente HTTP com cookies, acesso ao SQL Server e registo dos resultados |
| `api-funcional.mjs` | autenticação, CSRF, papéis, modo bancada, isolamento entre oficinas, validação, concorrência e contas (58 verificações) |
| `api-falhas.mjs` | limites de pedidos, SQL Server parado e recuperação. Corre no fim: bloqueia o IP local durante 5 minutos |
| `auditoria-browser.mjs` | XSS, axe (WCAG 2.2 AA) nos dois temas, transbordo em 4 larguras, alvos de toque, teclado, bloqueio por inatividade, arranque sem rede |
| `chunk.mjs` | o que vê quem tem a app aberta quando um ficheiro JS deixa de existir (depois de uma atualização) |
| `interacoes.mjs` | latência de toques no tablet com o CPU 4x mais lento |
| `registar-carga.mjs`, `carga.sql`, `api-carga-servidor.cjs`, `carga.mjs` | oficina com 5 anos de dados fictícios e medição de latência da API com 10 e 50 pedidos em simultâneo |

Para os testes de carga:

```bash
node registar-carga.mjs                     # cria a oficina de carga e guarda a conta em carga-conta.json
docker cp carga.sql bancada_sql:/tmp/carga.sql
docker exec bancada_sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$DB_ADMIN_PASSWORD" -C -b -I \
  -d Bancada -v OFICINA=<id da oficina> GESTOR=<id do gestor> -i /tmp/carga.sql
NODE_ENV=production APP_ORIGINS=http://localhost:3001 node api-carga-servidor.cjs &   # a mesma API na porta 3001, sem limites de pedidos
node carga.mjs
```
