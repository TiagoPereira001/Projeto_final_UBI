# CLAUDE.md

Memória do projeto para o Claude Code. É carregado no início de cada sessão e continua disponível depois de a conversa ser compactada. Serve para retomar o trabalho sem voltar a perguntar o que já foi decidido.

**Antes de qualquer tarefa, lê o [`AI.md`](AI.md)**: tem o mapa do repositório, as regras que não se podem partir (isolamento entre oficinas, autoria pela sessão, contas em SQL, soft delete), a API e os comandos. Para trabalho visual, lê também o [`DESIGN.md`](DESIGN.md) e o [`PRODUCT.md`](PRODUCT.md).

**Mantém este ficheiro atualizado.** No fim de cada tarefa grande, atualiza o "Estado atual" e acrescenta uma linha ao "Registo". O que não ficar escrito aqui perde-se na próxima compactação.

## O projeto e o autor

- **Bancada**: folhas de obra digitais para oficinas, multi-oficina (cada oficina só vê os seus dados). O primeiro cliente é a **Duarte & Raposo** (Canhoso, Covilhã), oficina de mecânica, eletricidade e autocaravanas.
- Autor: **Tiago Dias Pereira**, n.º 55019, Universidade da Beira Interior. É o projeto da UC de Projeto de Software Web, Móvel e na Nuvem, da licenciatura em Informática Web, Móvel e na Nuvem. O Tiago trabalha na Duarte & Raposo: os requisitos vêm das folhas de obra reais.
- Descrição completa do produto: [`PRODUCT.md`](PRODUCT.md).

## Preferências do autor

- **Português de Portugal em tudo**: código, comentários, interface, commits, PRs e documentos. As respostas no chat também são em português.
- **Sem travessões** (—) no texto da interface e dos documentos: usar dois pontos, vírgulas ou parênteses.
- **Relatório** (`Relatorio/`): só descreve o que está feito, "nem mais, nem menos". Escrito na primeira pessoa, com um tom humano (nada de linguagem de marketing). Declara o uso do Claude Code e das skills de design (secção 4.5). O que falta fica dito como "por fazer", nunca como feito.
- **Dados de demonstração** são sempre fictícios e marcados como tal. Nunca inventar clientes, testemunhos nem métricas.
- **Merges**: o autor autorizou (27/09/2026) o merge automático de PRs para o `dev` quando o CI está verde. Para o `main`, pedir sempre autorização primeiro.

## Decisões já tomadas (não reabrir sem razão)

| Decisão | Escolha |
|---|---|
| Nome | Bancada |
| Âmbito | plataforma para qualquer oficina; a Duarte & Raposo é o primeiro cliente, não a marca |
| Novas oficinas | registo público (a oficina e o primeiro gestor) |
| Dispositivo dos mecânicos | tablet partilhado na oficina (1180 × 820, deitado); modo bancada com nome + PIN |
| Ecrã principal | tablier de luzes: uma luz por estado, acesa quando há carros nesse estado |
| Identidade visual | manter e elevar: grafite + âmbar + a "luz indicadora" do login original; temas claro e escuro |
| Pictogramas dos estados | desenhados de propósito (`Luzes.jsx`): carro, chave de bocas, pistão, bandeira de xadrez, chave. Não usar a roda dentada (lê-se como "definições") |
| Faturação | a Bancada não emite faturas (é preciso software certificado pela AT); calcula totais e IVA |
| Documentos para agentes | `AI.md` (mapa), `CLAUDE.md` (esta memória), `AGENTS.md` (aponta para o `AI.md`) |

## Como trabalhar neste repositório

- **Ramos**: `main` é a versão estável e é o que aparece na página do GitHub. `dev` é a integração. Cada tarefa tem um ramo próprio, que entra no `dev` por PR.
- **CI** (`.github/workflows/ci.yml`): testes da API contra um SQL Server num container, e lint + build do frontend. A GitGuardian (app instalada no repositório) verifica segredos nos PRs. O CI só corre em pushes para `main`/`dev` e em PRs.
- **Antes de fazer push**: `cd backend && npm test` (precisa do SQL Server) e `cd frontend && npm run lint && npm run build`. Para mexidas no visual, confirmar num browser nos dois temas e em 390, 1180 e 1440 px.
- **Commits** em português, a explicar o porquê. Terminam com as linhas de atribuição que o ambiente indicar.
- **Segredos**: nunca no código nem no git (`.env` está no `.gitignore`). A password `sa` e o `JWT_SECRET` antigos estão no histórico público do git: nunca os reutilizar. A password do gestor e os PINs do `db:seed` só aparecem no terminal.
- **Design**: o sistema visual está no `DESIGN.md` (tokens em `frontend/src/styles/tokens.css`). As skills estão em `.claude/skills/` (impeccable e taste-skill). O contrato de direção do ecrã principal está em `.impeccable/surfaces/`.

## Ambiente das sessões na nuvem

- **SQL Server**: se o Docker não estiver a correr, arrancar com `nohup dockerd > /tmp/dockerd.log 2>&1 &`. Depois `docker compose up -d` (com o `.env`), ou um `docker run` da imagem `mcr.microsoft.com/mssql/server:2022-latest` em `127.0.0.1:1433`. Os testes só precisam de `DB_ADMIN_PASSWORD` e `DB_PASSWORD`: geram o seu próprio `JWT_SECRET` e recriam a BD `Bancada_Teste`.
- **Parar a API**: `pkill -f '^node server\.js$'`. Um padrão mais largo mata a própria shell.
- **Playwright**: lançar o Chromium com `executablePath: '/opt/pw-browsers/chromium'`. O limite de logins (8 em 15 min por IP e email) bloqueia percursos repetidos: reiniciar a API entre percursos.
- **Relatório (LaTeX)**:
  - Instalar: `apt-get install texlive-latex-base texlive-latex-recommended texlive-latex-extra texlive-lang-portuguese texlive-fonts-recommended lmodern latexmk texlive-plain-generic`.
  - Compilar em `Relatorio/`: `latexmk -pdf relatorio_projeto_final_55019.tex` (e `relatorio_ferramentas_55019.tex`), depois `latexmk -c` para limpar.
  - Os diagramas do relatório principal são Graphviz (`dot -Tpdf x.dot -o x.pdf`), com as fontes `.dot` em `Relatorio/Anexos/`. Os do documento das ferramentas são TikZ, dentro do próprio `.tex`.
  - Para ver o PDF página a página é preciso o `poppler-utils`. Para ver várias páginas numa só imagem (não há PIL nem ImageMagick): um `.tex` com `\includepdf[pages=-,nup=4x2]{...}` (pacote `pdfpages`) e depois `pdftoppm`.
  - Com o babel em português, o `"` é um atalho e come o espaço seguinte: usar ``` ``...'' ``` para as aspas.
- **Capturas de ecrã**: as do relatório estão em `Relatorio/Anexos/ecras/` (@2x) e as do README em `docs/imagens/` (@1x). Todas usam os dados fictícios do `db:seed`.

## Estado atual (27/09/2026)

**Feito:**
- Backend multi-oficina (Node 22, Express 5, SQL Server 2022):
  - 6 tabelas com chaves estrangeiras compostas por oficina;
  - sessões em cookies `httpOnly`, modo bancada com PIN, registo público;
  - login da API sem permissão de `DELETE`.
- 52 testes automáticos (`node:test`) contra SQL Server real, incluindo o isolamento entre oficinas. CI no GitHub Actions.
- Frontend novo (React 19, Vite 8, PWA):
  - quadro com o tablier, modo bancada, nova entrada pela matrícula, folha de obra;
  - histórico, clientes, veículos, equipa e definições;
  - temas claro e escuro.
- Revisão de design com a impeccable até ao veredito final "ship" (só cobre as correções pontuadas na última ronda).
- Documentação: `README.md`, `AI.md`, `DESIGN.md` (+ `.impeccable/design.json`), `PRODUCT.md` e `docs/analise.md` (segurança, desempenho e viabilidade).
- Relatório LaTeX atualizado (32 páginas, só o que está feito) e compilado em `Relatorio/relatorio_projeto_final_55019.pdf`.
- Documento complementar para a apresentação: `Relatorio/relatorio_ferramentas_55019.pdf` (30 páginas).
  - Cada ferramenta numa ficha: o que é, para que serviu, porquê, onde está.
  - Quem decidiu o quê, os erros apanhados pelas verificações e o uso do Claude Code, com números contados no registo da sessão até ao pedido do documento (510 chamadas).
  - A secção 4.5 do relatório principal aponta para ele.
- Todo este trabalho entrou no `dev` pelo PR #1 (ramo `claude/ecstatic-lamport-81qsk8`). O `main` continua na versão de julho: o README novo só aparece na página do GitHub quando o `dev` passar para o `main`, e isso tem de ser pedido ao autor.

**Por fazer** (sugestões, nada disto existe):
1. Testar com os mecânicos da Duarte & Raposo: medir o tempo de uma entrada e de uma peça no papel e no tablet.
2. Publicar online: HTTPS, `COOKIE_SECURE=true`, ligação encriptada à BD e cópias de segurança.
3. Sistema de migrações da base de dados (hoje o esquema recria-se do zero).
4. Diagramas de casos de uso e de sequência para o relatório.
5. Folha imprimível para o cliente, com os conselhos.
6. Recuperação de password por email e um registo de auditoria completo.
7. Integração com programas de faturação certificados; política de privacidade e contratos RGPD.

## Registo

- **07/06/2026**: primeira fase (requisitos, modelo de dados, SQL Server em Docker).
- **18 a 20/07/2026**: API de colaboradores, clientes e autocaravanas, com testes manuais. Depois as rotas das folhas, o login com JWT, as primeiras proteções e o início do frontend (não arrancava).
- **26/09/2026**:
  - revisão completa e passagem a multi-oficina (Bancada), com os testes e o CI;
  - frontend refeito e revisto com a impeccable (DESIGN.md);
  - AI.md, docs/analise.md, README e relatório.
- **27/09/2026**:
  - CI reproduzido num clone limpo;
  - PR #1 para o `dev` (verde);
  - este CLAUDE.md passou a ser a memória do projeto e o PRODUCT.md passou a descrição completa do produto;
  - documento das ferramentas (`relatorio_ferramentas_55019`), com todas as afirmações confirmadas no código, no git ou no registo da sessão;
  - relatório principal corrigido: os testes manuais são de julho, e as três opções do ecrã principal foram sorteadas pela impeccable entre sete formas.
