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
| Direitos | todos os direitos reservados ao autor (`LICENSE`); repositório público só para consulta e avaliação. O README abre com um aviso grande de "em desenvolvimento" (`docs/imagens/aviso-em-desenvolvimento.svg`, gerado por `gerar-aviso.mjs`) até a Bancada estar pronta |

## Como trabalhar neste repositório

- **Ramos**: `main` é a versão estável e é o que aparece na página do GitHub. `dev` é a integração. Cada tarefa tem um ramo próprio, que entra no `dev` por PR. O `main` recebe o `dev` por PR e o merge é do autor: o classificador de segurança do Claude Code não deixa o agente fazê-lo (trata-o como publicação em produção).
- **CI** (`.github/workflows/ci.yml`): testes da API contra um SQL Server num container, e lint + build do frontend. A GitGuardian (app instalada no repositório) verifica segredos nos PRs. O CI só corre em pushes para `main`/`dev` e em PRs.
- **Antes de fazer push**: `cd backend && npm test` (precisa do SQL Server) e `cd frontend && npm run lint && npm run build`. Para mexidas no visual, confirmar num browser nos dois temas e em 390, 1180 e 1440 px.
- **Commits** em português, a explicar o porquê. Terminam com as linhas de atribuição que o ambiente indicar.
- **Segredos**: nunca no código nem no git (`.env` está no `.gitignore`). A password `sa` e o `JWT_SECRET` antigos estão no histórico público do git: nunca os reutilizar. A password do gestor e os PINs do `db:seed` só aparecem no terminal. Nos scripts, as passwords das contas de teste geram-se ao correr (`credencialDeTeste()` em `docs/auditoria/scripts/comum.mjs`): uma password de teste escrita no código fez a GitGuardian falhar o PR #3.
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
- **Auditoria** (`docs/auditoria/scripts/`): precisa de `npm install --no-save playwright axe-core` na pasta dos scripts, do `seed-output.txt` do `db:seed` e de `AUDITORIA_DIR`. Reiniciar a API entre corridas (o limite de logins é por email). Para mexer em tabelas com índices filtrados pelo `sqlcmd`, usar `-I` (senão o `QUOTED_IDENTIFIER` fica desligado e o `UPDATE` falha).
- **Revisão de código** (`docs/revisao-codigo/provas/`): `npm install --no-save playwright` na pasta das provas. O `pin-simultaneo.cjs` usa a BD de testes; os outros precisam da API a servir o frontend compilado.
- **`npm test` com 47 falhas `hookFailed`** (no `db-setup.js --reset`): ou o SQL Server está parado (o Docker não sobrevive ao reinício da sessão), ou a shell não tem o `DB_ADMIN_PASSWORD` e o `DB_PASSWORD` (não há `.env` no repositório).
- **Capturas de ecrã**: as do relatório estão em `Relatorio/Anexos/ecras/` (@2x) e as do README em `docs/imagens/` (@1x). Todas usam os dados fictícios do `db:seed`.

## Estado atual (28/09/2026)

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
- Segunda revisão da interface com o plugin `frontend-design` do repositório `anthropics/claude-code`, a pedido do autor, para "não parecer tão IA" (28/09/2026):
  - saíram os sinais de interface gerada que o plugin lista: cartões todos com o mesmo raio, textos separados por "·", ícones nos separadores, o login dividido ao meio com lema, dois botões âmbar em Definições;
  - cada raio vem de um objeto (tablier 16 px, papel 4 px, botões e campos 6 px); o número do tablier aparece num visor como o do computador de bordo; os dados da folha estão em caixas como numa folha de obra em papel;
  - o plugin não foi copiado para o repositório (a licença é da Anthropic): foi seguido a partir de uma cópia na sessão. As regras novas estão no `DESIGN.md`;
  - as capturas do README foram refeitas; as do relatório (`Relatorio/Anexos/ecras/`) ainda mostram a versão anterior.
- Documentação: `README.md`, `AI.md`, `DESIGN.md` (+ `.impeccable/design.json`), `PRODUCT.md` e `docs/analise.md` (segurança, desempenho e viabilidade).
- Relatório LaTeX atualizado (32 páginas, só o que está feito) e compilado em `Relatorio/relatorio_projeto_final_55019.pdf`.
- Documento complementar para a apresentação: `Relatorio/relatorio_ferramentas_55019.pdf` (30 páginas).
  - Cada ferramenta numa ficha: o que é, para que serviu, porquê, onde está.
  - Quem decidiu o quê, os erros apanhados pelas verificações e o uso do Claude Code, com números contados no registo da sessão até ao pedido do documento (510 chamadas).
  - A secção 4.5 do relatório principal aponta para ele.
- Auditoria de qualidade, segurança, desempenho e acessibilidade em `docs/auditoria.md` (27/09/2026), com os scripts em `docs/auditoria/scripts/`.
  - 82 verificações: 69 passam, 9 observações, 4 problemas. Nenhum crítico nem alto.
  - Prioridade alta: REL-001 (sem `errorElement`, erros mostram o ecrã do React Router em inglês) e REL-003 (sem rede, a app mostra "Entrar").
  - Nenhum código mudou: os achados estão todos abertos. Cada um diz como validar a correção.
- Revisão de código e dívida técnica em `docs/revisao-codigo.md` (27/09/2026), com as provas em `docs/revisao-codigo/provas/`.
  - Três bugs confirmados que a auditoria não apanhou: BUG-01 (ALTA: guardar as notas de uma folha apaga o que um colega gravou noutro dispositivo), BUG-02 (MÉDIA: o bloqueio do PIN contorna-se com pedidos em simultâneo) e BUG-03 (BAIXA: Definições não se atualiza depois de desligar os tablets).
  - 12 itens de dívida técnica. O principal é a regra do dinheiro escrita em 10 sítios (DT-001).
  - As correções foram validadas numa cópia (52 testes e provas antes e depois), mas nenhum código mudou: estão todas por fazer.
- `LICENSE` de todos os direitos reservados e aviso grande no topo do README: "em desenvolvimento, ainda não está pronto" e "todos os direitos reservados".
- Guia de arranque no README ("Como pôr a Bancada a funcionar"), para macOS e Windows:
  - passo a passo desde um computador sem nada instalado, e 16 problemas comuns com as mensagens de erro reais;
  - `node backend/scripts/criar-env.js` cria o `.env` com segredos aleatórios (nunca substitui um que exista);
  - o percurso e as mensagens foram confirmados num clone limpo, em Linux. Os passos próprios do macOS e do Windows (instaladores, Rosetta, WSL, PowerShell) não se testaram aqui.
- Este trabalho entrou no `dev` por PRs do ramo `claude/ecstatic-lamport-81qsk8`: o #1 (plataforma, interface, testes e documentação), o #2 (documento das ferramentas), o #3 (auditoria), o #4 e o #7 (memória), o #5 (licença e aviso), o #8 (revisão de código) e o do guia de arranque. A 27/09/2026 o `dev` passou para o `main` pelo PR #6, com o merge feito pelo autor. O que entrou no `dev` depois disso (do #7 em diante) só aparece na página do GitHub quando o `dev` voltar a passar para o `main`, e isso tem de ser pedido ao autor.

**Por fazer** (sugestões, nada disto existe):
1. Testar com os mecânicos da Duarte & Raposo: medir o tempo de uma entrada e de uma peça no papel e no tablet.
2. Publicar online: HTTPS, `COOKIE_SECURE=true`, ligação encriptada à BD e cópias de segurança.
3. Sistema de migrações da base de dados (hoje o esquema recria-se do zero).
4. Diagramas de casos de uso e de sequência para o relatório.
5. Folha imprimível para o cliente, com os conselhos.
6. Recuperação de password por email e um registo de auditoria completo.
7. Integração com programas de faturação certificados; política de privacidade e contratos RGPD.
8. Atualizar as capturas do relatório (`Relatorio/Anexos/ecras/`) para a interface revista a 28/09/2026 e recompilar o PDF.
9. Corrigir os achados da auditoria (secção 10 de `docs/auditoria.md`, primeiro REL-001 e REL-003) e da revisão de código (secção 14 de `docs/revisao-codigo.md`, primeiro BUG-01 e BUG-02), e passar os percursos no browser para testes E2E no CI.

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
  - relatório principal corrigido: os testes manuais são de julho, e as três opções do ecrã principal foram sorteadas pela impeccable entre sete formas;
  - auditoria completa (`docs/auditoria.md`), a pedido do autor, com os guiões de auditoria técnica e de mentoria que ele forneceu;
  - `LICENSE` de todos os direitos reservados e aviso grande no README; o `dev` passou para o `main` (PR #6, merge feito pelo autor);
  - o autor perguntou se valia a pena uma organização no GitHub: recomendei esperar pela nota e manter um só repositório;
  - revisão de código e dívida técnica (`docs/revisao-codigo.md`), a pedido do autor, com os guiões de revisão de código e de refatoração que ele forneceu;
  - o autor não conseguia arrancar o projeto no Mac (o Docker Desktop estava fechado): a secção de arranque do README passou a um guia completo para macOS e Windows, com o `criar-env.js`.
- **28/09/2026**:
  - no Mac do autor, o `db:setup` dava `Login failed for user 'sa'`: o volume `sql_dados` de junho/julho (mesmo nome no compose antigo) guardava a password antiga do `sa`. Solução: `docker compose down -v` e `docker rm -f dr_oficina_sql`;
  - interface revista com o plugin `frontend-design` (anthropics/claude-code), a pedido do autor.
