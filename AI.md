# AI.md: mapa do projeto para agentes de IA

Este ficheiro é o ponto de partida para qualquer agente de IA (Claude, Codex, Cursor, Copilot...) que abra este repositório. Diz onde está cada coisa, que regras não se podem partir e como fazer as tarefas mais comuns. Lê-o antes de mexer no código.

- Produto e utilizadores: [`PRODUCT.md`](PRODUCT.md)
- Decisões já tomadas e estado atual: [`CLAUDE.md`](CLAUDE.md)
- Sistema visual: [`DESIGN.md`](DESIGN.md)
- Instalação e visão geral para pessoas: [`README.md`](README.md)
- Relatório académico (LaTeX): `Relatorio/`

## O que é

**Bancada**: gestão digital de folhas de obra para oficinas. Substitui as folhas em papel: entrada do veículo, peças e horas registadas à medida que se trabalha, estado da reparação, totais com IVA e histórico por veículo e cliente. É **multi-oficina** (cada oficina só vê os seus dados). O primeiro cliente é a oficina Duarte & Raposo (Canhoso, Covilhã), especializada em autocaravanas.

Projeto final de licenciatura (Informática Web, Móvel e na Nuvem, UBI) do Tiago Dias Pereira (nº 55019). O código, os comentários e a interface estão em português de Portugal.

## Mapa do repositório

```text
.
├── AI.md                      ← estás aqui
├── CLAUDE.md                  memória do projeto: decisões, preferências do autor, estado atual
├── AGENTS.md                  ponto de entrada para outros agentes (aponta para aqui)
├── PRODUCT.md                 o produto: utilizadores, percurso, funcionalidades, o que não existe
├── DESIGN.md                  tokens e regras visuais (formato DESIGN.md do Google Stitch)
├── README.md                  instalação e visão geral
├── LICENSE                    todos os direitos reservados ao autor (não é código aberto)
├── Iniciar Bancada.command    arranque para testes com duplo clique no macOS (bash 3.2, tudo em containers)
├── docker-compose.yml         SQL Server (e, com --profile app, a app completa)
├── Dockerfile                 imagem de produção: API + frontend compilado
├── .env.example               todas as variáveis de ambiente, explicadas
├── .github/workflows/ci.yml   CI: testes da API contra SQL Server + lint e build do frontend
├── .claude/skills/            skills de design (impeccable, taste-skill) para agentes
├── .impeccable/surfaces/      contrato de direção visual do ecrã principal
├── docs/                      análise de segurança, performance e viabilidade; auditoria (auditoria.md + scripts); revisão de código e dívida técnica (revisao-codigo.md + provas); imagens (o aviso do README gera-se com imagens/gerar-aviso.mjs)
├── Relatorio/                 relatório e documento das ferramentas em LaTeX (.tex + .pdf) e anexos
├── backend/                   API REST (Node.js 22 + Express 5 + SQL Server)
│   ├── server.js              arranque do servidor e encerramento limpo
│   ├── app.js                 monta a app Express (separado para os testes)
│   ├── config.js              lê e valida as variáveis de ambiente (falha cedo)
│   ├── db.js                  pool de ligações + emTransacao()
│   ├── database/schema.sql    esquema completo da BD (6 tabelas)
│   ├── lib/
│   │   ├── validar.js         Validador: validação de todos os dados de entrada
│   │   ├── sessao.js          JWT em cookies httpOnly (sessão e dispositivo "bancada")
│   │   ├── credenciais.js     bcrypt (passwords e PINs)
│   │   ├── erros.js           ErroHttp, idDoUrl, violouRestricao
│   │   └── ambiente.js        carrega os ficheiros .env
│   ├── middleware/
│   │   ├── auth.js            exigirSessao, exigirCargo, exigirEntradaComPassword
│   │   ├── seguranca.js       verificação de origem (CSRF) e rate limiting
│   │   └── erros.js           respostas de erro em JSON, sem detalhes internos
│   ├── routes/                uma rota por recurso (ver tabela "API" abaixo)
│   ├── scripts/criar-env.js   cria o .env com passwords e JWT_SECRET aleatórios (nunca substitui um que exista)
│   ├── scripts/db-setup.js    cria a BD, as tabelas e o login da API (permissões mínimas)
│   ├── scripts/seed.js        Duarte & Raposo com dados de demonstração FICTÍCIOS
│   └── test/                  testes node:test contra SQL Server real
└── frontend/                  React 19 + Vite 8 (PWA)
    ├── index.html
    ├── vite.config.js         proxy /api em desenvolvimento, PWA (service worker)
    ├── public/                ícones, favicon, tema.js (aplica o tema antes de desenhar)
    ├── scripts/gerar-icones.mjs  gera src/components/icones.js (só os pesos usados)
    └── src/
        ├── main.jsx, App.jsx  entrada e rotas (páginas de gestão carregadas à parte)
        ├── context/           SessaoContext (sessão/bancada), AvisosContext (toasts)
        ├── lib/               api.js, formatar.js (nomes PT dos códigos), hooks
        ├── components/        Tablier, Luzes (pictogramas dos estados), Matricula, Botao, Campo, Moldura, TecladoPin...
        ├── pages/             um ficheiro por ecrã
        └── styles/            tokens.css (fonte de verdade das cores), base, componentes, páginas
```

## Arquitetura em 30 segundos

```text
browser ──> /api/*  ──> helmet (CSP) ─> rate limit ─> JSON ─> cookies ─> verificarOrigem
        │                 ─> rota ─> exigirSessao (lê o colaborador da BD) ─> Validador
        │                 ─> SQL parametrizado, sempre filtrado por ID_Oficina ─> SQL Server
        └─> /*      ──> frontend compilado (produção) ou Vite (desenvolvimento, com proxy)
```

- **Mesma origem**: em produção a API serve o frontend; em desenvolvimento o Vite reencaminha `/api` para a porta 3000. Não há CORS e os cookies `SameSite=Strict` funcionam.
- **Sessão**: JWT (HS256, com audiência e emissor) num cookie `httpOnly`. Em cada pedido, `exigirSessao` volta a ler o colaborador na BD, por isso desativar uma conta ou mudar a password corta as sessões logo (campo `Versao_Sessao`).
- **Modo bancada**: um gestor transforma um dispositivo no tablet da oficina (cookie `bancada_dispositivo`). Os mecânicos entram só com nome e PIN; a sessão via PIN não pode gerir contas nem definições.

## Regras que não se podem partir

1. **Isolamento entre oficinas.** Todas as consultas a dados de uma oficina filtram por `req.colaborador.oficinaId`. Nunca por um id que venha do pedido. Ids de outros recursos recebidos no corpo (ex.: `clienteId`) têm de ser confirmados como pertencendo à mesma oficina antes de serem usados. Recurso de outra oficina responde **404** (não 403: não se confirma que existe). Os testes em `backend/test/isolamento.test.js` provam isto; qualquer rota nova precisa de um teste igual.
2. **Autoria vem da sessão.** `ID_Colaborador` de folhas e linhas é sempre `req.colaborador.id`. Nunca aceitar um colaborador no corpo do pedido.
3. **Nada se apaga a sério**, exceto linhas de reparação de folhas não entregues. Clientes, veículos, colaboradores, oficinas e folhas usam `Ativo = 0`. O login da API (`bancada_app`) nem tem permissão de `DELETE` nessas tabelas (ver `scripts/db-setup.js`).
4. **Contas em SQL.** Totais, IVA e arredondamentos calculam-se no SQL Server com `DECIMAL` (ver `SQL_TOTAIS` em `routes/folhasObra.js`). Nunca somar dinheiro em JavaScript.
5. **SQL sempre parametrizado** (`.input(...)`). Nomes de colunas dinâmicos só a partir de listas fixas no código.
6. **Validar tudo** com `Validador` (`lib/validar.js`) e terminar com `v.verificar()`. Erros de campo voltam como `{ erro, campos: { campo: 'mensagem' } }`.
7. **Sem segredos no código.** Tudo vem do `.env` (ver `.env.example`). Uma password e um `JWT_SECRET` antigos estiveram expostos no histórico do git: nunca os reutilizar.
8. **Uma folha entregue fica fechada.** Só um gestor a reabre (mudando o estado); linhas e notas não se alteram enquanto está entregue.
9. **Content-Security-Policy rigorosa.** Nada de scripts ou estilos inline, nem recursos externos (fontes, CDNs, imagens). Fontes e ícones são locais.
10. **A Bancada não emite faturas.** Em Portugal a faturação exige software certificado pela AT. A app calcula totais e IVA; a fatura sai do programa de faturação da oficina. Não acrescentar "emitir fatura" sem essa certificação.

## Convenções

- **Português de Portugal** em código, comentários e interface ("registar", "ecrã", "utilizador"). Comentários explicam o *porquê*, em minúsculas e tom direto, como no resto do código.
- **Base de dados**: tabelas no singular (`Folha_Obra`), colunas `Pascal_Com_Underscore`, códigos em minúsculas sem acentos (`em_curso`, `mao_de_obra`, `gestor`).
- **API**: JSON em `camelCase` (`clienteId`, `valorUnitario`); listas devolvem `{ itens, total, pagina, porPagina }`; erros `{ erro, campos? }`.
- **Frontend**: os nomes bonitos dos códigos vivem em `src/lib/formatar.js`. Dados de rede via `useRecurso(caminho, { intervalo, memoria })`; `memoria` guarda a última resposta para o ecrã aparecer logo ao voltar, e limpa-se sempre que a sessão muda (nunca a usar para dados que uma pessoa não deva ver depois de outra). Ícones importam-se de `src/components/icones.js` (gerado; para um ícone novo, acrescentar a `scripts/gerar-icones.mjs` e correr `npm run icones`).
- **Direitos**: todos os direitos reservados ao autor (`LICENSE`). Não copiar código de terceiros sem confirmar que a licença o permite, e manter o aviso de autor quando a licença o exige (MIT, Apache).
- **Texto da interface**: frases curtas, sem travessões (—), mensagens de erro dizem o problema e como resolver.
- **Design**: seguir `DESIGN.md`. Cores só por tokens de `styles/tokens.css`. O tablier e a barra de topo são sempre escuros; o âmbar é a única cor de ação. Os estados usam os pictogramas de `components/Luzes.jsx` (não ícones Phosphor). `:hover` sempre dentro de `@media (hover: hover)` e alvos de toque de 48 px ou mais.

## Comandos

```bash
# configuração (primeira vez): cria o .env na raiz com segredos aleatórios
node backend/scripts/criar-env.js

# base de dados (Docker) e preparação
docker compose up -d                 # SQL Server em 127.0.0.1:1433
cd backend && npm install
npm run db:setup                     # cria BD + tabelas + login bancada_app (idempotente)
npm run db:seed                      # Duarte & Raposo + dados fictícios (mostra password e PINs)
npm run db:reset                     # APAGA e recria a BD (só desenvolvimento)

# desenvolvimento
cd backend && npm run dev            # API em http://localhost:3000
cd frontend && npm install && npm run dev   # app em http://localhost:5173

# verificações (as mesmas do CI)
cd backend && npm test               # 52 testes contra SQL Server (BD Bancada_Teste)
cd frontend && npm run lint && npm run build

# tudo em containers (produção local)
docker compose --profile app up -d --build   # http://localhost:3000
./Iniciar\ Bancada.command                   # o mesmo, para testes: abre o Docker, cria o .env e os dados, abre o browser
```

Os testes precisam de um SQL Server a correr e das variáveis `DB_ADMIN_PASSWORD` e `DB_PASSWORD` (do `.env`). Usam uma base de dados própria, `Bancada_Teste`, apagada e recriada em cada ficheiro de testes.

## API

Tudo em `/api`. Exceto onde se diz, exige sessão.

| Recurso | Rotas | Notas |
|---|---|---|
| Saúde | `GET /saude` | pública; confirma a ligação à BD |
| Registo | `POST /oficinas` | pública; cria oficina + primeiro gestor numa transação |
| Oficina | `GET/PUT /oficinas/atual`, `POST /oficinas/atual/desligar-tablets` | alterar: gestor com password |
| Sessão | `POST /auth/entrar`, `POST /auth/sair`, `GET /auth/sessao` | `sessao` nunca dá 401 |
| Bancada | `POST/DELETE /auth/bancada`, `GET /auth/bancada`, `POST /auth/bancada/entrar` | PIN bloqueia ao fim de 5 falhas |
| Colaboradores | `GET/POST /colaboradores`, `PUT/DELETE /colaboradores/:id` | só gestor com password |
| Clientes | `GET/POST /clientes`, `GET/PUT/DELETE /clientes/:id` | arquivar: gestor |
| Veículos | `GET/POST /veiculos`, `GET/PUT/DELETE /veiculos/:id` | `GET /:id` traz o histórico |
| Folhas de obra | `GET/POST /folhas-obra`, `GET /folhas-obra/resumo`, `GET/PATCH /folhas-obra/:id` | resumo: gestor |
| Linhas | `POST /folhas-obra/:id/linhas`, `DELETE /folhas-obra/:id/linhas/:linhaId` | devolvem os totais novos |

## Como fazer tarefas comuns

**Acrescentar uma rota na API**
1. Em `backend/routes/`, usar `router.use(exigirSessao)` e, se for preciso, `exigirCargo('gestor')`.
2. Validar a entrada com `new Validador(req.body)` e `v.verificar()`.
3. Em todas as consultas: `.input('oficina', sql.Int, req.colaborador.oficinaId)` e `WHERE ... ID_Oficina = @oficina`.
4. Várias escritas que têm de ficar juntas: `emTransacao(async (t) => ...)`.
5. Montar a rota em `app.js`.
6. Testes: caso normal, validação e **isolamento** (outra oficina recebe 404).

**Mudar a base de dados**
1. Alterar `backend/database/schema.sql` (com `CONSTRAINT` com nome, para as mensagens de erro).
2. Não há migrações: em desenvolvimento, `npm run db:reset && npm run db:seed`. Numa instalação com dados reais seria preciso um script `ALTER TABLE` (ainda não existe um sistema de migrações).
3. Se a tabela nova tiver soft delete, acrescentar o `DENY DELETE` em `scripts/db-setup.js`.

**Acrescentar um ecrã**
1. Criar `frontend/src/pages/Nome.jsx`; se não for de uso diário no tablet, carregar com `lazy()` em `App.jsx`.
2. Usar os componentes existentes (`Botao`, `Campo`, `Situacoes` para carregar/vazio/erro, `Matricula`, `EstadoFolha`).
3. Estados obrigatórios: a carregar, vazio, erro e normal. Alvos de toque de pelo menos 48 px.
4. Verificar nos dois temas e em 390 px, 1180 px (tablet) e 1440 px de largura.

## O que ainda não existe

Para não assumir funcionalidades que não há:

- emissão de faturas, integração com programas de faturação, exportação SAF-T;
- recuperação de password por email (não há envio de emails);
- escrita offline (o PWA guarda a app, mas os dados precisam de rede);
- sistema de migrações da base de dados;
- fotografias, orçamentos, stock de peças, notificações ao cliente;
- rate limiting partilhado entre várias instâncias (hoje é em memória, uma instância).

## Glossário

| Termo | Significado |
|---|---|
| Oficina | a empresa cliente da plataforma (o "tenant") |
| Colaborador | pessoa da oficina: `gestor` ou `mecanico` |
| Folha de obra | a ficha de uma entrada de um veículo na oficina (numerada por oficina) |
| Linha de reparação | peça, mão de obra (em horas) ou outro custo de uma folha |
| Bancada / modo bancada | o tablet partilhado da oficina, onde se entra com nome + PIN |
| Tablier | a faixa de luzes de estado no ecrã principal (como o painel de um carro) |
| Célula | a parte habitacional de uma autocaravana (marca própria, ex.: Hymer) |
| Matrícula | guardada normalizada (`AA00AA`); mostrada como `AA-00-AA` se for portuguesa |
| NIF | número de contribuinte (9 dígitos com dígito de controlo; estrangeiros com prefixo do país) |
| IVA | imposto; taxa por oficina (23% continente), copiada para cada folha quando abre |
