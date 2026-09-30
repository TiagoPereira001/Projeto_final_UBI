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

## Estado atual (30/09/2026)

**Feito:**
- Backend multi-oficina (Node 22, Express 5, SQL Server 2022):
  - 6 tabelas com chaves estrangeiras compostas por oficina;
  - sessões em cookies `httpOnly`, modo bancada com PIN, registo público;
  - login da API sem permissão de `DELETE`.
- 54 testes automáticos (`node:test`) contra SQL Server real, incluindo o isolamento entre oficinas. CI no GitHub Actions.
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
- `Iniciar Bancada.command` na raiz: arranque para testes com duplo clique no macOS, a pedido do autor (28/09/2026).
  - Só precisa do Docker Desktop: abre-o se estiver fechado, cria o `.env` (com o `criar-env.js` num container do Node), arranca tudo com `--profile app`, cria os dados de demonstração e abre http://localhost:3000. Para ao carregar em Enter ou ao fechar a janela.
  - Resolve sozinho: container de outra cópia ou o `dr_oficina_sql` antigo, `.env` incompleto, password fraca (recomeça), password diferente da do primeiro arranque (pede APAGAR). Deteta-os nos registos do SQL Server: `Password did not match` e `Password validation failed` (não serve procurar só `Login failed for user 'sa'`, que também aparece num arranque normal).
  - Testado em Linux, num terminal simulado, em oito cenários; o `shellcheck` passa e a sintaxe foi verificada com o bash 3.2 (o do macOS). Os passos próprios do macOS (`open -a Docker`, o Finder, o Gatekeeper) não se testaram aqui.
  - O `docker-compose.yml` passou a arrancar a API com `exec`: recebe o sinal do `docker stop` e para em 0 s. O SQL Server continua a ser parado à força ao fim de 10 s (o `launch_sqlservr.sh` da imagem não passa o sinal).
- Reauditoria de 28/09/2026 (secção 14 de `docs/auditoria.md`), a pedido do autor, que voltou a enviar o mesmo guião de auditoria:
  - todos os scripts repetidos sobre a versão nova: mesmos resultados na API e no browser, 0 violações axe;
  - achados novos e corrigidos: QA-005 (a data do histórico transbordava 39 px a 390 px, vinha do redesenho), SEC-009 (`criar-env.js` criava o `.env` legível por todos: agora 600), REL-005 (uma cópia restaurada noutro servidor deixava a API sem entrar: o `db:setup` religa o utilizador órfão), REL-006 (o registo de transações crescia sem limite em modo FULL: o `db:setup` cria as bases novas em SIMPLE);
  - SEC-010 (o container da API recebe a password do `sa`) fica aberto no compose local e resolvido na proposta de produção; os achados de 27/09 continuam todos abertos.
- Infraestrutura e publicação em `docs/infraestrutura.md`, a pedido do autor (guião de arquitetura de cloud e DevOps). **A Bancada continua sem estar publicada.** Proposta validada numa cópia em `localhost`, com o SQL Server Express e o Caddy a sério:
  - `docker-compose.prod.yml` e `infra/` (Caddyfile, `deploy.sh`, `backup.sh`, `restaurar.sh`, `restauro-teste.sh`, `fumo.sh`), ainda não em uso;
  - medido: cópia verificada, comprimida e cifrada em 2,7 s (1,9 MB); simulacro de perda total recuperado em 17 s com dados idênticos; primeira publicação em 42 s; publicação normal 9 s (1,7 s sem resposta); retrocesso automático; a Express corre os 52 testes;
  - a edição Developer (omissão da imagem) só serve para desenvolver: em produção, Express. Na Express não há compressão de cópias, TDE, cópias cifradas nem SQL Agent (testado);
  - RPO e RTO estão por definir com o cliente (perguntas na secção 15). Não há preços nem servidor reais: NÃO VERIFICADO;
  - o CI ganhou um terceiro trabalho (shellcheck, `docker compose config` e construção da imagem).
- Crítica de design do Quadro com a impeccable (30/09/2026), a pedido do autor: nota 28/40, dois P1 e três P2. O arquivo está em `.impeccable/critique/`. O autor escolheu começar pelos dois P1, disse que o tablet fica na parede ou na bancada a 1 a 2 m (por isso o tablier maior passa a P1) e que "Terminar" passa a neutro (a Regra da Voz Única vence).
  - **Feito (`layout`):** o ecrã de descanso (`/bancada`) mostra o tablier grande e só de leitura por cima de "Quem vai trabalhar?", com o bloco centrado; sem ligação, os números esbatem-se e dizem de quando são. O `GET /api/auth/bancada` devolve também `porEstado` (só as contagens da oficina do dispositivo; 2 testes novos, 54 no total). Na sessão do tablet, aviso 30 s antes do bloqueio por inatividade ("Ainda estás aí?", botão neutro "Continuar"; tocar ou carregar numa tecla também continua). O Tablier ganhou `somenteLeitura`, `grande` e `antigo`; as medidas passaram a variáveis CSS (`--tablier-simbolo`, `--tablier-nome`, `--tablier-numero`). Verificado no browser em dois temas e quatro larguras, e com o relógio simulado para o aviso.
  - **Feito (`harden`):** no seletor de estado da folha, "Entregue" passou a pedir um segundo toque e a ficar à parte dos quatro estados de trabalho (uma linha e 32 px de intervalo; fila própria abaixo de 1101 px), com "Fecha a folha" à vista em vez de num `title` que o toque não mostra. Reabrir uma folha entregue também pede dois toques, porque reabrir limpa a data de entrega. A pergunta inverte o botão (tinta, nem vermelho nem âmbar), caduca aos 4 s, com Escape, quando o foco sai, quando a folha muda entretanto e quando se toca noutro estado; um segundo toque a menos de 0,4 s do primeiro não conta. Passou a `role="group"` com `aria-pressed` (resolve o item do seletor na secção 10 de `docs/revisao-codigo.md`) e a ter uma linha `role="status"` para leitores de ecrã. O botão tocado diz "A gravar...", o pedido desiste aos 15 s (opção nova `tempoLimite` no cliente da API), o erro fica 8 s e a folha volta a pedir-se (a resposta pode ter-se perdido, ou um colega pode tê-la entregue). Achada e corrigida uma corrida real em `useRecurso`: a atualização de 30 s que já ia a caminho trazia os dados de antes e desfazia no ecrã a alteração gravada (reproduzida sem a correção; com ela deixa de acontecer). Verificado no Chromium com toques simulados: 197 verificações (dois temas em quatro tamanhos; no tema claro, 16 larguras de 360 a 1440 px e a letra a 200%), axe sem violações, mecânico contra gestor, e as falhas 500, 409, sem rede, lento e sem resposta; `npm test` com 54 testes. **Não verificado:** um leitor de ecrã a sério e um tablet a sério.
  - **Por fazer da crítica:** `adapt` (o tablier do Quadro com símbolo de 80 px, número de 48 px e nome de 20 px em toque com 1024 px ou mais, e um teste a 1,5 m no tablet montado), `quieter` ("Terminar" neutro e a chamar-se "Sair do tablet"; corrigir o DESIGN.md: linhas 302 e 398 contradizem-se, e as linhas 374 e 393 dizem 10 px nos botões e campos contra 6 px no código) e os P2 fora do âmbito (um só âmbar nos outros ecrãs, gravação automática das notas). Visto de passagem e não tratado: a 390 px a barra de topo do tablet corta o botão "Terminar", a 360 px a barra de topo transborda 22 px (já era assim), e os avisos de erro dos outros ecrãs continuam a durar 3,2 s (só o da mudança de estado da folha dura 8 s).
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
10. Publicar a sério, seguindo `docs/infraestrutura.md`: servidor, domínio, certificado, cron das cópias, cópia fora do servidor e guardar a chave privada do `age`. Antes, migrações da base de dados e a resposta do cliente sobre RPO e RTO.

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
  - interface revista com o plugin `frontend-design` (anthropics/claude-code), a pedido do autor;
  - `Iniciar Bancada.command`: arranque com duplo clique no macOS, para testes.
- **28 e 29/09/2026**:
  - o autor enviou de novo o guião de auditoria (igual ao anterior, por isso reauditoria) e um guião novo de arquitetura de cloud e DevOps;
  - reauditoria e `docs/infraestrutura.md` (ver o Estado atual), com os scripts e o compose de produção validados numa cópia.
- **30/09/2026**:
  - crítica de design do Quadro com a impeccable (28/40) e primeiro passo do plano, o `layout` do ecrã de descanso da bancada com o aviso antes do bloqueio (ver o Estado atual);
  - segundo passo do plano, o `harden` do seletor de estado da folha: Entregue com dois toques, erros e corrida entre a atualização e a gravação (ver o Estado atual).
