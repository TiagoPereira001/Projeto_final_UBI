# Revisão de código e dívida técnica

Revisão de todo o código da Bancada (backend, frontend, esquema da base de dados, scripts e testes), feita a 27/09/2026 a pedido do autor, com os guiões de revisão de código profissional e de refatoração que ele forneceu. O código revisto é o do `dev` nesse dia (commit `2ea6ba7`).

Complementa a [auditoria](auditoria.md). A auditoria testou o comportamento da aplicação de fora; esta revisão lê o código por dentro. Quando um problema já está na auditoria, aponto para ele em vez de o repetir.

**Nenhum código da aplicação mudou.** As correções propostas foram aplicadas e testadas numa cópia descartável do projeto: os exemplos da [secção 15](#15-exemplos-antes-e-depois-validados) são essas correções, com o resultado medido antes e depois.

## Índice

1. [Resumo](#1-resumo)
2. [Medições](#2-medições)
3. [Código limpo](#3-código-limpo)
4. [Comentários](#4-comentários)
5. [Arquitetura](#5-arquitetura)
6. [Bugs e problemas de lógica](#6-bugs-e-problemas-de-lógica)
7. [Segurança](#7-segurança)
8. [Desempenho](#8-desempenho)
9. [Testabilidade](#9-testabilidade)
10. [Acessibilidade](#10-acessibilidade)
11. [Frontend: estado, erros e experiência](#11-frontend-estado-erros-e-experiência)
12. [Consistência](#12-consistência)
13. [Registo da dívida técnica](#13-registo-da-dívida-técnica)
14. [Plano de refatoração por fases](#14-plano-de-refatoração-por-fases)
15. [Exemplos antes e depois (validados)](#15-exemplos-antes-e-depois-validados)
16. [Plano ficheiro a ficheiro](#16-plano-ficheiro-a-ficheiro)
17. [Proteção por testes](#17-proteção-por-testes)
18. [Avaliação final](#18-avaliação-final)
19. [Checklists](#19-checklists)
20. [Relatório final](#20-relatório-final)
21. [Para aprenderes com esta revisão](#21-para-aprenderes-com-esta-revisão)
22. [Como repetir as provas](#22-como-repetir-as-provas)

## Como ler este documento

Cada achado diz quatro coisas:

- **Tipo**:
  - *bug confirmado*: reproduzi-o e está a prova;
  - *problema potencial*: vem da leitura do código, mas não o demonstrei;
  - *melhoria de qualidade*: o código funciona, mas pode ficar mais claro ou mais seguro de mudar;
  - *preferência de estilo*: uma escolha minha, não um defeito.
- **Peso num projeto académico**: *problema técnico* (corrigir), *melhoria profissional* (o que uma equipa faria, mas não é obrigatório aqui) ou *complexidade a mais para o objetivo* (não fazer).
- **Severidade**: CRÍTICA, ALTA, MÉDIA, BAIXA ou INFO.
- **Evidência**: MEDIDO (ferramenta, teste ou prova, com o número), INFERIDO (lido no código) ou HIPÓTESE (pode acontecer; falta prova).

Os locais aparecem como `ficheiro:linha`, no commit revisto. As caixas **Para aprender** explicam o conceito por trás de um achado, como na auditoria.

---

## 1. Resumo

### O que o código faz e como está organizado

A Bancada é uma aplicação web de folhas de obra para oficinas: cada oficina vê só os seus dados. O código divide-se assim:

```text
browser (React 19, PWA)
  pages/        um ecrã por ficheiro: vai buscar os dados e desenha
  components/   peças de interface reutilizáveis (Botao, Campo, Tablier...)
  lib/          useRecurso (dados da API), api.js (cliente HTTP), formatar.js, tema
  context/      sessão (quem está a trabalhar) e avisos passageiros
      │  fetch /api/... com cookie httpOnly
      ▼
API (Node 22, Express 5)
  app.js        helmet (CSP) → limites de pedidos → JSON → cookies → CSRF → rotas → erros
  routes/       um router por recurso: valida (Validador), faz o SQL, devolve JSON
  middleware/   sessão e cargos, CSRF e limites, erros
  lib/          validação, sessões JWT, passwords, erros HTTP
      │  SQL parametrizado (mssql), um pool, transações com emTransacao()
      ▼
SQL Server 2022
  6 tabelas, chaves estrangeiras compostas por oficina, CHECKs, índices
```

### Veredito

**O código está limpo, legível e bem acima da média de um projeto académico.**
- Os nomes são consistentes e em português.
- Os comentários explicam o porquê, e não o quê.
- A segurança foi pensada em camadas.
- Não há dependências circulares, nem variáveis por usar, nem violações das regras dos hooks do React.

**Encontrei três bugs que a auditoria não apanhou.** Só aparecem com dois dispositivos, ou com pedidos em simultâneo, e a auditoria testou uma pessoa de cada vez:

| | Problema | Severidade |
|---|---|---|
| [BUG-01](#bug-01) | Guardar as notas de uma folha no tablet apaga o que um colega gravou noutro dispositivo | **ALTA** |
| [BUG-02](#bug-02) | O bloqueio do PIN ao quinto erro deixa-se contornar com pedidos em simultâneo | MÉDIA |
| [BUG-03](#bug-03) | Em Definições, depois de "Desligar todos os tablets", o ecrã continua a dizer que o dispositivo é a bancada | BAIXA |

**A maior dívida técnica não está no tamanho do código, mas nas regras repetidas:**
- a regra do dinheiro (total de cada linha) está escrita 10 vezes em 2 ficheiros ([DT-001](#dt-001));
- o estado dos formulários é copiado dos dados do servidor, o que causa o BUG-01 ([DT-002](#dt-002));
- várias regras de negócio vivem dentro dos handlers HTTP, onde só se testam com a API e a base de dados a correr ([DT-003](#dt-003)).

### O que mudar primeiro

1. **Corrigir o [BUG-01](#bug-01)**: 18 linhas novas em `Folha.jsx`, validado ([exemplo 15.2](#152-as-notas-guardam-só-o-que-a-pessoa-mudou-bug-01)).
2. **Corrigir o [BUG-02](#bug-02)**: reservar a tentativa antes de comparar o PIN ([exemplo 15.1](#151-o-pin-reserva-a-tentativa-antes-de-a-comparar-bug-02)).
3. **Pôr a regra do dinheiro num só sítio** ([exemplo 15.3](#153-a-regra-do-dinheiro-num-só-sítio-dt-001)). Agora, enquanto não há dados reais, mudar o esquema é barato.
4. **Ligar um linter ao backend no CI** ([DT-005](#dt-005)) e começar os testes E2E da auditoria (AUT-001).
5. **Separar as regras de acesso dos colaboradores numa função pura**, com testes unitários ([DT-003](#dt-003)).

---

## 2. Medições

Tudo MEDIDO no commit revisto, com ferramentas corridas de fora do projeto (nada foi instalado no `package.json`).

**Tamanho:**

| Parte | Ficheiros | Linhas | Comentários (% das linhas não vazias) |
|---|---|---|---|
| Backend: código (`app`, `config`, `db`, `lib`, `middleware`, `routes`) | 18 | 2 454 | 12% |
| Backend: scripts (`db-setup`, `seed`) | 2 | 390 | 8% |
| Esquema SQL | 1 | 196 | 28% |
| Backend: testes | 6 | 885 | 5% |
| Frontend: JS e JSX (sem o `icones.js`, que é gerado) | 40 | 3 231 | 5% |
| Frontend: CSS | 9 | 2 742 | 8% |

**Qualidade:**

| Ferramenta | O que mede | Resultado |
|---|---|---|
| ESLint 9 (configuração só para a revisão) | funções com complexidade ciclomática acima de 10 | **27** |
| | funções com mais de 80 linhas | **11** |
| | profundidade de blocos acima de 4, mais de 4 parâmetros | 0 e 0 |
| | variáveis por usar, `==` em vez de `===`, `var` | 0, 0 e 0 |
| | regras dos hooks do React (`rules-of-hooks`, `exhaustive-deps`) | **0** |
| | acessibilidade estática (`jsx-a11y`, regras recomendadas) | 1 (`autoFocus`, deliberado: ver [secção 10](#10-acessibilidade)) |
| jscpd (blocos de 5 ou mais linhas) | duplicação | **2,7%**: 263 de 9 702 linhas, 33 blocos (JS 1,7%, JSX 1,5%, CSS 5,5%) |
| madge | dependências circulares | **0** (50 ficheiros do frontend, 26 do backend) |
| knip | exportações e dependências sem uso | 7 exportações (em 5 ficheiros) usadas só dentro do próprio ficheiro; 3 "dependências sem uso" que são falsos positivos |
| oxlint (o lint do projeto, só no frontend) | regras por omissão | 0 avisos |
| `node --test` com cobertura (da auditoria) | backend | 93% das linhas, 82% dos ramos |

Falsos positivos do knip, confirmados um a um:
- as letras `@fontsource/*` são importadas pelo CSS;
- o `@phosphor-icons/core` é usado pelo `scripts/gerar-icones.mjs`;
- as exportações de `lib/sessao.js` são usadas como `sessao.iniciarSessao(...)`, que o knip não segue.

> **Para aprender: a complexidade de um componente React não se lê como a de uma função.** A complexidade ciclomática conta caminhos: cada `if`, `&&`, `?:` e `||`. Num componente, quase todos são **estados visuais** (a carregar, erro, vazio, lista). O `Quadro` tem 19 e lê-se bem. Onde o número pesa a sério é na **lógica**: o `PUT /colaboradores` tem 23 e mistura seis coisas diferentes ([DT-003](#dt-003)). Olha para o número e depois pergunta: "isto são estados de ecrã ou decisões de negócio?"

---

## 3. Código limpo

### 3.1 Nomes

**O que está bem.** O vocabulário é o da oficina e é o mesmo em todas as camadas:
- `folha`, `linha`, `oficina`, `colaborador`, `bancada`;
- `Validador`, `emTransacao`, `exigirSessao`, `useRecurso`, `Tablier`.

Os códigos da API (`em_curso`, `mao_de_obra`) ficam separados dos nomes que se mostram (`formatar.js`), como diz a convenção do `AI.md`.

**O que pode melhorar** (preferência de estilo, BAIXA):

| Onde | O que confunde | Sugestão |
|---|---|---|
| `frontend/src/App.jsx:37` e `SessaoContext.jsx:14` | `aCarregar` quer dizer duas coisas: em `App.jsx` é uma função que embrulha o `Suspense`; no resto do código é um booleano "está a carregar" | `comEspera(elemento)` em `App.jsx` |
| `backend/routes/auth.js:23` | `dispositivoValido(req, res)` soa a pergunta, mas também apaga o cookie quando o dispositivo já não vale | `confirmarDispositivo`, e dizer no comentário que apaga o cookie |
| `backend/middleware/auth.js:52` | `exigirCargo(...cargos)` aceita qualquer cargo, mas a mensagem diz sempre "Só um gestor". É usado 8 vezes, sempre com `'gestor'` | `exigirGestor()`: mais simples e sem mensagem enganadora (YAGNI) |
| `backend/app.js:12-17` | dois routers vêm de fábricas (`criarRouterAuth`, `criarRouterOficinas`) e os outros são módulos (`colaboradoresRouter`) | justificado (os dois primeiros recebem os limitadores de pedidos), mas vale um comentário |

### 3.2 Funções e complexidade

| Função | Complexidade | Linhas | Leitura |
|---|---|---|---|
| `routes/colaboradores.js:89` (`PUT /:id`) | **23** | 86 | lê o colaborador, valida com regras cruzadas, calcula hashes, decide se as sessões caem, faz o SQL, trata dois erros do SQL Server e renova a sessão. **Seis responsabilidades** ([DT-003](#dt-003)) |
| `pages/Equipa.jsx:96` (`FormularioColaborador`) | **27** | 106 | a interface repete as mesmas regras (email, password e PIN) para decidir etiquetas e campos opcionais |
| `pages/NovaEntrada.jsx:21` | 18 | 146 | três passos (matrícula, veículo, entrada) num só componente |
| `pages/Folha.jsx:39` (`FolhaAberta`) | até 10 | 142 | comprido, mas já dividido em `SeletorEstado`, `NovaLinha`, `Totais` e `Notas`; a tabela das linhas podia ser mais um |
| `lib/validar.js:158` (`decimal`) | 18 | 21 | muitos `if`, mas cada um devolve logo um erro: lê-se de cima para baixo. Aceitável |
| `routes/folhasObra.js:368` (`PATCH /:id`) | 16 | 66 | quatro `if` quase iguais para montar o `SET`; aceitável. Tem a janela de corrida SEC-004 da auditoria |
| `routes/auth.js:43` e `routes/oficinas.js:9` | baixa | 141 e 127 | não são funções complexas: são fábricas com todos os handlers lá dentro |

**Recomendação.** Tratar só as duas primeiras e a terceira (ver [DT-003](#dt-003) e [DT-009](#dt-009)). O resto não precisa de mudar. Partir componentes só para baixar um número seria complexidade a mais.

### 3.3 Duplicação

A duplicação medida é baixa (2,7%). O que importa não é a quantidade: é **se o texto repetido é a mesma regra**.

**Repetições que são a mesma regra** (vale a pena juntar):

| Regra | Onde está | Achado |
|---|---|---|
| Total de uma linha: `ROUND(Quantidade * Valor_Unitario, 2)` | **10 vezes**: 9 em `routes/folhasObra.js`, 1 em `routes/veiculos.js:137` | [DT-001](#dt-001) |
| IVA: `ROUND(subtotal * Taxa_IVA / 100, 2)` | 3 vezes: `folhasObra.js:22`, `:23` e `:238` | [DT-001](#dt-001) |
| Forma da resposta da sessão (`{ colaborador, oficina }`) | `routes/auth.js:14` e escrita à mão em `routes/oficinas.js:84` | [DT-004](#dt-004) |
| Formato do PIN (`^\d{4,6}$`) | `routes/auth.js:159` e `lib/validar.js:240` | [DT-003](#dt-003) |
| PIN fácil de adivinhar | `lib/validar.js:241-244` e `scripts/seed.js:28-33` | [DT-003](#dt-003) |
| Códigos de erro do SQL Server (2627, 2601, 547) | `lib/erros.js:29`, `middleware/erros.js:30` e `:33`, `routes/colaboradores.js:160` | constantes com nome num só módulo |
| Ciclo de envio de um formulário (`aGuardar`, `erro`, `erros`, `try/catch`) | **10 vezes em 9 ficheiros** do frontend | [DT-008](#dt-008) |
| Estados, tipos, categorias e cargos | `CHECK` no esquema, listas no backend e listas com nomes no frontend | [DT-012](#dt-012) |

**Repetições que devem ficar:**
- **As cadeias de `.input(...)` do `POST` e do `PUT`** (clientes, veículos, colaboradores). São explícitas e dizem o tipo SQL de cada campo. Um ajudante genérico esconderia os tipos e pouparia pouco.
- **As três linhas "campo obrigatório" no início de cada método do `Validador`** (8 vezes). São iguais, curtas e claras; uma abstração obrigava a ir ver outro sítio para perceber cada método.
- **`Clientes.jsx` e `Veiculos.jsx`.** Parecidos, mas cada linha da lista é diferente. Um componente genérico de "página de lista" seria complexidade a mais.
- **`gerarNif` nos testes (`test/ajuda.js`), que repete o algoritmo de `nifPortuguesValido`.** É de propósito: um teste não deve usar o código que está a testar para gerar a resposta certa.
- **Os blocos `@font-face` em `fontes.css` e o tema escuro em `tokens.css`**, que está uma vez na `@media` e outra no `[data-tema='escuro']`. O CSS não deixa partilhar um bloco entre os dois. O tema está bem, mas falta dizer isto num comentário.

> **Para aprender: DRY é sobre conhecimento, não sobre texto.** "Don't Repeat Yourself" quer dizer que cada **regra** deve ter um só sítio. Dois pedaços de código iguais que representam coisas diferentes (os `.input()` de um `INSERT` e de um `UPDATE`) podem ficar repetidos. Mudam por razões diferentes, e juntá-los cria acoplamento. Um só pedaço escrito dez vezes (o total da linha) é uma bomba-relógio: no dia em que houver descontos por linha, basta esquecer uma das dez cópias para o histórico mostrar um valor e a folha outro.

---

## 4. Comentários

Os comentários são o ponto mais forte deste código. Quase todos explicam **porquê**: a regra de negócio, a decisão, o limite. Há poucos, e bem identificados, a corrigir.

| Classificação | Exemplos | O que fazer |
|---|---|---|
| **Necessários** (sem eles, alguém "arrumava" o código e partia uma regra) | `schema.sql:10-21` (multi-oficina, datas em UTC, soft delete); `folhasObra.js:294-296` (o `UPDATE` do contador bloqueia a linha até ao fim da transação); `lib/credenciais.js:9-12` (o hash fictício que impede descobrir emails pelo tempo de resposta); `lib/validar.js:223` (o bcrypt só usa 72 bytes); `middleware/auth.js:5-8` (a consulta à BD em cada pedido é de propósito) | manter |
| **Úteis** | `lib/useRecurso.js:14-19` (quando volta a pedir e porquê); `components/Tablier.jsx:6-24` (os dois momentos de luz); `components/Campo.jsx:3-4` (nunca usar o placeholder como etiqueta) | manter |
| **Redundantes** | `lib/formatar.js:17-21`: **dois comentários seguidos a dizer a mesma coisa** (sobras de uma edição). O segundo diz "AA-00-00 até AA-00-AA", o que sugere um intervalo que não existe | apagar o segundo |
| **Históricos** (contam como era antes) | 8 comentários: `config.js:6`, `db.js:4-7` e `:25-26`, `lib/sessao.js:6-9`, `routes/folhasObra.js:270-271`, `routes/veiculos.js:7-9` e `:176-178`, `frontend/src/lib/api.js:4-5` | tirar a parte do "antes" e ficar só com o porquê ([DT-006](#dt-006), [exemplo 15.5](#155-um-comentário-histórico-passa-a-explicar-o-porquê-dt-006)) |
| **Enganadores** | `schema.sql:10-14` diz que as chaves compostas garantem que nada aponta para outra oficina. É verdade na `Folha_Obra`, mas **não na `Linha_Reparacao`** (`schema.sql:187-188`), que não tem `ID_Oficina`. `middleware/erros.js:13` desliga uma regra do ESLint num backend onde nenhum linter corre | corrigir o esquema ou o texto ([DT-007](#dt-007)); ligar o linter ([DT-005](#dt-005)) |
| **Em falta** | `public/tema.js` e `src/lib/tema.js` partilham a chave `'bancada:tema'` e nenhum diz que o outro existe; o efeito lateral de `dispositivoValido`; o `<span className="so-leitores">` em `pages/Entrar.jsx:114`, cujo propósito não se percebe; em `useRecurso`, que mudar de `caminho` mostra os dados do caminho anterior até chegar a resposta | uma linha em cada sítio |

> **Para aprender: o comentário explica o porquê; a história vai para o git.** "Antes o token ia no localStorage" foi útil enquanto o projeto estava a ser refeito. Para quem chega agora, o "antes" é ruído, e daqui a um ano pode nem ser verdade. A informação que conta é o **porquê** ("um cookie httpOnly não é acessível ao JavaScript: uma falha de XSS não rouba a sessão"). A história fica no commit e no relatório.

---

## 5. Arquitetura

### 5.1 Como está

**Pontos fortes, com razões:**
- **Pastas claras e sem ciclos.** O madge não encontrou nenhuma dependência circular.
- **Infraestrutura com um só sítio:**
  - um pool de ligações e um `emTransacao()`, em vez de um `try/commit/rollback` em cada rota;
  - uma validação central (`Validador`, que junta todos os erros);
  - um tratamento de erros central (`ErroHttp` e `tratarErros`).
- **Isolamento entre oficinas em três camadas**: a sessão, o `WHERE ID_Oficina` de cada consulta e as chaves compostas no esquema.
- **Um hook de dados com 72 linhas (`useRecurso`)**, em vez de uma biblioteca (React Query, SWR). Chega para o que a app precisa.

**Opção de desenho consciente:** o backend não tem camada de serviços nem de repositórios. Cada rota valida, faz o SQL e monta a resposta. Para uma API deste tamanho (6 routers, cerca de 1 500 linhas) é a escolha certa, e acrescentar camadas agora seria complexidade a mais. O custo aparece em três sítios, descritos a seguir.

### 5.2 Onde vai custar quando crescer

Cada caso: como está → o problema → a proposta.

**1. Regras de negócio dentro dos handlers**
- **Como está:** as regras de acesso dos colaboradores (`colaboradores.js:105-129`) e do PIN (`auth.js:178-216`) estão misturadas com o HTTP e o SQL.
- **O problema:** só se testam com a API e o SQL Server a correr, e cada ficheiro de testes recria a base de dados. Quem mexer nelas não tem testes rápidos que o avisem.
- **A proposta:** extrair **só essas regras** para funções puras, em `lib/`, com testes unitários. Não criar uma camada de serviços para tudo ([DT-003](#dt-003)).

**2. Respostas montadas à mão em cada endpoint**
- **Como está:** cada endpoint monta o seu JSON:
  - o `POST /veiculos` devolve `{ id, ...campos, clienteId }`;
  - o `GET /veiculos/:id` devolve `{ ..., cliente: { id, nome, telefone }, folhaAtiva }`.
- **O problema:** o frontend compensa as diferenças. Por exemplo, `FormularioVeiculo.jsx:55` junta o `cliente` à mão. Sem tipos nem esquema, qualquer mudança numa resposta parte o frontend sem aviso.
- **A proposta:** uma função de "forma pública" por recurso (como o `paraJson` de `veiculos.js`), usada por todos os endpoints desse recurso ([DT-004](#dt-004)). Um contrato OpenAPI só se houver integrações externas.

**3. Estado do servidor copiado para o estado dos formulários**
- **Como está:** `Notas` e `DadosOficina` fazem `useState(valoresDoServidor)`.
- **O problema:** o `useState` só usa o valor inicial na primeira vez. Com a atualização automática, o formulário fica com valores antigos e grava-os ([BUG-01](#bug-01)).
- **A proposta:** o formulário guarda **só o que a pessoa editou**, e o resto vem sempre do servidor ([DT-002](#dt-002)). Mais tarde, com várias oficinas a sério, controlo de concorrência otimista na API ([DT-010](#dt-010)).

**4. A mesma regra em várias camadas**
- **Como está:** a regra do dinheiro está 10 vezes no SQL das rotas. As enumerações estão no esquema, no backend e no frontend.
- **O problema:** uma mudança de regra obriga a encontrar todas as cópias.
- **A proposta:** o dinheiro passa a viver no esquema (coluna calculada, [exemplo 15.3](#153-a-regra-do-dinheiro-num-só-sítio-dt-001)). As enumerações ficam onde estão, protegidas por um teste que as compara ([DT-012](#dt-012)).

**5. Esquema recriado do zero** (já está no "Por fazer" do `CLAUDE.md`)
- **O problema:** no dia em que houver dados reais, qualquer mudança ao esquema precisa de um script de migração.
- **A proposta:** um sistema de migrações antes de publicar. Até lá, mudar o esquema é barato, por isso as mudanças ao esquema propostas aqui devem entrar antes.

---

## 6. Bugs e problemas de lógica

### BUG-01
**Guardar as notas de uma folha apaga o que um colega gravou noutro dispositivo**

| | |
|---|---|
| Severidade | **ALTA** · bug confirmado · problema técnico · MEDIDO |
| Local | `frontend/src/pages/Folha.jsx:300-352` (componente `Notas`) |
| Problema | As notas (quilómetros, observações, conselhos) são copiadas para o estado do formulário **uma vez**, quando a folha abre. A folha atualiza-se sozinha de 30 em 30 segundos (`Folha.jsx:23`), mas o formulário não. Quando um colega grava noutro dispositivo, este ecrã continua com o texto antigo. O botão "Guardar notas" acende como se alguém tivesse mexido, porque o texto antigo é diferente do que veio do servidor. Ao guardar, o `PATCH` leva os **três** campos, e o texto antigo substitui o do colega. |
| Porquê | O `useState(valorInicial)` só usa o valor inicial na primeira renderização. |
| Prova | `provas/estado-antigo.mjs`, com o gestor no computador e um mecânico no tablet, na mesma folha:<br>1. o gestor grava uma observação nova;<br>2. o tablet volta a pedir a folha e **recebe o texto novo**, mas o campo continua a mostrar "Texto original da entrada";<br>3. "Guardar notas" está ativo sem ninguém mexer;<br>4. o mecânico escreve só um conselho e guarda;<br>5. **as observações voltam a "Texto original da entrada" e a nota do gestor perde-se, sem aviso.** |
| Porque é ALTA | Perde-se texto que uma pessoa escreveu, sem aviso nem forma de o recuperar (não há histórico), no cenário para que a Bancada foi feita: um tablet na oficina e um computador no escritório, com atualização automática. O botão aceso até convida ao erro. |
| Correção | Guardar só os campos que a pessoa editou e mostrar o resto a partir da folha. 18 linhas novas, validado: [exemplo 15.2](#152-as-notas-guardam-só-o-que-a-pessoa-mudou-bug-01). O projeto já usa uma solução para o mesmo problema noutro sítio: `key={c.id}` em `Cliente.jsx:54`. |

### BUG-02
**O bloqueio do PIN deixa-se contornar com pedidos em simultâneo**

| | |
|---|---|
| Severidade | MÉDIA · bug confirmado · problema técnico · MEDIDO |
| Local | `backend/routes/auth.js:162-216` (`POST /api/auth/bancada/entrar`) |
| Problema | O pedido lê o estado ("não está bloqueado"), compara o PIN (cerca de 250 ms de bcrypt) e só depois conta a falha. Pedidos que chegam ao mesmo tempo passam todos pela leitura antes de o bloqueio ser gravado, e **todos são comparados**. |
| Prova | `provas/pin-simultaneo.cjs`, com o limite de produção de 40 tentativas por IP em 15 minutos:<br>- **7 PINs errados seguidos**: correto (4 × "restam", depois bloqueado);<br>- **12 errados em simultâneo**: os 12 foram comparados;<br>- **19 errados e o certo em simultâneo**: os 20 foram comparados e **o certo entrou**, em 3 corridas de 3, apesar de 15 respostas "PIN errado 5 vezes". |
| Porque não é ALTA | É preciso o cookie de dispositivo da bancada, ou seja, estar no tablet. O limite de 40 tentativas por IP em 15 minutos continua a valer. O bloqueio por colaborador existia para travar quem tem o tablet na mão, e com isto deixa de travar. |
| Correção | Reservar a tentativa numa só instrução **antes** de comparar. Validado: com a correção, só 5 tentativas são comparadas, e as mensagens dos pedidos seguidos ficam iguais ([exemplo 15.1](#151-o-pin-reserva-a-tentativa-antes-de-a-comparar-bug-02)). |

### BUG-03
**Depois de "Desligar todos os tablets", Definições continua a dizer "Este dispositivo é a bancada"**

| | |
|---|---|
| Severidade | BAIXA · bug confirmado · problema técnico · MEDIDO |
| Local | `frontend/src/pages/Definicoes.jsx:120-127` |
| Problema | A API desliga todos os tablets, incluindo este (apaga o cookie), mas a função não atualiza a sessão da interface. |
| Prova | `provas/estado-antigo.mjs`: a API diz `bancada: null` e o ecrã continua a mostrar "Este dispositivo é a bancada da oficina." |
| Correção | Chamar o `atualizar()` da sessão depois do pedido (uma linha, validada: o ecrã passa a mostrar o estado certo). |

### Problemas potenciais

| ID | Problema | Tipo e severidade | Local | Correção |
|---|---|---|---|---|
| POT-01 | Um veículo pode ficar ligado a um cliente arquivado. O `confirmarCliente` verifica, e o `INSERT`/`UPDATE` é feito depois, sem repetir a condição. É o mesmo padrão da SEC-004 da auditoria | potencial · BAIXA · INFERIDO | `routes/veiculos.js:40-48`, `:153`, `:183` | pôr a condição no próprio `INSERT ... SELECT ... WHERE EXISTS` e ver se inseriu, como já faz o `POST /linhas` |
| POT-02 | Quando o `caminho` de um `useRecurso` muda, o ecrã continua a mostrar os dados do recurso anterior até chegar a resposta (`useRecurso.js:42-46`: "sem piscar"). Não encontrei nenhum percurso na interface que leve de uma folha diretamente a outra sem desmontar a página. Se passar a haver um, juntar isto ao BUG-01 escreve as notas da folha A na folha B | potencial · BAIXA · INFERIDO | `lib/useRecurso.js:42-46` | limpar os dados quando o caminho muda (exceto com `memoria`), ou `key={id}` nas páginas de detalhe |
| POT-03 | O quadro lê só as primeiras 200 folhas ativas e conta as luzes a partir delas. Com mais de 200 carros na oficina, as luzes contam a menos, sem aviso. Irreal numa oficina pequena | potencial · INFO · INFERIDO | `pages/Quadro.jsx:21` | a API já devolve `total`: avisar quando `total > itens.length` |
| POT-04 | Se a atualização automática falhar (sem rede), o quadro continua a mostrar os dados antigos sem aviso: o erro só aparece quando não há dados nenhuns | potencial · BAIXA · INFERIDO | `pages/Quadro.jsx:93`, e o mesmo nas outras páginas | um aviso discreto "sem ligação: dados de hh:mm". Junta-se à REL-003 da auditoria |
| POT-05 | Ao desligar a API, se o `fecharPool()` falhar dentro do `servidor.close`, a promessa rejeitada não é tratada | potencial · INFO · INFERIDO | `server.js:15-18` | `try/finally` à volta do `fecharPool()` |

> **Para aprender: estado copiado das props.** Em React, `useState(props.x)` **não** acompanha o `props.x`: o valor só conta na primeira vez. Há três saídas:
> 1. **Recriar o componente** quando os dados mudam (`key`). É simples, mas deita fora o que a pessoa estava a escrever.
> 2. **Guardar só as edições** e calcular o resto a partir das props. Foi a escolha no exemplo 15.2.
> 3. Um `useEffect` que copia as props para o estado. É a pior: cria duas fontes de verdade que se sincronizam tarde.
>
> **Como reconhecer**: um `useState(` cujo argumento vem de props ou de dados da API, num ecrã que se atualiza sozinho.

---

## 7. Segurança

A auditoria cobriu a segurança por fora (SEC-001 a SEC-008). Na leitura do código confirmei o que ela mediu:
- o que vem do pedido entra sempre no SQL como parâmetro. As interpolações no texto SQL são todas constantes do código: listas de colunas, o `SQL_TOTAIS`, o `selectVeiculo()`, a ordem (`ASC` ou `DESC`, escolhida numa lista fixa) e o `SET` do `PATCH` (montado a partir de uma lista fixa de colunas);
- não há `dangerouslySetInnerHTML`;
- os tokens não passam pelo JavaScript;
- as passwords têm limite de 72 bytes antes do bcrypt;
- não há segredos no código.

O que é novo:

| Achado | Severidade | Onde | O que fazer |
|---|---|---|---|
| [BUG-02](#bug-02): bloqueio do PIN com pedidos em simultâneo | MÉDIA | `routes/auth.js` | [exemplo 15.1](#151-o-pin-reserva-a-tentativa-antes-de-a-comparar-bug-02) |
| As linhas de reparação não têm `ID_Oficina`. A BD não garante que o colaborador de uma linha é da mesma oficina da folha. A API garante-o sempre (regra 2 do `AI.md`), mas a segunda linha de defesa que o esquema promete falha aqui | BAIXA ([DT-007](#dt-007)) | `schema.sql:175-192` | `ID_Oficina` na `Linha_Reparacao` e chaves compostas, com o sistema de migrações |
| `TRUST_PROXY` com um valor que não é número (por exemplo `true`) é ignorado sem aviso. Atrás de um proxy, os limites de pedidos passam a ver toda a gente com o mesmo IP. O `config.js` falha cedo para as outras variáveis, mas não para esta | BAIXA ([DT-011](#dt-011)) | `config.js:64` | validar e falhar no arranque, como já faz com o `JWT_SECRET` |
| `DB_TRUST_CERT` confia no certificado do SQL Server por omissão. Com a ligação encriptada, não se confirma o certificado | INFO | `config.js:50` | junta-se à SEC-007 da auditoria: em produção, `DB_TRUST_CERT=false` com um certificado válido |
| O backend não tem linter, nem no CI | BAIXA ([DT-005](#dt-005)) | `backend/package.json` | `oxlint` no backend, com o mesmo passo do CI do frontend |
| O `test/ajuda.js:121` tem uma password de teste escrita no código. Não é um segredo (contas descartáveis numa BD de testes), mas vai contra a lição do PR #3: a GitGuardian pode marcá-la numa mexida futura | INFO | `backend/test/ajuda.js:121` | gerar a password ao correr, como `credencialDeTeste()` nos scripts da auditoria |

---

## 8. Desempenho

**MEDIDO (na auditoria).** As duas consultas que pesam com 5 anos de dados fictícios estão descritas e medidas na PERF-001 e na PERF-002. Os números estão lá: histórico com 247 ms, quadro com 60 ms de CPU.

**INFERIDO (lido no código, não medido):**
- **O padrão da PERF-001 repete-se na lista de clientes (`clientes.js:52-66`).** A contagem de veículos (`OUTER APPLY`) e o `COUNT(*) OVER()` calculam-se para todos os clientes antes de escolher a página. Com 3 000 clientes, a pesquisa mediu-se na auditoria e está bem. A mesma correção (paginar primeiro) serve aqui.
- **A pesquisa pelo telefone (`clientes.js:64`) aplica `REPLACE` à coluna.** O índice não se usa e a tabela é lida toda. Com milhares de clientes está bem. Se crescer, guardar o telefone também sem espaços.
- **`POST /folhas-obra` insere as linhas uma a uma (`folhasObra.js:347-355`).** São até 50 idas à BD dentro da transação. Normalmente vêm 0 a 6 linhas, por isso não vale a pena mudar.
- **O `TecladoPin` volta a registar o `keydown` em cada renderização**, porque o `useEffect` não tem lista de dependências (`components/TecladoPin.jsx:17-25`). Custa nada, mas não é idiomático. O `useBloqueioPorInatividade` já usa o padrão certo, a ref com a última função.

**HIPÓTESE:**
- **A coluna calculada do [exemplo 15.3](#153-a-regra-do-dinheiro-num-só-sítio-dt-001) pode tornar as somas um pouco mais baratas**, porque deixa de haver multiplicações por linha em cada consulta.
- **Ocupa 9 bytes a mais por linha.** Não medi nenhum dos dois efeitos com a carga de 5 anos: fica NÃO VERIFICADO.

---

## 9. Testabilidade

**O que existe:**
- **52 testes do backend.** Correm contra um SQL Server a sério, e isso dá muita confiança. Um só ficheiro tem testes unitários (`validar.test.js`).
- **Nenhum teste do frontend** (AUT-001 da auditoria).

**O que é fácil de testar:**
- `lib/validar.js`, `lib/erros.js`, `lib/formatar.js` e `lib/texto.js` são funções puras;
- o `criarApp()` separado do `server.js` deixa arrancar a API numa porta livre;
- o `ClienteHttp` de `test/ajuda.js` é um bom "browser mínimo".

**O que é difícil, e porquê:**
- **As regras dentro dos handlers:** as credenciais dos colaboradores, o PIN e o "folha entregue só reabre com gestor" só se testam por HTTP com a BD. Cada ficheiro de testes recria a BD, o que torna os testes lentos e desencoraja escrever mais ([DT-003](#dt-003)).
- **Os componentes grandes do frontend** (`NovaEntrada`, `FormularioColaborador`) juntam estado, pedidos e desenho. Testar um passo obriga a montar o componente inteiro.

**Testes que faltam:** na [secção 17](#17-proteção-por-testes).

---

## 10. Acessibilidade

**O que está bem:**
- a auditoria mediu 0 violações do axe em 13 ecrãs e nos dois temas;
- o `jsx-a11y` só encontrou uma coisa. `autoFocus` em `NovaEntrada.jsx:78` é deliberado: o ecrã só serve para escrever a matrícula, e no tablet poupa um toque. Deve ficar, com um comentário a dizê-lo;
- os padrões são bons: etiqueta ligada ao campo, `aria-describedby` e `aria-invalid` (`Campo.jsx`), a cor nunca sozinha (`Estado.jsx`), um link para saltar para o conteúdo e as contagens do tablier para leitores de ecrã.

**Pontos a confirmar** (INFERIDOS; o leitor de ecrã ficou NÃO VERIFICADO na auditoria):

| Onde | O quê | Sugestão |
|---|---|---|
| `pages/Folha.jsx:192-212` (`SeletorEstado`) | `role="radiogroup"` e `role="radio"` em botões, sem navegação por setas. Quem usa um leitor de ecrã espera o comportamento de um grupo de rádios (setas, um só ponto de Tab) | ou implementar as setas com `tabIndex` móvel, ou usar botões com `aria-pressed` (como o tablier). **Resolvido a 30/09/2026**, no `harden` do seletor: passou a `role="group"` com botões `aria-pressed`. Continua por confirmar com um leitor de ecrã |
| `components/EscolherCliente.jsx:73-86` | o erro "escolhe um cliente" não está ligado ao campo de pesquisa (sem `aria-describedby` nem `aria-invalid`), ao contrário do `Campo` | usar o `Campo`, ou ligar os ids à mão |
| `components/Botao.jsx:46-71` (`BotaoConfirmar`) | o texto passa a "Remover?", mas a mudança pode não ser anunciada | `aria-live="polite"` numa região com a pergunta |
| `context/AvisosContext.jsx:23` | os avisos de erro também são `role="status"` (educados) | `role="alert"` para o tipo `erro` |

---

## 11. Frontend: estado, erros e experiência

**Pontos fortes:**
- Os estados que não são "tudo bem" (a carregar, vazio, erro) são componentes partilhados (`Situacoes.jsx`), usados em todas as páginas. Nunca fica um ecrã em branco.
- A memória do `useRecurso` limpa-se sempre que a sessão muda: num tablet partilhado, quem entra a seguir nunca vê os dados de quem saiu.
- Não há contas de dinheiro no JavaScript (procurei; a regra 4 do `AI.md` cumpre-se).

**A melhorar:**
- **Estado copiado dos dados do servidor:**
  - em `Notas` é o [BUG-01](#bug-01);
  - em `DadosOficina` (`Definicoes.jsx:31`) o padrão é o mesmo, mas os dados não se atualizam sozinhos, por isso hoje não perde nada.

  A regra a seguir é a do exemplo 15.2.
- **Os erros de atualização em segundo plano não se veem** ([POT-04](#problemas-potenciais)).
- **A mensagem geral de erro é tratada de duas formas.**
  - `Registar.jsx:85` mostra-a sempre, também quando há erros por campo.
  - Os outros formulários só a mostram quando não os há.
  - Pode ser de propósito, porque é um formulário comprido. Decidir e aplicar igual em todos.
- **Uma página depende de outra:** `Registar.jsx:8` importa o `PainelMarca` de `Entrar.jsx`. É um componente partilhado, e o sítio dele é `components/`.

---

## 12. Consistência

| Aspeto | Onde varia | Recomendação |
|---|---|---|
| Routers | fábricas em `auth.js` e `oficinas.js`; módulos nos outros | comentário em `app.js` a explicar porquê |
| Forma das respostas | `POST`/`PUT /veiculos` devolvem uma forma, e o `GET` outra ([DT-004](#dt-004)) | uma função de forma pública por recurso |
| Parâmetros da query | `Validador` no corpo do pedido; `Number.parseInt(...) \|\| null` nos filtros (`veiculos.js:89`, `folhasObra.js:139`), onde `"12abc"` passa como 12 | `new Validador(req.query).id('cliente', { obrigatorio: false })` |
| Campos fora do `Validador` | `removerPin` (`colaboradores.js:112`); a password e o PIN no login (`auth.js:50` e `:158-159`) | aceitável no login (não se aplicam as regras de força); o `removerPin` pode ir para um `v.booleano()` |
| Botão "a guardar" depois de gravar | uns formulários voltam a ligá-lo no `finally`; outros só no `catch` (o componente desaparece a seguir) | o `useEnvio` do [exemplo 15.4](#154-um-hook-para-o-ciclo-de-envio-dos-formulários-dt-008) põe tudo igual |
| Lint | o frontend tem, o backend não ([DT-005](#dt-005)) | o mesmo `oxlint` nos dois |
| Ficheiros do editor | `frontend/Projeto_final_UBI.code-workspace` (VS Code), de julho | passá-lo para a raiz ou para o `.gitignore` (preferência) |

---

## 13. Registo da dívida técnica

### DT-001
| | |
|---|---|
| Categoria | Duplicação · Arquitetura |
| Local | `routes/folhasObra.js` (9 vezes), `routes/veiculos.js:137`; o IVA em `folhasObra.js:22`, `:23` e `:238` |
| Severidade | MÉDIA |
| Problema atual | A regra "total da linha = quantidade × preço, arredondado ao cêntimo" está escrita 10 vezes; a do IVA, 3. O `AI.md` (regra 4) aponta para o `SQL_TOTAIS` como se fosse o único sítio. |
| Porque existe | As consultas foram escritas uma a uma, cada uma com o que precisava. |
| Impacto técnico | Uma mudança na regra (descontos, IVA por linha) obriga a encontrar todas as cópias. Se falhar uma, o histórico mostra um valor e a folha outro. |
| Impacto na manutenção | Quem acrescentar uma consulta nova tende a escrever uma 11.ª cópia. |
| Risco se ficar | Contas diferentes no mesmo ecrã. Num produto que mostra dinheiro, é o erro mais caro em confiança. |
| Recomendação | Coluna calculada `Total` na `Linha_Reparacao`: 10 cópias passam a 1, validado no [exemplo 15.3](#153-a-regra-do-dinheiro-num-só-sítio-dt-001). Para o IVA, uma vista `Folha_Totais` com o subtotal, o IVA e o total por folha. Atualizar a regra 4 do `AI.md`. |

### DT-002
| | |
|---|---|
| Categoria | Arquitetura (frontend) · Estado |
| Local | `pages/Folha.jsx:300-352`, `pages/Definicoes.jsx:31-45` |
| Severidade | ALTA (causa o [BUG-01](#bug-01)) |
| Problema atual | Formulários que copiam os dados do servidor para o estado local, num ecrã que se atualiza sozinho. |
| Porque existe | É o padrão mais comum nos tutoriais de formulários, e funciona enquanto só há um dispositivo. |
| Impacto técnico | Duas fontes de verdade, sincronizadas só na primeira renderização. |
| Impacto na manutenção | Cada formulário novo em cima de dados que se atualizam repete o erro. |
| Risco se ficar | Perda de texto escrito por outra pessoa, sem aviso. |
| Recomendação | Guardar só as edições e calcular o resto a partir dos dados do servidor ([exemplo 15.2](#152-as-notas-guardam-só-o-que-a-pessoa-mudou-bug-01)). Enviar só o que mudou, o que o `PATCH` da API já aceita. |

### DT-003
| | |
|---|---|
| Categoria | Testabilidade · Complexidade |
| Local | `routes/colaboradores.js:89-174`, `routes/auth.js:150-220`, `routes/folhasObra.js:368-433` |
| Severidade | MÉDIA |
| Problema atual | As regras de negócio vivem dentro dos handlers, misturadas com HTTP e SQL. O `PUT /colaboradores` tem complexidade 23. As regras do PIN estão em três sítios (formato em `auth.js` e `validar.js`; força em `validar.js` e `seed.js`). |
| Porque existe | Com uma API pequena, é o caminho mais direto, e as regras foram crescendo lá dentro. |
| Impacto técnico | Estas regras só se testam com a API e o SQL Server a correr. |
| Impacto na manutenção | As regras de acesso são das mais sensíveis da app e das mais difíceis de alterar com segurança. |
| Risco se ficar | Uma mudança numa regra de acesso sem teste unitário que a apanhe. |
| Recomendação | Extrair funções puras só para estas regras:<br>- `regrasDeAcesso(atual, pedido, eu)`, que devolve os erros por campo, se as credenciais mudam e o que gravar;<br>- `pinFraco(pin)`, exportada de `validar.js` e usada no seed.<br><br>Com testes unitários. O handler fica com o HTTP e o SQL. |

### DT-004
| | |
|---|---|
| Categoria | Manutenção · Acoplamento |
| Local | `routes/veiculos.js:170` e `:209` (formas diferentes do `GET`), `frontend/src/components/FormularioVeiculo.jsx:55`, `routes/oficinas.js:84` |
| Severidade | BAIXA |
| Problema atual | Cada endpoint monta o JSON à mão. O mesmo recurso tem formas diferentes consoante o endpoint, e o frontend compensa. |
| Porque existe | Não há tipos nem esquema da API. |
| Impacto técnico | Mudar uma resposta pode partir um ecrã sem nenhum aviso. |
| Impacto na manutenção | É preciso ler o código das rotas para saber que forma tem cada resposta. |
| Risco se ficar | Regressões silenciosas no frontend. |
| Recomendação | Uma função de forma pública por recurso, usada por todos os endpoints dele. O `respostaSessao` passa para `lib/sessao.js` e é usado também no registo. |

### DT-005
| | |
|---|---|
| Categoria | Processo · Qualidade |
| Local | `backend/package.json`, `.github/workflows/ci.yml` |
| Severidade | BAIXA |
| Problema atual | O backend não tem linter. O `// eslint-disable` de `middleware/erros.js:13` refere-se a um linter que não corre. |
| Porque existe | O lint foi configurado com o frontend novo. |
| Impacto técnico | Hoje o código está limpo: a medição com o ESLint deu 0 variáveis por usar. Mas nada o garante no próximo PR. |
| Risco se ficar | Erros que um linter apanhava (variáveis por usar, `==`, código morto) chegam ao `dev`. |
| Recomendação | `oxlint` no backend (é o do frontend: um só estilo), com `npm run lint` no passo "API" do CI. Custo: minutos. |

### DT-006
| | |
|---|---|
| Categoria | Documentação |
| Local | os 8 comentários históricos da [secção 4](#4-comentários) |
| Severidade | BAIXA |
| Problema atual | Comentários que contam como o código era antes. |
| Porque existe | O projeto foi refeito em setembro, e os comentários acompanharam a mudança. |
| Impacto na manutenção | Ruído para quem lê. Com o tempo, deixam de ser verdade. |
| Recomendação | Manter o porquê e tirar o "antes" ([exemplo 15.5](#155-um-comentário-histórico-passa-a-explicar-o-porquê-dt-006)). A história já está nos commits e no relatório. |

### DT-007
| | |
|---|---|
| Categoria | Segurança (defesa em profundidade) · Arquitetura de dados |
| Local | `backend/database/schema.sql:175-192` |
| Severidade | BAIXA |
| Problema atual | A `Linha_Reparacao` não tem `ID_Oficina`, por isso as chaves estrangeiras da linha não garantem a mesma oficina. O cabeçalho do esquema diz o contrário. |
| Porque existe | A linha pertence a uma folha e herda a oficina por ela. |
| Risco se ficar | Nenhum pela API atual (a autoria vem sempre da sessão). Se aparecer uma rota nova com um erro, a BD já não o trava. |
| Recomendação | `ID_Oficina` na linha, com chaves compostas para a `Folha_Obra` e o `Colaborador`. Fazer com o sistema de migrações. Até lá, corrigir o comentário do esquema. |

### DT-008
| | |
|---|---|
| Categoria | Duplicação (frontend) |
| Local | 10 formulários em 9 ficheiros (`setErros(err.campos \|\| {})`) |
| Severidade | BAIXA |
| Problema atual | Cada formulário repete três estados, o `try/catch/finally` e a expressão do erro geral. O botão volta a ligar-se de duas formas diferentes. |
| Recomendação | O hook `useEnvio` ([exemplo 15.4](#154-um-hook-para-o-ciclo-de-envio-dos-formulários-dt-008)). Migrar um formulário de cada vez, quando se mexer nele. |

### DT-009
| | |
|---|---|
| Categoria | Complexidade (frontend) |
| Local | `pages/NovaEntrada.jsx:21` (146 linhas), `pages/Equipa.jsx:96` (complexidade 27), `components/EscolherCliente.jsx:12` (três modos num componente) |
| Severidade | BAIXA |
| Recomendação | Um componente por passo em `NovaEntrada`, e o pai só guarda o passo e o veículo. Em `EscolherCliente`: `ClienteEscolhido`, `NovoCliente` e `ProcurarCliente`. Em `FormularioColaborador`: as etiquetas e os campos opcionais calculados por uma função pura (a mesma lógica de [DT-003](#dt-003), do lado da interface). |

### DT-010
| | |
|---|---|
| Categoria | Arquitetura · Concorrência |
| Local | todos os `PUT` e `PATCH` da API |
| Severidade | BAIXA (depois de corrigido o BUG-01) |
| Problema atual | Quando duas pessoas editam o mesmo campo ao mesmo tempo, fica a última a gravar, sem aviso. |
| Recomendação | Quando houver várias oficinas a usar a app a sério: uma coluna `rowversion` e um `If-Match` no pedido. Se a folha mudou entretanto, a API responde 409 ("esta folha mudou noutro dispositivo"). Hoje seria complexidade a mais. |

### DT-011
| | |
|---|---|
| Categoria | Configuração · Segurança |
| Local | `config.js:40`, `:44` e `:64` |
| Severidade | BAIXA |
| Problema atual | `PORT`, `DB_PORT` e `TRUST_PROXY` inválidos são ignorados sem aviso (`Number(...) \|\| omissão`). |
| Recomendação | Validar como as outras variáveis e falhar no arranque com uma mensagem clara. |

### DT-012
| | |
|---|---|
| Categoria | Duplicação entre camadas |
| Local | estados, tipos de veículo, categorias e cargos: `schema.sql` (`CHECK`), `routes/*.js` e `frontend/src/lib/formatar.js` |
| Severidade | INFO |
| Problema atual | Cada lista existe em três sítios. É aceitável, porque cada camada precisa dela e o frontend junta-lhe os nomes, mas nada garante que ficam iguais. |
| Recomendação | Um teste que compara as listas do backend com as do frontend. Não vale a pena partilhar código entre os dois só por isto. |

---

## 14. Plano de refatoração por fases

### Fase 1: baixo risco (dias)

| | |
|---|---|
| Objetivo | Corrigir os três bugs e tirar o ruído, sem mexer no esquema |
| Mudanças | 1. [BUG-01](#bug-01): exemplo 15.2.<br>2. [BUG-02](#bug-02): exemplo 15.1.<br>3. [BUG-03](#bug-03): uma linha.<br>4. Comentários históricos, enganadores e redundantes ([DT-006](#dt-006)).<br>5. `oxlint` no backend e no CI ([DT-005](#dt-005)).<br>6. Nomes: `confirmarDispositivo`, `exigirGestor`, `comEspera`.<br>7. `PainelMarca` para `components/`.<br>8. Constantes para os códigos de erro do SQL Server.<br>9. Validar `PORT`, `DB_PORT` e `TRUST_PROXY` ([DT-011](#dt-011)). |
| Dependências | nenhuma entre si: cada uma é um commit |
| Riscos | baixos. O único que muda comportamento de propósito é o PIN em simultâneo |
| Testes | os 52 testes; as provas da [secção 22](#22-como-repetir-as-provas) antes e depois; novos testes para os bugs ([secção 17](#17-proteção-por-testes)) |
| Como voltar atrás | `git revert` do commit em causa |

### Fase 2: risco médio (semanas)

| | |
|---|---|
| Objetivo | Regras num só sítio e fáceis de testar |
| Mudanças | 1. [DT-001](#dt-001): coluna calculada `Total` (exemplo 15.3) e, depois, a vista `Folha_Totais` para o IVA.<br>2. [DT-003](#dt-003): regras de acesso e do PIN em funções puras, com testes unitários.<br>3. [DT-009](#dt-009): dividir a `NovaEntrada`, o `EscolherCliente` e o `FormularioColaborador`.<br>4. [DT-004](#dt-004): uma forma pública por recurso.<br>5. [POT-01](#problemas-potenciais): condição dentro do `INSERT` e do `UPDATE` dos veículos.<br>6. [POT-02](#problemas-potenciais): `useRecurso` limpa os dados quando o caminho muda.<br>7. [DT-008](#dt-008): `useEnvio`, formulário a formulário.<br>8. Testes E2E da auditoria (AUT-001). |
| Dependências | a 1 muda o esquema: fazê-la **antes** de haver dados reais, ou depois do sistema de migrações. A 2 deve vir antes de qualquer mudança às regras de acesso |
| Riscos | médios. O esquema recria-se (`db:reset`) em desenvolvimento. Nas funções puras, o risco é mudar sem querer uma regra, e os testes atuais de colaboradores protegem isso |
| Testes | os 52 testes; `provas/totais.mjs` (valores iguais em todos os sítios); testes unitários novos das regras |
| Como voltar atrás | um commit por mudança. O esquema volta com o `schema.sql` anterior e `db:reset` (só em desenvolvimento) |

### Fase 3: risco maior (antes de publicar)

| | |
|---|---|
| Objetivo | Preparar a app para dados reais e várias oficinas |
| Mudanças | 1. Sistema de migrações (já no "Por fazer").<br>2. [DT-007](#dt-007): `ID_Oficina` nas linhas.<br>3. [DT-010](#dt-010): controlo de concorrência otimista (`rowversion` e 409).<br>4. Contrato da API (OpenAPI), se houver integrações (por exemplo, o programa de faturação). |
| Dependências | a 2 e a 3 dependem da 1 |
| Riscos | altos: mexem no esquema e em todos os endpoints de escrita |
| Testes | testes de migração (sobe e desce numa cópia dos dados); os 52; E2E |
| Como voltar atrás | migração inversa e cópia de segurança antes de cada migração |

---

## 15. Exemplos antes e depois (validados)

**Como foram validados.** Apliquei cada exemplo numa cópia descartável do projeto, com um repositório git próprio para o diff. A validação foi:
- **os 52 testes da API na cópia:** 52/52, com todas as mudanças juntas;
- **lint e build do frontend na cópia:** sem erros;
- **as provas da [secção 22](#22-como-repetir-as-provas)**, contra a API atual (porta 3000) e contra a cópia (porta 3002). A cópia usou uma base de dados própria, criada com o esquema novo.

O diff completo tem 8 ficheiros, com 96 linhas acrescentadas e 63 tiradas.

### 15.1 O PIN reserva a tentativa antes de a comparar (BUG-02)

**Antes** (`backend/routes/auth.js:187-216`, resumido):

```js
if (!(await confere(pin, colaborador.hash))) {
    // conta a falha numa só instrução (seguro mesmo com pedidos em
    // simultâneo). À quinta, bloqueia o PIN durante uns minutos
    const falha = await pool.request()
        /* ... */
        .query(`
            UPDATE Colaborador
            SET PIN_Falhas = CASE WHEN PIN_Falhas + 1 >= @tentativas THEN 0 ELSE PIN_Falhas + 1 END,
                PIN_Bloqueado_Ate = CASE WHEN PIN_Falhas + 1 >= @tentativas
                                         THEN DATEADD(MINUTE, @minutos, SYSUTCDATETIME())
                                         ELSE PIN_Bloqueado_Ate END
            OUTPUT INSERTED.PIN_Falhas AS falhas, INSERTED.PIN_Bloqueado_Ate AS bloqueadoAte
            WHERE ID_Colaborador = @id
        `);
    /* ... 429 à quinta, 401 com "restam N" antes ... */
}
if (colaborador.falhas > 0) { /* repõe PIN_Falhas = 0 */ }
```

**Depois:**

```js
// reserva a tentativa antes de comparar o PIN, numa só instrução. Com
// pedidos em simultâneo, só as 5 primeiras reservas passam; as outras
// encontram o PIN já bloqueado e nem chegam a ser comparadas
const reserva = await pool.request()
    .input('id', sql.Int, colaborador.id)
    .input('tentativas', sql.Int, TENTATIVAS_PIN)
    .input('minutos', sql.Int, MINUTOS_BLOQUEIO_PIN)
    .query(`
        UPDATE Colaborador
        SET PIN_Falhas = CASE WHEN PIN_Falhas + 1 >= @tentativas THEN 0 ELSE PIN_Falhas + 1 END,
            PIN_Bloqueado_Ate = CASE WHEN PIN_Falhas + 1 >= @tentativas
                                     THEN DATEADD(MINUTE, @minutos, SYSUTCDATETIME())
                                     ELSE PIN_Bloqueado_Ate END
        OUTPUT INSERTED.PIN_Falhas AS falhas, INSERTED.PIN_Bloqueado_Ate AS bloqueadoAte
        WHERE ID_Colaborador = @id
          AND (PIN_Bloqueado_Ate IS NULL OR PIN_Bloqueado_Ate <= SYSUTCDATETIME())
    `);
if (reserva.recordset.length === 0) {
    throw new ErroHttp(429, `PIN bloqueado depois de várias tentativas erradas. Tenta outra vez daqui a ${MINUTOS_BLOQUEIO_PIN} min.`);
}

if (!(await confere(pin, colaborador.hash))) {
    const { falhas, bloqueadoAte } = reserva.recordset[0];
    if (bloqueadoAte && bloqueadoAte.getTime() > Date.now()) {
        throw new ErroHttp(429, `PIN errado ${TENTATIVAS_PIN} vezes. Fica bloqueado durante ${MINUTOS_BLOQUEIO_PIN} minutos.`);
    }
    const restam = TENTATIVAS_PIN - falhas;
    throw new ErroHttp(401, `PIN incorreto. ${restam === 1 ? 'Resta 1 tentativa' : `Restam ${restam} tentativas`}.`);
}

// PIN certo: a tentativa reservada não conta
await pool.request()
    .input('id', sql.Int, colaborador.id)
    .query('UPDATE Colaborador SET PIN_Falhas = 0, PIN_Bloqueado_Ate = NULL WHERE ID_Colaborador = @id');
```

(E a coluna `c.PIN_Falhas AS falhas` sai do `SELECT` do início, porque deixou de ser usada.)

- **O que mudou**:
  - a tentativa conta-se **antes** do bcrypt, com a condição "não está bloqueado" dentro do próprio `UPDATE`;
  - com o PIN certo, repõe-se o contador.
- **Porquê**: o `UPDATE` bloqueia a linha do colaborador. Pedidos em simultâneo passam por ele um de cada vez, e o sexto já encontra o PIN bloqueado.
- **Benefício**: só 5 tentativas são comparadas, venham como vierem.
- **Risco**:
  - baixo;
  - um `UPDATE` a mais em cada entrada certa (antes só acontecia se houvesse falhas);
  - com o PIN certo à quinta tentativa, o bloqueio é gravado e logo retirado, e a pessoa entra, tal como antes.
- **Comportamento preservado**: **SIM** para quem tenta um de cada vez. As mesmas mensagens, pela mesma ordem, em 3 corridas: 4 × "Restam...", "PIN errado 5 vezes", 2 × "PIN bloqueado". Muda **de propósito** com pedidos em simultâneo:

| Prova (`pin-simultaneo.cjs`) | Antes | Depois (3 corridas) |
|---|---|---|
| 12 errados em simultâneo | 12 comparados | **5** comparados, 7 bloqueados sem comparar |
| 19 errados e o certo em simultâneo | 20 comparados, **o certo entrou** | **5** comparados; o certo, fora dos 5 primeiros, não entrou |

### 15.2 As notas guardam só o que a pessoa mudou (BUG-01)

**Antes** (`frontend/src/pages/Folha.jsx:300-332`, resumido):

```jsx
const [notas, setNotas] = useState({
  kmsEntrada: folha.kmsEntrada ?? '',
  observacoes: folha.observacoes ?? '',
  conselhos: folha.conselhos ?? '',
});
const mudou = String(notas.kmsEntrada) !== String(folha.kmsEntrada ?? '') ||
  notas.observacoes !== (folha.observacoes ?? '') || notas.conselhos !== (folha.conselhos ?? '');
// ...
aoGuardar(await api.patch(`/folhas-obra/${folha.id}`, {
  kmsEntrada: /* ... */, observacoes: notas.observacoes, conselhos: notas.conselhos,
}));
// ... e cada campo: onChange={(e) => setNotas({ ...notas, observacoes: e.target.value })}
```

**Depois:**

```jsx
// só se guarda o que a pessoa mudou neste ecrã. O resto vem sempre da folha,
// que se atualiza sozinha: o que um colega gravou noutro dispositivo aparece
// aqui e nunca é apagado por valores antigos
const [editadas, setEditadas] = useState({});
const notas = {
  kmsEntrada: folha.kmsEntrada ?? '',
  observacoes: folha.observacoes ?? '',
  conselhos: folha.conselhos ?? '',
  ...editadas,
};
const mudou = Object.keys(editadas).length > 0;
const editar = (campo) => (ev) => setEditadas((e) => ({ ...e, [campo]: ev.target.value }));

async function guardar(ev) {
  ev.preventDefault();
  // ... (os mesmos estados de "a guardar" e de erro)
  const corpo = { ...editadas };
  if ('kmsEntrada' in corpo) {
    corpo.kmsEntrada = corpo.kmsEntrada === '' ? null : String(corpo.kmsEntrada).replace(/\s|\./g, '');
  }
  aoGuardar(await api.patch(`/folhas-obra/${folha.id}`, corpo));
  setEditadas({});
  // ...
}
// ... e cada campo: onChange={editar('observacoes')}
```

- **O que mudou**:
  - o estado guarda **só as edições**;
  - o que aparece no ecrã é "dados do servidor + edições";
  - o `PATCH` leva só os campos editados.
- **Porquê**:
  - acaba a segunda fonte de verdade;
  - o `PATCH` da API já aceitava campos soltos ("só muda o que vier no pedido").
- **Benefício**:
  - os campos em que ninguém mexeu acompanham a atualização automática;
  - guardar um campo nunca apaga os outros.
- **Risco**:
  - baixo;
  - se duas pessoas mexerem **no mesmo campo**, fica a última, como em qualquer app sem controlo de concorrência ([DT-010](#dt-010)).
- **Comportamento preservado**: **SIM** para uma pessoa só. Muda de propósito com dois dispositivos:

| Prova (`estado-antigo.mjs`) | Antes | Depois |
|---|---|---|
| O tablet mostra, depois de atualizar | o texto antigo | **o texto novo do gestor** |
| "Guardar notas" ativo sem ninguém mexer | sim | **não** |
| As observações depois de o tablet guardar um conselho | voltaram ao texto antigo (a nota do gestor perdeu-se) | **ficaram as do gestor** |
| Os conselhos gravados pelo tablet | gravados | gravados |

### 15.3 A regra do dinheiro num só sítio (DT-001)

**Antes**: 10 cópias, por exemplo (`routes/folhasObra.js:26-29`):

```sql
SELECT ISNULL(SUM(ROUND(l.Quantidade * l.Valor_Unitario, 2)), 0) AS subtotal,
       ISNULL(SUM(CASE WHEN l.Categoria = 'peca' THEN ROUND(l.Quantidade * l.Valor_Unitario, 2) END), 0) AS pecas,
       -- ... e mais 7 cópias em folhasObra.js e 1 em veiculos.js
```

**Depois**: uma só, no esquema (`schema.sql`, tabela `Linha_Reparacao`):

```sql
  -- a regra do dinheiro vive aqui, num só sítio: cada linha arredondada ao cêntimo.
  -- Todas as somas (folha, histórico, resumo) usam esta coluna
  Total               AS ROUND(Quantidade * Valor_Unitario, 2) PERSISTED,
```

```sql
-- o índice das linhas passa a incluir o Total
CREATE INDEX IX_Linha_Folha ON Linha_Reparacao (ID_Folha) INCLUDE (Categoria, Quantidade, Valor_Unitario, Total);
```

E as 10 consultas passam a ler a coluna:

```sql
SELECT ISNULL(SUM(l.Total), 0) AS subtotal,
       ISNULL(SUM(CASE WHEN l.Categoria = 'peca' THEN l.Total END), 0) AS pecas,
       -- ...
```

- **O que mudou**:
  - uma coluna calculada e guardada (`PERSISTED`);
  - 10 substituições em 2 ficheiros;
  - o índice das linhas passa a incluir a coluna.
- **Porquê**: a BD é o único sítio onde todas as consultas passam. A regra fica ao lado dos dados, e uma consulta nova não a consegue escrever de outra forma.
- **Benefício**: 10 cópias passam a 1. A regra 4 do `AI.md` passa a apontar para a coluna.
- **Risco**:
  - médio, porque muda o esquema;
  - hoje o esquema recria-se (`db:reset`) e não há dados reais: **é o momento mais barato para o fazer**;
  - com dados reais, precisa de uma migração (`ALTER TABLE ... ADD Total AS ... PERSISTED`).
- **Comportamento preservado**: **SIM**, MEDIDO:
  - os 52 testes passam, incluindo o dos totais e do IVA ao cêntimo;
  - `provas/totais.mjs` dá os **mesmos valores** antes e depois nos seis sítios que calculavam o total. O arredondamento também bate certo: 0,33 × 3,33 = 1,10.

| Onde | Antes | Depois |
|---|---|---|
| Linhas da folha | 59,97 · 19,25 · 1,10 | 59,97 · 19,25 · 1,10 |
| Totais (subtotal · IVA · total) | 80,32 · 18,47 · 98,79 | 80,32 · 18,47 · 98,79 |
| Lista, histórico do veículo e resumo do gestor | 80,32 | 80,32 |

**O que falta:** o IVA continua em 3 sítios. A proposta é uma vista `Folha_Totais` (ver [DT-001](#dt-001)), que não validei.

### 15.4 Um hook para o ciclo de envio dos formulários (DT-008)

**Antes** (`frontend/src/components/FormularioCliente.jsx:17-36`):

```jsx
const [aGuardar, setAGuardar] = useState(false);
const [erro, setErro] = useState(null);
const [erros, setErros] = useState({});

async function submeter(ev) {
  ev.preventDefault();
  setAGuardar(true);
  setErro(null);
  setErros({});
  try {
    const gravado = inicial.id ? await api.put(`/clientes/${inicial.id}`, c) : await api.post('/clientes', c);
    aoGuardar(gravado);
  } catch (err) {
    setErro(err.message);
    setErros(err.campos || {});
  } finally {
    setAGuardar(false);
  }
}
// ...
<ErroFormulario erro={erro && !Object.keys(erros).length ? erro : null} />
```

**Depois**: um hook novo, `frontend/src/lib/useEnvio.js`:

```js
import { useState } from 'react';

// o ciclo de um formulário que grava na API: "a guardar", erro geral e
// erros por campo, sempre da mesma maneira
export function useEnvio() {
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState(null);
  const [erros, setErros] = useState({});

  // corre `acao` e diz se correu bem: { ok: true, dados } ou { ok: false }
  async function enviar(acao) {
    setAGuardar(true);
    setErro(null);
    setErros({});
    try {
      return { ok: true, dados: await acao() };
    } catch (err) {
      setErro(err.message);
      setErros(err.campos || {});
      return { ok: false };
    } finally {
      setAGuardar(false);
    }
  }

  // a mensagem geral só aparece quando não há erros junto aos campos
  const erroGeral = erro && Object.keys(erros).length === 0 ? erro : null;
  return { enviar, aGuardar, erros, erroGeral };
}
```

E o formulário fica com:

```jsx
const { enviar, aGuardar, erros, erroGeral } = useEnvio();

async function submeter(ev) {
  ev.preventDefault();
  const resposta = await enviar(() => (inicial.id ? api.put(`/clientes/${inicial.id}`, c) : api.post('/clientes', c)));
  if (resposta.ok) aoGuardar(resposta.dados);
}
// ...
<ErroFormulario erro={erroGeral} />
```

- **O que mudou**: três estados, o `try/catch/finally` e a regra do erro geral passam para um sítio só.
- **Porquê**: a regra "o erro geral só aparece sem erros de campo" estava escrita em cada formulário, e o botão voltava a ligar-se de duas formas.
- **Benefício**:
  - cerca de 10 linhas a menos por formulário;
  - todos os formulários passam a comportar-se igual.
- **Risco**: baixo. O `{ ok, dados }` é explícito de propósito, porque um `DELETE` com resposta 204 devolve `null`, e isso não pode querer dizer "falhou".
- **Comportamento preservado**: **SIM**, MEDIDO. `provas/formulario-cliente.mjs` dá o mesmo resultado antes e depois:
  - vazio: dois "Campo obrigatório." e nenhum erro geral;
  - NIF errado: "NIF inválido. Confirma os 9 dígitos.";
  - válido: vai para `/clientes/:id` com o aviso "Cliente criado.".

  Nesta validação só migrei o `FormularioCliente`.

### 15.5 Um comentário histórico passa a explicar o porquê (DT-006)

Só texto: não muda comportamento e não precisa de validação.

**Antes** (`backend/routes/veiculos.js:7-9`):

```js
// antes só existiam autocaravanas. Agora qualquer oficina regista qualquer
// veículo; as autocaravanas continuam a guardar à parte a marca da célula
// habitacional (a marca/modelo "normais" são os do chassis)
```

**Depois:**

```js
// qualquer tipo de veículo. Nas autocaravanas, a marca e o modelo são os do
// chassis e a marca da célula habitacional guarda-se à parte (têm fornecedores
// diferentes)
```

---

## 16. Plano ficheiro a ficheiro

| Ficheiro | Mudança | Porquê | Risco | Testes |
|---|---|---|---|---|
| `frontend/src/pages/Folha.jsx` | `Notas` com edições apenas (15.2) | BUG-01 | BAIXO | `estado-antigo.mjs`; teste E2E de dois dispositivos |
| `backend/routes/auth.js` | reserva da tentativa (15.1); `respostaSessao` para `lib/sessao.js` | BUG-02, DT-004 | BAIXO | 52; `pin-simultaneo.cjs`; teste novo de PIN em simultâneo |
| `frontend/src/pages/Definicoes.jsx` | `await atualizar()` depois de desligar os tablets | BUG-03 | BAIXO | `estado-antigo.mjs` |
| `backend/database/schema.sql` | coluna `Total` (15.3); corrigir o comentário do cabeçalho; mais tarde, `ID_Oficina` nas linhas | DT-001, DT-007 | MÉDIO | 52; `totais.mjs` |
| `backend/routes/folhasObra.js`, `veiculos.js` | ler `l.Total`; `veiculos` com a condição dentro do `INSERT`/`UPDATE`; parâmetros da query pelo `Validador` | DT-001, POT-01 | MÉDIO | 52; `totais.mjs`; teste do cliente arquivado |
| `backend/routes/colaboradores.js` + `lib/acessos.js` (novo) | regras de acesso numa função pura | DT-003 | MÉDIO | 52 e testes unitários novos |
| `backend/lib/validar.js`, `scripts/seed.js` | `pinFraco()` exportada e usada no seed | DT-003 | BAIXO | `validar.test.js` |
| `backend/lib/erros.js`, `middleware/erros.js` | constantes para os códigos de erro do SQL Server | duplicação | BAIXO | 52 |
| `backend/config.js` | validar `PORT`, `DB_PORT` e `TRUST_PROXY` | DT-011 | BAIXO | teste de arranque com valores errados |
| `backend/package.json`, `.github/workflows/ci.yml` | `oxlint` no backend | DT-005 | BAIXO | o próprio CI |
| os comentários da secção 4 | tirar o "antes", corrigir os enganadores e o redundante | DT-006 | NENHUM | nenhum |
| `frontend/src/lib/useEnvio.js` (novo) e os 9 formulários | ciclo de envio partilhado (15.4) | DT-008 | BAIXO | lint e build; E2E |
| `frontend/src/pages/NovaEntrada.jsx`, `Equipa.jsx`, `components/EscolherCliente.jsx` | dividir em componentes mais pequenos | DT-009 | MÉDIO | E2E (percurso 1 da auditoria) |
| `frontend/src/lib/useRecurso.js` | limpar os dados ao mudar de caminho | POT-02 | MÉDIO (todas as páginas o usam) | E2E; ver o quadro com a rede lenta |
| `frontend/src/pages/Registar.jsx`, `Entrar.jsx` | `PainelMarca` para `components/` | estrutura | BAIXO | build |

**Ficheiros que não devem mudar** (sem uma razão nova):
- **`lib/validar.js`**: a estrutura está boa. A repetição "campo obrigatório" é de propósito.
- **`db.js`**, **`middleware/seguranca.js`** (CSRF e limites) e **`lib/sessao.js`**: pequenos, corretos e já testados.
- **`components/Luzes.jsx`**, **`styles/tokens.css`** e **`components/icones.js`** (este é gerado).
- **Os testes existentes**: só se acrescentam. Mudar um teste para fazer passar uma refatoração é sinal de que o comportamento mudou.

---

## 17. Proteção por testes

Antes das fases 2 e 3, estes testes devem existir. Cada um protege um comportamento que hoje ninguém verifica automaticamente.

| Lacuna | Teste recomendado | Porquê |
|---|---|---|
| PIN em simultâneo | em `bancada.test.js`, 20 tentativas em `Promise.all`, uma delas certa: no máximo 5 comparadas | é o [BUG-02](#bug-02). Sem este teste, pode voltar numa refatoração do login |
| Duas pessoas na mesma folha | E2E com dois contextos do browser: A grava as observações, B atualiza e grava um conselho, e as observações de A ficam | é o [BUG-01](#bug-01). Só um teste com dois dispositivos o apanha |
| Regras de acesso dos colaboradores | unitários da função pura ([DT-003](#dt-003)): gestor sem email, mecânico sem PIN nem email, mudar de email sem password, retirar o próprio cargo, remover o PIN a quem não tem email | são as regras mais sensíveis, e hoje só se testam por HTTP |
| Veículo com cliente arquivado | `POST /veiculos` para um cliente arquivado dá 400 | [POT-01](#problemas-potenciais) |
| `PUT /api/veiculos/:id` | já apontado na AUT-002 da auditoria | não tem teste nenhum |
| A regra do dinheiro | depois da coluna `Total`: uma linha com 0,33 × 3,33 dá 1,10 em todos os endpoints que a mostram | é o que o `totais.mjs` faz à mão |
| Listas iguais entre camadas | as listas de estados, tipos, categorias e cargos do backend são iguais às do frontend e aos `CHECK` do esquema | [DT-012](#dt-012) |
| Mudar de caminho no `useRecurso` | não mostra dados de outro recurso | [POT-02](#problemas-potenciais) |
| Percursos completos | os 4 percursos E2E da secção 9.3 da auditoria | AUT-001 |

---

## 18. Avaliação final

**Legibilidade.** Boa:
- nomes do domínio, funções curtas na maioria;
- ficheiros com uma responsabilidade;
- quem conhece a oficina percebe o código.

As exceções são poucas e estão identificadas: o `PUT /colaboradores`, o `FormularioColaborador` e a `NovaEntrada`.

**Manutenção.** Boa, com duas dívidas a pagar antes de crescer:
- a regra do dinheiro repetida ([DT-001](#dt-001));
- os formulários que copiam dados do servidor ([DT-002](#dt-002)).

O resto (comentários históricos, nomes) é limpeza.

**Arquitetura.** Adequada ao tamanho do projeto: camadas claras, sem ciclos, infraestrutura partilhada num sítio só. Não tem camadas a mais, e está bem assim. O que falta é:
- tirar as regras de negócio dos handlers ([DT-003](#dt-003));
- ter contratos de API explícitos ([DT-004](#dt-004)).

**Comentários.** O ponto mais forte do código: explicam o porquê, as regras e as decisões. Há 8 históricos, 2 enganadores e 1 redundante a corrigir.

**Segurança.** Pensada em camadas e confirmada por medição (auditoria) e por leitura (esta revisão). Há um bug de concorrência no bloqueio do PIN ([BUG-02](#bug-02)) e uma lacuna de defesa em profundidade no esquema ([DT-007](#dt-007)).

**Desempenho.** Medido na auditoria: aceitável com 5 anos de dados. As duas consultas a melhorar (PERF-001/002) estão identificadas, e o mesmo padrão aparece na lista de clientes.

**Testabilidade.**
- No backend é boa, com testes de integração contra SQL Server real e 93% de cobertura.
- As regras dentro dos handlers só se testam por HTTP.
- O frontend não tem testes.

**Acessibilidade.** Boa nos padrões (etiquetas, erros ligados, cor nunca sozinha) e medida com o axe. Falta confirmar com um leitor de ecrã o seletor de estado e o botão de confirmar.

**Principais problemas:**
1. [BUG-01](#bug-01): as notas apagam o que um colega gravou (ALTA).
2. [BUG-02](#bug-02): o bloqueio do PIN deixa-se contornar em simultâneo (MÉDIA).
3. [DT-001](#dt-001): a regra do dinheiro em 10 sítios.
4. [DT-003](#dt-003): as regras de acesso dentro dos handlers, sem testes unitários.
5. O frontend sem testes (AUT-001 da auditoria).

**Principais pontos fortes:**
1. Isolamento entre oficinas em três camadas: sessão, `WHERE` e chaves compostas.
2. Contas em SQL com `DECIMAL`, sem vírgula flutuante (a regra existe; falta juntar as cópias).
3. Comentários que explicam o porquê.
4. Validação e erros centralizados, com mensagens em português para o utilizador.
5. Estados de carregamento, vazio e erro em todos os ecrãs.
6. Simplicidade deliberada: sem ORM, sem biblioteca de estado, um hook de dados com 72 linhas.

---

## 19. Checklists

### Revisão

| Item | Resultado | Porquê |
|---|---|---|
| Código fácil de ler | PASSA | nomes do domínio, funções curtas, comentários do porquê |
| Nomes claros | PASSA | exceções pequenas: `aCarregar` com dois sentidos, `dispositivoValido` com efeito lateral |
| Funções com responsabilidade focada | PRECISA DE MELHORAR | o `PUT /colaboradores` tem seis responsabilidades; a `NovaEntrada` tem três passos num componente |
| Pouca duplicação | PRECISA DE MELHORAR | a medida é baixa (2,7%), mas a que existe é de regras: o dinheiro 10 vezes, o PIN em 3 sítios |
| Complexidade controlada | PASSA | só duas funções com complexidade alta de lógica (23 e 27); o resto são estados de ecrã |
| Comentários úteis | PASSA | há 8 históricos, 2 enganadores e 1 redundante a corrigir |
| Arquitetura organizada | PASSA | camadas claras, 0 ciclos, infraestrutura num sítio só |
| Tratamento de erros adequado | PASSA | `ErroHttp`, um middleware central, JSON igual em toda a API; falha só a atualização em segundo plano, que não mostra erros (POT-04) |
| Segurança considerada | PASSA | em camadas e medida; corrigir o BUG-02 |
| Desempenho aceitável | PASSA | medido com 5 anos de dados na auditoria |
| Testável | PRECISA DE MELHORAR | o frontend não tem testes; as regras de negócio só se testam por HTTP |
| Acessível | PASSA | 0 violações do axe; leitor de ecrã por confirmar |
| Responsivo | PASSA | 4 larguras medidas na auditoria; um transbordo menor (QA-003) |
| Fácil de manter | PASSA | com DT-001 e DT-002 para pagar antes de crescer |
| Preparado para crescer | PRECISA DE MELHORAR | sem migrações, sem controlo de concorrência, contratos de API implícitos, quadro limitado a 200 folhas |

### Refatoração

Aplica-se às mudanças validadas na cópia (secção 15).

| Item | Resultado | Porquê |
|---|---|---|
| Comportamento preservado | PASSA | 52/52; mensagens do PIN seguido iguais; totais iguais em 6 sítios; formulário igual. As duas mudanças de comportamento (PIN em simultâneo e notas) são as correções |
| Sem reescritas desnecessárias | PASSA | 8 ficheiros, 96 linhas acrescentadas e 63 tiradas |
| Sem dependências novas | PASSA | nenhuma |
| Nomes melhorados onde era preciso | PRECISA DE REVISÃO | as mudanças de nome propostas (secção 3.1) não foram aplicadas na cópia |
| Funções com tamanho adequado | PRECISA DE REVISÃO | o `PUT /colaboradores` e a `NovaEntrada` ficam para a fase 2 |
| Responsabilidades claras | PASSA | nas partes mudadas |
| Duplicação reduzida | PASSA | a regra do dinheiro passou de 10 para 1; formulários: 1 de 10 migrado |
| Complexidade reduzida onde se justifica | PASSA | o `FormularioCliente` ficou com 11 linhas a menos |
| Arquitetura coerente | PASSA | a regra do dinheiro passou para a camada onde estão os dados |
| Tratamento de erros correto | PASSA | as mesmas mensagens; mais um 429 no caso em simultâneo |
| Comportamento assíncrono correto | PASSA | a reserva do PIN é atómica, provado com pedidos em simultâneo |
| Segurança considerada | PASSA | o bloqueio do PIN passa a aguentar pedidos em simultâneo |
| Desempenho considerado | PRECISA DE REVISÃO | um `UPDATE` a mais por cada entrada com PIN, e mais 9 bytes por linha: não medi com a carga de 5 anos |
| Testes atualizados | PRECISA DE REVISÃO | a validação usou provas em scripts. Os testes automáticos novos (secção 17) ainda não existem |
| Documentação atualizada | PRECISA DE REVISÃO | a regra 4 do `AI.md` tem de passar a apontar para a coluna `Total` quando esta entrar |

---

## 20. Relatório final

**Sumário.** O código da Bancada é limpo, legível e seguro, e a arquitetura é a certa para o tamanho do projeto. A revisão encontrou três bugs que os testes e a auditoria não apanharam, porque só aparecem com dois dispositivos ou pedidos em simultâneo. Um deles perde texto escrito por pessoas. Encontrou também uma regra de dinheiro repetida em dez sítios. As correções foram aplicadas numa cópia e validadas; nenhum código do projeto mudou.

**Maiores problemas.** Ver a lista da [secção 18](#18-avaliação-final).

**Dívida técnica.** 12 itens ([secção 13](#13-registo-da-dívida-técnica)):
- uma ALTA (DT-002);
- duas MÉDIAS (DT-001 e DT-003);
- o resto BAIXA ou INFO.

**Prioridades de refatoração.** Pela ordem da [secção 14](#14-plano-de-refatoração-por-fases):
1. os três bugs;
2. o lint do backend;
3. o dinheiro num só sítio, antes de haver dados reais;
4. as regras de acesso em funções puras;
5. os testes E2E.

**Melhorias de baixo risco.** A fase 1 inteira: os três bugs, os comentários, o lint, os nomes, o `PainelMarca`, as constantes do SQL Server e a configuração.

**Melhorias de risco maior.** As migrações, o `ID_Oficina` nas linhas e o controlo de concorrência otimista (fase 3), antes de publicar.

**Testes necessários.** [Secção 17](#17-proteção-por-testes). O mais urgente é o teste E2E de dois dispositivos, que protege o BUG-01.

**Segurança.** O BUG-02, a lacuna das linhas sem oficina e a configuração que falha em silêncio ([secção 7](#7-segurança)).

**Desempenho.** Nada novo que precise de medida urgente. A PERF-001 da auditoria aplica-se também à lista de clientes.

**Arquitetura.** Não acrescentar camadas. Tirar as regras dos handlers só onde há regras. Pôr as respostas numa forma por recurso.

**Ficheiros que devem mudar, e os que não devem.** [Secção 16](#16-plano-ficheiro-a-ficheiro).

**Próximo passo recomendado.** Corrigir o BUG-01, com o teste E2E de dois dispositivos. É o único problema que faz perder dados, a correção tem 18 linhas novas e já está validada.

---

## 21. Para aprenderes com esta revisão

### Como um sénior leria estes resultados

1. **Os bugs mais graves estavam entre dois pedidos, não dentro de um.** Os 52 testes e a auditoria testaram uma coisa de cada vez. Os três bugs desta revisão só aparecem com dois dispositivos ou pedidos em simultâneo. Num sistema que existe para ser usado por várias pessoas ao mesmo tempo, esses testes são os que contam.
2. **A duplicação que importa não é a que as ferramentas medem.** O jscpd deu 2,7%, um número ótimo. Mesmo assim, a regra mais importante da app (o dinheiro) estava em dez sítios, com textos ligeiramente diferentes que a ferramenta não juntou.
3. **Simples não é o mesmo que fácil de mudar.** Não ter camada de serviços é simples e está certo aqui. Mas as regras de acesso dentro dos handlers são difíceis de mudar com segurança. A resposta não é "mais camadas": é tirar das rotas **só** o que é regra de negócio.
4. **Uma correção sem prova é uma opinião.** Cada exemplo da secção 15 tem um "antes" e um "depois" medidos. Faz o mesmo nas tuas correções: primeiro reproduz o problema, depois mostra que desapareceu.

### Exercícios

Faz estes sozinho, antes de pedir ajuda a qualquer IA. O objetivo é conseguires explicá-los na defesa.

1. **O BUG-01 à mão.**
   - Abre a mesma folha em dois browsers, com sessões diferentes.
   - Muda as observações num deles e espera 30 segundos no outro.
   - Explica, em três frases, porque é que o campo não muda. Depois lê, na documentação do React (react.dev), as páginas "Preserving and Resetting State" e "You Might Not Need an Effect", e compara as três soluções da caixa da [secção 6](#6-bugs-e-problemas-de-lógica).
2. **O BUG-02 com números.** Porque é que "contar a falha numa só instrução" (o que o código já fazia) não chega? Desenha numa folha a linha do tempo de três pedidos em simultâneo, antes e depois do exemplo 15.1.
3. **A primeira função pura.** Tira do `PUT /colaboradores` a decisão "as credenciais mudaram?" para uma função em `lib/`, sem base de dados. Escreve 5 testes unitários para ela e corre-os sem o SQL Server.
4. **O IVA num só sítio.** O exemplo 15.3 tratou o total das linhas; o IVA continua em 3 sítios. Escolhe entre uma vista e uma função do SQL Server e justifica a escolha em três frases.
5. **Três comentários.** Reescreve três dos comentários históricos da [secção 4](#4-comentários), deixando só o porquê.

### Perguntas que o júri pode fazer

| Pergunta | Onde está a resposta |
|---|---|
| Que qualidade tem o teu código e como a mediste? | [secção 2](#2-medições): complexidade, duplicação, ciclos, hooks e cobertura, cada um com a ferramenta |
| O que é dívida técnica no teu projeto? | [secção 13](#13-registo-da-dívida-técnica): DT-001 e DT-002 são os bons exemplos |
| O que acontece se duas pessoas mexerem na mesma folha? | [BUG-01](#bug-01) e o exemplo 15.2; depois, o [DT-010](#dt-010) |
| Porque é que a regra do dinheiro está na base de dados? | [DT-001](#dt-001), [exemplo 15.3](#153-a-regra-do-dinheiro-num-só-sítio-dt-001) e a regra 4 do `AI.md` |
| Porque é que não usaste uma camada de serviços, um ORM ou o React Query? | [secção 5.1](#51-como-está): o tamanho do projeto e a opção pela simplicidade |

---

## 22. Como repetir as provas

As provas estão em [`revisao-codigo/provas/`](revisao-codigo/provas/). Criam oficinas, clientes, veículos e folhas **fictícios**. **Só contra uma instância local.** As passwords das contas de teste são geradas ao correr.

```bash
# dependência dos testes no browser (fora do package.json do projeto)
cd docs/revisao-codigo/provas && npm install --no-save playwright

# BUG-02: usa a BD de testes (Bancada_Teste, apagada e criada de novo);
# precisa de DB_ADMIN_PASSWORD e DB_PASSWORD, como o npm test
cd ../../../backend && node ../docs/revisao-codigo/provas/pin-simultaneo.cjs

# BUG-01, BUG-03, totais e formulário: precisam da API a servir o frontend compilado
cd ../frontend && npm run build
cd ../backend && NODE_ENV=production COOKIE_SECURE=false APP_ORIGINS=http://localhost:3000 npm start &
cd ../docs/revisao-codigo/provas
node estado-antigo.mjs       # BASE=http://localhost:3000 por omissão
node totais.mjs
node formulario-cliente.mjs
```

Variáveis:

| Variável | Para quê |
|---|---|
| `BASE` | endereço da API a testar (para comparar duas versões lado a lado, por exemplo 3000 e 3002) |
| `PROJETO` | pasta de outra cópia do projeto para o `pin-simultaneo.cjs` (por omissão, este repositório) |
| `CHROMIUM` | caminho de um Chromium já instalado (opcional) |

O limite de 8 entradas por email em 15 minutos também se aplica aqui. Entre corridas seguidas, reinicia a API.
