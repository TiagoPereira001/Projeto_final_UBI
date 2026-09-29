# Infraestrutura e publicação da Bancada

**Bancada**, ramo `dev` no commit `b185a60` mais as alterações desta tarefa · 28 de setembro de 2026

Este documento foi escrito pelo Claude Code (assistente de programação com IA), a pedido do autor, seguindo o guião de arquitetura de cloud e DevOps que ele forneceu. Cumpre à letra o que o guião pede:
- perceber a aplicação antes de desenhar a infraestrutura;
- ajustar a complexidade ao que é preciso (sem sobre-engenharia);
- distinguir o que é **atual**, **recomendado** e **hipotético**;
- não afirmar sucesso sem provas, nem inventar recursos de nuvem;
- pensar na falha, nas cópias de segurança e no retrocesso desde o princípio.

> **A Bancada não está publicada em lado nenhum.** Hoje só corre em computadores: o do autor, o CI e as sessões do Claude Code. O que aqui é "recomendado" foi **validado numa cópia, em `localhost`**, com o SQL Server Express e o Caddy a sério, mas sem servidor, sem domínio e sem conta de nenhum fornecedor. O que depende disso está marcado **NÃO VERIFICADO**, com o teste que falta.

## Como ler

Cada afirmação tem uma destas etiquetas:
- **ATUAL**: existe no repositório e foi verificado.
- **RECOMENDADO**: proposta. Diz se foi *validada na cópia* (corri e funcionou) ou se é *só desenhada*.
- **HIPOTÉTICO**: depende de coisas que não existem (servidor, domínio, conta num fornecedor).

Todas as medidas são de 28/09/2026, num container com 4 CPUs e 16 GB, com a API e a base de dados na mesma máquina. Servem para ordens de grandeza, não para prometer desempenho num servidor real.

Os ficheiros propostos estão no repositório, mas **ainda não estão em uso**:

| Ficheiro | Para quê |
|---|---|
| [`docker-compose.prod.yml`](../docker-compose.prod.yml) | a pilha de um servidor: Caddy, API, SQL Server Express |
| [`infra/Caddyfile`](../infra/Caddyfile) | HTTPS e proxy |
| [`infra/deploy.sh`](../infra/deploy.sh) | publicar (e voltar atrás se falhar) |
| [`infra/backup.sh`](../infra/backup.sh) | cópia de segurança verificada, comprimida e cifrada |
| [`infra/restauro-teste.sh`](../infra/restauro-teste.sh) | provar que uma cópia serve, sem tocar na base verdadeira |
| [`infra/restaurar.sh`](../infra/restaurar.sh) | repor a base a partir de uma cópia (desastre) |
| [`infra/fumo.sh`](../infra/fumo.sh) | teste de fumo depois de publicar |

---

## 1. Resumo

**Situação atual.** Um container com a API e o frontend compilado, mais um SQL Server em Docker. Só corre localmente. O CI testa e compila, mas não publica. Não há cópias de segurança, nem HTTPS, nem monitorização, nem migrações da base de dados. E o SQL Server que a imagem traz por omissão é a edição **Developer**, que só se pode usar para desenvolver e testar.

**Recomendação, numa frase.** Uma VM pequena x86-64 na UE, com Docker Compose (Caddy, API, SQL Server **Express**), cópias de segurança cifradas de hora a hora com restauro testado todos os meses, e uma cópia fora do servidor. Sem Kubernetes, sem balanceador, sem Redis, sem staging permanente.

**O que foi medido (validado na cópia).**

| O quê | Resultado |
|---|---|
| Dados de 5 anos de uma oficina (12 000 folhas, 72 000 linhas) | 21,5 MB |
| Cópia de segurança (verificada, comprimida, cifrada) | 1,9 MB, 2,7 s |
| Restauro de teste, com verificação de integridade | 2,2 s |
| Simulacro de desastre: apagar tudo e recriar do zero a partir da cópia cifrada | 17 s, dados idênticos (somas de verificação iguais) |
| Primeira publicação num servidor vazio, até à primeira oficina registada | 42 s |
| Publicação normal | 9 s, com 1,7 s sem resposta |
| Publicação partida, com retrocesso automático | volta à versão anterior; 22 s no total |
| A API rebenta | reinicia sozinha em 1,2 s |
| A base de dados desaparece | a API responde 503, e recupera sozinha 5 s depois de ela voltar |
| Todos os 52 testes da API no SQL Server Express | passam |

**Achados novos** (na [auditoria, secção 14](auditoria.md#14-reauditoria-de-28092026)): [REL-005](auditoria.md#rel-005) (uma cópia restaurada noutro servidor deixava a API sem entrar), [REL-006](auditoria.md#rel-006) (o registo de transações crescia sem limite) e [SEC-010](auditoria.md#sec-010) (o container da API tinha a password do `sa`). Os dois primeiros estão corrigidos; o terceiro está resolvido na pilha de produção proposta.

**As cinco coisas que mais importam**
1. **Licença.** Em produção, usar `MSSQL_PID=Express` (gratuita), nunca a Developer.
2. **Cópias de segurança.** Sem cópia restaurada com sucesso não há cópia. Os scripts existem e foram testados; falta pô-los a correr num servidor e guardar uma cópia fora dele.
3. **A chave das cópias.** As cópias são cifradas com uma chave cuja parte privada **não** fica no servidor. Se essa chave se perder, todas as cópias se perdem. Guardar duas cópias da chave, em sítios diferentes.
4. **Migrações.** Hoje o esquema só se cria de raiz. Antes de haver dados reais e alterações ao esquema, é preciso um sistema de migrações (secção 20).
5. **RPO e RTO não estão definidos.** São decisões do cliente (secção 15). Enquanto não houver resposta, a proposta é uma hora de perda máxima, e é só uma proposta.

---

## 2. A aplicação

| Parte | O que é | Evidência |
|---|---|---|
| **Frontend** | React 19 + Vite 8, PWA. Em produção é servido pela própria API (mesma origem), com cache "para sempre" nos ficheiros com hash e revalidação no resto. 119,7 KB de JavaScript no arranque (gzip). | `backend/app.js`, auditoria 5.1 |
| **Backend** | Node 22, Express 5, um só processo. Pool de 10 ligações à base de dados. Ao receber SIGTERM fecha com calma (limite de 10 s). Só quatro linhas de registo (`console`), e uma rota `/api/saude`. | `backend/server.js`, `db.js` |
| **Base de dados** | SQL Server 2022, 6 tabelas, um só esquema para todas as oficinas (separadas por `ID_Oficina`). O esquema só se cria na primeira vez. | `database/schema.sql`, `scripts/db-setup.js` |
| **Armazenamento** | Nenhum. Não há carregamento de ficheiros. | não há `multer` nem equivalente |
| **Serviços externos** | Nenhum. A API não faz pedidos para fora (só os testes o fazem). | pesquisa no código |
| **Tarefas em segundo plano** | Nenhuma. Não há `cron`, `setInterval` nem filas. | pesquisa no código |
| **Filas de mensagens** | Nenhuma. | idem |
| **Autenticação** | JWT em cookie `httpOnly` (12 h), validado contra `Versao_Sessao` na BD em cada pedido. Cookie de dispositivo de 180 dias para o modo bancada. Limites de tentativas **em memória** (só funcionam com uma instância). | `lib/sessao.js`, `middleware/seguranca.js` |
| **Tráfego** | Um tablet no quadro faz 3 pedidos por minuto. O quadro aguentou 39 pedidos/s com 10 em simultâneo, sem erros. | auditoria 5.4 |
| **Disponibilidade exigida** | **DESCONHECIDA.** | secção 15 |

**Informação desconhecida** (perguntas na secção 15): quantas oficinas e tablets nos próximos 12 meses, o orçamento, o horário em que a oficina trabalha, quanto tempo pode estar sem o sistema, quem atende um alerta, onde os dados podem ficar.

---

## 3. Requisitos de infraestrutura

**VERIFICADO**
- Uma oficina com 5 anos de dados ocupa 21,5 MB (mais 16 MB de registo de transações usado). O limite da edição Express (10 GB por base de dados, segundo a documentação da Microsoft) está a duas ordens de grandeza.
- A API usa 86 MB de memória parada e 149 MB depois de 600 pedidos. O SQL Server Express ficou entre 0,9 e 1,0 GiB com os dados de 5 anos e carga.
- Arranque a frio da API até responder: 767 ms. Reinício do SQL Server: 9 a 15 s.
- Imagem da aplicação: 418 MB, corre como utilizador `node`, sem segredos (0 ocorrências de `password`, `secret` ou `JWT` no histórico da imagem), sem `.env`.
- CI: 57 a 70 s (API) e 15 a 18 s (frontend), pelos registos dos dois últimos PR.

**ASSUMIDO** (confirmar com o cliente)
- Uma oficina no início (a Duarte & Raposo), com poucos tablets.
- Trabalho em horário de oficina; à noite e ao domingo ninguém usa.
- A folha de papel serve de plano B se o sistema estiver em baixo (é o processo de hoje).

**DESCONHECIDO**
- Orçamento mensal, fornecedor, domínio, quem opera o servidor, RPO, RTO, janela de manutenção aceitável.

---

## 4. Ambientes

| Ambiente | Existe? | Finalidade | Configuração | Dados | Acesso | Como se publica |
|---|---|---|---|---|---|---|
| **Local** | sim | desenvolver e experimentar | `docker-compose.yml` (só a BD) e `npm`; ou `Iniciar Bancada.command` (tudo em containers) | fictícios (`db:seed`) | só o próprio: portas em `127.0.0.1` | `npm run dev` ou duplo clique |
| **Testes (CI)** | sim, efémero | validar cada PR | GitHub Actions com um SQL Server num container; passwords geradas na hora | fictícios, base `Bancada_Teste` recriada em cada corrida | GitHub | automático em cada PR |
| **Desenvolvimento** | é o ramo `dev`, não um servidor | integração | | | | PR com o CI verde |
| **Staging** | **não**, e recomendo não ter um permanente | ensaiar a pilha de produção | a mesma `docker-compose.prod.yml` num computador, com `DOMINIO=localhost` e o Caddy a usar a sua autoridade local. Foi exatamente o que se fez nesta tarefa | fictícios | só o próprio | `infra/deploy.sh` |
| **Produção** | não existe | uso real | `docker-compose.prod.yml` | reais | só quem o autor autorizar | `infra/deploy.sh` a partir de uma etiqueta do git |

Porquê sem staging permanente: com uma oficina e um servidor, um segundo servidor sempre ligado duplica o custo e a manutenção, e o ensaio em `localhost` apanhou todos os erros de configuração que um staging apanharia (origem, proxy, cookies, permissões). Se um dia houver várias oficinas, reavalia-se.

**Dados reais nunca vão para desenvolvimento.** Os testes de restauro fazem-se numa base temporária dentro do próprio servidor de produção, que se apaga no fim (`restauro-teste.sh`).

---

## 5. O Dockerfile

**ATUAL.** Três fases (compila o frontend, instala só as dependências de produção, imagem final sem ferramentas de compilação), corre como `node`, expõe a porta 3000, `.dockerignore` deixa de fora `.env`, `.git`, os testes e o relatório.

| Verificação | Resultado |
|---|---|
| Tamanho | 418 MB: 329 MB da base `node:22-bookworm-slim`, 80 MB de dependências, 1 MB da aplicação |
| Utilizador | `node` (uid 1000), não é root |
| Segredos na imagem | 0 ocorrências no histórico; sem `.env` |
| Construção sem cache | 28 s |
| `HEALTHCHECK` | não tem (a proposta declara-o no compose) |
| Base fixa por versão | **não**: `node:22-bookworm-slim` muda com as versões pequenas. Recebe correções de segurança, mas a construção não é reprodutível bit a bit |

Não mexi no Dockerfile: o que falta é resolvido no compose de produção.

---

## 6. Docker Compose

**ATUAL** (`docker-compose.yml`, desenvolvimento): dois serviços, `db` e `app` (perfil `app`), portas presas a `127.0.0.1`. Não tem Redis, nem worker, nem fila, porque nada disso faz falta.

**RECOMENDADO, validado na cópia** (`docker-compose.prod.yml`):

| Diferença | Porquê | Prova |
|---|---|---|
| `MSSQL_PID: Express` | a Developer não se pode usar em produção; a Express é gratuita | os 52 testes passam na Express; a edição confirma-se com `SERVERPROPERTY` |
| Imagem `2022-CU27-ubuntu-22.04` em vez de `2022-latest` | a base de dados não muda de versão sozinha | é o mesmo digest que `2022-latest` a 28/09 (verificado no registo) |
| Sem `ports` na BD nem na API | só o Caddy (80 e 443) recebe pedidos da internet | `docker port` da API e da BD: vazio |
| Serviço `setup` à parte | a API deixa de receber a password do `sa` (SEC-010) | `env` do container da API: 0 linhas `DB_ADMIN*` |
| `DB_ENCRYPT: "true"` | a ligação API-BD vai cifrada | `encrypt_option = TRUE` na BD |
| `TRUST_PROXY: "1"`, `COOKIE_SECURE: "true"`, `APP_ORIGINS: https://<domínio>` | atrás do Caddy, com HTTPS | testes da secção 10 |
| `healthcheck` na API | o Docker sabe se a API está boa | passa a `unhealthy` 40 s depois de a BD parar |
| `read_only`, `cap_drop: ALL`, `no-new-privileges` | menos privilégio se alguém executar código na API | a API escreve só em `/tmp`; login, quadro e escrita continuam a funcionar |
| Registos com rotação (3 × 10 MB) | por omissão o Docker não roda os registos e enchem o disco | `docker inspect` |
| `COMPOSE_FILE` no `.env` do servidor | o servidor usa sempre o ficheiro de produção, nunca o de desenvolvimento por engano | |

O SQL Server não tem imagem ARM: **o servidor tem de ser x86-64**.

---

## 7. CI/CD

**ATUAL** (`.github/workflows/ci.yml`): em cada PR e em cada push para `main` e `dev`, três trabalhos em paralelo.

| Trabalho | O que faz | Duração | Se falhar |
|---|---|---|---|
| API | SQL Server num container, `npm audit`, 52 testes | 57 a 70 s | o PR não entra |
| Frontend | `npm audit`, lint, build | 15 a 18 s | o PR não entra |
| Infraestrutura (novo) | `shellcheck` nos scripts, `docker compose config` nos dois ficheiros, construção da imagem | por medir no GitHub | o PR não entra |

A GitGuardian procura segredos em cada PR.

**Não há publicação automática.** É de propósito: com um servidor e uma oficina, publicar à mão com `infra/deploy.sh` (um comando, com cópia, teste de fumo e retrocesso) é mais simples e mais seguro do que uma pipeline que mexe em produção.

**RECOMENDADO, por esta ordem, só quando fizer falta**
1. Dependabot (npm, GitHub Actions e Docker), semanal. Não o liguei porque gera PR sem ninguém pedir.
2. Testes E2E no CI (os percursos do browser da auditoria já existem em `docs/auditoria/scripts/`).
3. Análise da imagem (por exemplo Trivy). Opcional.
4. Publicar a imagem num registo (GHCR) e o servidor fazer só `pull`. Só se houver mais de um servidor.

Fluxo completo proposto: PR, lint e testes, construção da imagem, `deploy.sh` no servidor (cópia, imagem, base de dados, troca, teste de fumo). Não há staging entre o PR e produção (secção 4).

---

## 8. Ramos e publicação

**ATUAL**: `main` (estável), `dev` (integração), um ramo por tarefa, tudo por PR. **Recomendado: manter.** Acrescentar apenas **etiquetas de versão** (`v0.3.0`) no `main`, e o servidor publicar sempre uma etiqueta (`git checkout v0.3.0 && infra/deploy.sh`). Assim sabe-se sempre o que está em produção e voltar atrás é publicar a etiqueta anterior. Não recomendo ramos de versão nem *trunk-based*: para uma pessoa a trabalhar, só traziam cerimónia.

Uma correção urgente: ramo a partir da etiqueta em produção, PR para o `main`, nova etiqueta, e depois fundir no `dev`.

---

## 9. Arquitetura na nuvem

Três opções.

| | A. Uma VM com Compose (recomendada) | B. Containers e base de dados geridos | C. Um computador na oficina |
|---|---|---|---|
| O que é | 1 VM x86-64 na UE: Caddy, API e SQL Server Express | serviço de containers do fornecedor + SQL Server gerido | mini PC na Duarte & Raposo |
| Complexidade | baixa | média | baixa, mas com o risco físico |
| Cópias, atualizações | por nossa conta (scripts desta tarefa) | do fornecedor | por nossa conta |
| Encaixe com o código | total (é o que foi testado) | **`db-setup.js` assume o `sa` e um servidor próprio; num serviço gerido é preciso mudar e testar (NÃO VERIFICADO: não testei nenhum)** | total |
| Riscos | um servidor: se falhar, recria-se (17 s + servidor novo) | custo e dependência de um fornecedor para 21 MB de dados | energia, internet, roubo, incêndio; cópias fora obrigatórias; não serve uma plataforma para várias oficinas |
| Quando escolher | agora | se ninguém quiser operar a base de dados, ou com muitas oficinas | se o cliente exigir os dados dentro da oficina |

### Serviços da opção A

```text
SERVICE: VM x86-64 na UE (2 vCPU e 4 GB de RAM como ponto de partida)
PURPOSE: correr os três containers
WHY: a pilha inteira usa cerca de 1,2 GB com carga (SQL Express 0,9 a 1,0 GiB, API 150 MB, Caddy pouco);
     4 GB dá folga para o sistema e para as cópias. O SQL Server no Linux pede no mínimo 2 GB
     (documentação da Microsoft; NÃO VERIFICADO: a máquina de testes tem 16 GB. Arrancou com o limite
     de 1 GB no container, e ficou em 536 MiB parada)
ALTERNATIVES: serverless ou containers geridos (não encaixam com o SQL Server em container)
OPERATIONAL COMPLEXITY: LOW
COST CONSIDERATIONS: é o custo principal. Preço NÃO VERIFICADO (depende do fornecedor).
                     Não usar ARM. Escolher disco cifrado se o fornecedor o oferecer.

SERVICE: SQL Server Express, em container, no mesmo servidor
PURPOSE: a base de dados
WHY: é a que o código usa; gratuita em produção; 21,5 MB de dados
ALTERNATIVES: base gerida (opção B); edição Standard (paga)
OPERATIONAL COMPLEXITY: MEDIUM (cópias, atualizações e monitorização são nossas)
COST CONSIDERATIONS: licença 0. Limites da Express (documentação da Microsoft, não medidos aqui):
                     10 GB por base, 1410 MB de memória para dados, 1 processador ou 4 núcleos.

SERVICE: disco do servidor e armazenamento fora dele (outro fornecedor)
PURPOSE: dados no disco; cópias cifradas fora
WHY: uma cópia no mesmo disco não protege de perder o servidor
ALTERNATIVES: copiar para o computador do autor (as cópias já saem cifradas, por isso o sítio onde ficam é menos sensível)
OPERATIONAL COMPLEXITY: LOW
COST CONSIDERATIONS: as cópias somam algumas centenas de MB no total (secção 13): o custo é o mínimo do serviço

SERVICE: DNS e HTTPS (Caddy)
PURPOSE: domínio, certificado automático, redirecionamento para HTTPS
WHY: o Caddy pede e renova o certificado sozinho; um só ficheiro de configuração de 20 linhas
ALTERNATIVES: nginx com certbot (mais peças); balanceador do fornecedor (desnecessário com uma VM)
OPERATIONAL COMPLEXITY: LOW
COST CONSIDERATIONS: o domínio; o certificado é gratuito. Sem balanceador, sem CDN: os ficheiros
                     já têm cache imutável e a aplicação é pequena (120 KB).

SERVICE: monitorização (um monitor externo e um "sinal de vida" das cópias)
PURPOSE: saber que caiu, e saber que as cópias deixaram de correr
WHY: sem isto só se descobre por telefone (secção 16)
ALTERNATIVES: Prometheus e Grafana (sobre-engenharia para este tamanho)
OPERATIONAL COMPLEXITY: LOW
COST CONSIDERATIONS: existem monitores com plano gratuito; NÃO VERIFICADO o plano atual de nenhum.
```

Para evitar sobre-engenharia, **não** recomendo: Kubernetes, balanceador de carga, CDN, Redis, filas, base de dados replicada, segunda região, gestor de segredos do fornecedor, Prometheus, Grafana, ELK.

---

## 10. Segurança

| Tema | Estado | Prova |
|---|---|---|
| Mínimo privilégio na BD | **ATUAL**: a API entra como `bancada_app`, sem `DELETE` nas cinco tabelas com soft delete | testes automáticos |
| A API não tem o `sa` | **validado na cópia** (SEC-010) | 0 linhas `DB_ADMIN*` no container |
| Fronteiras de rede | **validado na cópia**: só o Caddy publica portas | `docker port` |
| Firewall do servidor | **RECOMENDADO, não verificado**: entrada só em 22 (restrita), 80 e 443. O Docker contorna a firewall do sistema (ufw) para as portas que publica, e é por isso que só o Caddy publica | |
| HTTPS | **validado na cópia** com a autoridade local do Caddy: HTTP/2, redirecionamento 308, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, CSP. **Certificado a sério (Let's Encrypt): NÃO VERIFICADO** (precisa de domínio e de as portas 80 e 443 acessíveis) | `infra/fumo.sh` |
| Cookie de sessão | **validado**: `Secure; HttpOnly; SameSite=Strict` | cabeçalho `Set-Cookie` |
| Proteção CSRF em HTTPS | **validado**: origem certa aceite; origem errada 403; `http://` em vez de `https://` também 403 | `fumo.sh` |
| Limite de tentativas atrás do proxy | **validado**: 9 tentativas com um `X-Forwarded-For` diferente em cada uma dão 8 x 401 e depois 429. O cabeçalho falsificado não contorna o limite | |
| Registo de acessos | **validado**: o Caddy regista sem `?q=` (pesquisas com nomes, NIF e matrículas) e sem o cookie (`REDACTED`) | registo do Caddy |
| Container | **validado**: utilizador `node`, sistema de ficheiros só de leitura, sem capacidades, `no-new-privileges` | `docker exec ... touch` recusado |
| Cifra em repouso da BD | **não existe na Express** (TDE recusado com o erro 33117, testado). Recomendo disco cifrado do fornecedor (NÃO VERIFICADO) e cópias cifradas fora do SQL Server | |
| Dependências | **ATUAL**: `npm audit` a 0 (API e frontend) no CI. **Falta** análise da imagem e Dependabot | |
| Registo de auditoria | **ATUAL, incompleto**: autoria de folhas e linhas; não há registo completo de quem alterou o quê | |
| Acesso ao servidor | **RECOMENDADO**: SSH só com chave, conta do fornecedor com autenticação em dois passos, atualizações automáticas de segurança do sistema. NÃO VERIFICADO | |

**RGPD** (não é aconselhamento jurídico). A Bancada guarda dados pessoais dos clientes das oficinas. Alojar na UE é o caminho mais simples, e o fornecedor deve ser subcontratante com contrato. As cópias de segurança **também** têm dados pessoais: um pedido de apagamento resolve-se na base ativa, e nas cópias só quando elas expirarem (2 dias, 30 dias, 90 dias). Isso deve constar da política de privacidade.

---

## 11. Segredos

| Segredo | Onde vive | Notas |
|---|---|---|
| `DB_ADMIN_PASSWORD` | `.env` do servidor (modo 600); container da BD e passo `setup` | a API **não** o recebe |
| `DB_PASSWORD` | `.env`; API e `setup` | rotação validada (abaixo) |
| `JWT_SECRET` | `.env`; só a API | rotação termina todas as sessões (validado) |
| Chave privada do `age` | **fora do servidor** (gestor de passwords e uma cópia noutro sítio) | se se perder, perdem-se as cópias todas |
| Chave pública do `age` | `.env` | não é segredo |
| `PING_URL` | `.env` | semi-secreto |
| CI | nenhum guardado: as passwords do CI geram-se em cada corrida | |

`criar-env.js` cria o `.env` com o modo 600 e passwords aleatórias. Nada disto está no código, na imagem nem no git. **A password do `sa` e o `JWT_SECRET` antigos estão no histórico público do git: nunca os usar.**

**Rotação, validada na cópia**
- `DB_PASSWORD`: mudar no `.env`, `docker compose --profile setup run --rm setup`, `docker compose up -d app`. A antiga deixa de entrar e a nova entra.
- `JWT_SECRET`: mudar no `.env`, `docker compose up -d app`. As sessões antigas passam a dar 401 e um login novo funciona. (Nota: `GET /api/auth/sessao` responde sempre 200, com campos nulos se não houver sessão; o teste certo é uma rota protegida.)
- `sa`: **mudar `MSSQL_SA_PASSWORD` no `.env` não muda a password numa base que já existe** (testado: a antiga continua a entrar). O que a muda é `ALTER LOGIN sa WITH PASSWORD = '...'`, feito com a password antiga, dentro do container. Depois atualizar o `.env` e recriar o container da BD (`docker compose up -d db`), senão o `healthcheck` e os scripts de cópia, que leem a password do ambiente do container, deixam de entrar.

---

## 12. A base de dados

| Tema | Estado |
|---|---|
| Ligações | pool de 10. Com 50 pedidos em simultâneo os pedidos esperam a vez, sem erros (auditoria 5.4) |
| Ligação cifrada | `DB_ENCRYPT=true` validado. `DB_TRUST_CERT` fica `true` (a BD usa um certificado próprio): cifra, mas não autentica o servidor. Aceitável dentro da rede do Compose, no mesmo servidor. Se a BD passar para outra máquina, usar um certificado a sério |
| Migrações | **não existem** (secção 20) |
| Modelo de recuperação | `db:setup` cria as bases novas em `SIMPLE` (REL-006). Ver secção 13 |
| Tamanho | 21,5 MB de dados em 5 anos de uma oficina: o limite de 10 GB da Express fica muito longe |
| Cópias | secção 13 |

### Edição do SQL Server

| Facto | Como se sabe |
|---|---|
| A imagem usa a **Developer** por omissão (`MSSQL_PID=developer` no container) | medido |
| A Developer só se pode usar para desenvolver e testar (termos de licença da Microsoft; **NÃO VERIFICADO aqui** o texto atual: o autor deve confirmar) | documentação |
| Na Express não há compressão de cópias (erro 3013), nem TDE (33117), nem cópias cifradas pelo SQL Server, nem SQL Server Agent (0 serviços) | **testado** |
| Uma cópia comprimida feita na Developer restaura-se na Express | **testado** (0,77 s) |
| Os 52 testes da API passam na Express | **testado** |
| Mudar `MSSQL_PID` num volume que já existe muda a edição e mantém a base | **testado** |
| Sem SQL Server Agent, as cópias agendam-se com `cron` no servidor | consequência |

---

## 13. Cópias de segurança

Uma cópia não é fiável só por existir. Tudo aqui foi restaurado.

### Estratégia recomendada (validada na cópia)

| Tema | Escolha |
|---|---|
| O quê | a base `Bancada` inteira (todas as oficinas) |
| Modelo de recuperação | `SIMPLE` |
| Frequência | de hora a hora, mais uma diária. Cada cópia leva 2,7 s e ocupa 1,9 MB |
| Retenção | as horárias 2 dias, as diárias 30, as de antes de publicar 90 (no `backup.sh`) |
| Cifra | `age`, com a chave **pública** no servidor e a privada fora. Quem entrar no servidor não abre as cópias |
| Verificação automática | `BACKUP ... WITH CHECKSUM` e `RESTORE VERIFYONLY ... WITH CHECKSUM` em cada cópia |
| Verificação completa | `restauro-teste.sh`, uma vez por mês: descifra, restaura numa base temporária, corre `DBCC CHECKDB`, apaga. 2,2 s |
| Aviso de falha | `PING_URL`: só é chamado quando a cópia correu bem; um serviço de "sinal de vida" avisa se deixar de ser chamado |
| Fora do servidor | **HIPOTÉTICO** (ver abaixo) |
| Configuração | o `.env` e a chave privada guardam-se **à parte** das cópias da base de dados. O resto (compose, Caddyfile, scripts) está no git. O volume do Caddy não é preciso: o certificado pede-se de novo |

Agendamento (`crontab -e`, do utilizador que corre o Docker):

```text
5 * * * *   cd /opt/bancada && infra/backup.sh horaria >> /var/log/bancada-copias.log 2>&1
30 3 * * *  cd /opt/bancada && infra/backup.sh diaria  >> /var/log/bancada-copias.log 2>&1
```

Se a resposta ao RPO for "15 minutos", trocar a primeira linha por `*/15 * * * *`: cabem na mesma sem complicar (cerca de 4 vezes mais espaço, ainda na ordem das centenas de MB).

### Porquê `SIMPLE` e cópias completas, e não `FULL` com cópias do registo

Medido numa cópia da base de carga:

| Modelo | O que acontece |
|---|---|
| `FULL`, depois da primeira cópia completa, **sem** cópias do registo | cada passagem de 70 mil linhas alteradas soma cerca de 21 MB ao registo: 2, 23, 43, 64, 85 e 106 MB usados, e o ficheiro cresce de 72 para 200 MB alocados, com `LOG_BACKUP` à espera. Sem limite, até encher o disco |
| `FULL` com cópias do registo | funciona e permite **restaurar até um instante**. Testado: cópia completa e três do registo, um engano (1800 linhas apagadas), restauro até ao instante anterior em 1,4 s, com as 72 246 linhas de volta |
| `SIMPLE` | o registo reutiliza-se sozinho. Um só ficheiro para restaurar |

Com 21,5 MB de dados, cópias completas frequentes custam quase nada e evitam a cadeia de cópias do registo, que se parte se faltar um ficheiro. **Reavaliar** quando uma cópia completa passar a demorar muito mais do que alguns segundos ou a pesar centenas de MB (não é um limite testado). Quem quiser restaurar até um instante muda para `FULL` de propósito e agenda também `BACKUP LOG`.

O `db:setup` cria as bases novas em `SIMPLE`. Uma base que já existe não é alterada; o `restaurar.sh` avisa se restaurar uma em `FULL`.

### Fora do servidor (HIPOTÉTICO, não testado)

Não testei nenhum destino, porque não há conta em nenhum fornecedor. O desenho:
- copiar a pasta `copias/` para um armazenamento de **outro fornecedor**, por exemplo com `rclone` para um armazenamento compatível com S3, ou com `rsync` para outra máquina;
- as credenciais dessa cópia só devem poder **acrescentar**, não apagar (senão quem entrar no servidor apaga também as cópias);
- um plano mínimo e de custo zero: descarregar as cópias cifradas todas as semanas para o computador do autor.

### O que o restauro **não** faz
- Não restaura **uma oficina** sozinha: a base é partilhada. Para recuperar dados de uma só oficina, restaura-se a cópia numa base temporária (é o que o `restauro-teste.sh` faz) e copiam-se as linhas dessa oficina à mão, com SQL. Não está automatizado.

---

## 14. Recuperação de desastres

Cada cenário: o que falha, como se deteta, resposta imediata, recuperação, prevenção. **Feito** quer dizer que o cenário foi provocado na cópia.

**1. A API rebenta.** *Feito.*
- Deteção: `healthcheck` e monitor externo.
- Resposta: nenhuma, é automática. `restart: unless-stopped` reinicia o processo em 1,2 s.
- Recuperação: ver o registo (`docker compose logs app`) para saber porquê.
- Prevenção: testes; teste de fumo na publicação.
- Nota: `docker kill` conta como paragem manual e **não** reinicia (aprendi-o a testar). Um erro fatal, sim.

**2. Uma publicação falha.** *Feito.*
- Deteção: o teste de fumo do `deploy.sh`.
- Resposta: o script mostra o fim do registo da versão que falhou e volta sozinho à imagem anterior.
- Recuperação: corrigir, nova etiqueta. Se a versão nova alterou a base de dados, a aplicação volta atrás mas a base não: ver secção 21.
- Prevenção: CI verde, ensaio em `localhost`.

**3. A base de dados desaparece (o container pára).** *Feito.*
- Deteção: `/api/saude` responde 503 com `{"estado":"degradado","baseDados":"sem ligação"}`; o `healthcheck` passa a `unhealthy` aos 40 s.
- Resposta: `docker compose start db` (ou o reinício automático).
- Recuperação: a API volta sozinha 5 s depois de a BD aceitar ligações, sem ser reiniciada. Um reinício de tudo responde ao fim de 17 s.
- Prevenção: monitor externo. Nota: o SQL Server não recebe o sinal de paragem do Docker (`docker compose restart db` demora 10,5 s e é morto ao fim de 10 s). Os dados estão protegidos pelo registo de transações; o arranque seguinte faz a recuperação.

**4. Perda do servidor ou do volume da BD.** *Feito, como simulacro.*
- Deteção: monitor externo; ou o alerta de cópias em falta.
- Resposta: criar um servidor novo (fornecedor, DNS).
- Recuperação (validada, sem contar o servidor novo nem as imagens): `.env` novo, `docker compose up -d db`, `infra/restaurar.sh <cópia> <chave>`, `docker compose up -d app caddy`, `infra/fumo.sh`. **17 s**, com as somas de verificação da base iguais às de antes. Os segredos são novos e as passwords das pessoas (que estão na base) continuam a funcionar.
- Prevenção: cópias fora do servidor; **a chave privada e o `.env` guardados à parte**.
- Nota: o `restaurar.sh` constrói a imagem se ela ainda não existir (foi um defeito que apanhei ao testar num servidor sem imagem).

**5. Disco cheio.** *Não provocado.*
- Deteção: alerta de espaço em disco (a definir, secção 16).
- Resposta: apagar cópias antigas e registos; ver o que ocupa.
- Prevenção: registos com rotação (3 × 10 MB por container, validado), `SIMPLE` (REL-006) e cópias curtas.

**6. Um engano humano (linhas apagadas por engano).**
- Com `SIMPLE`, a perda máxima é o intervalo entre cópias. Restaura-se a última cópia boa para uma base temporária e copiam-se as linhas de volta (não automatizado). Com `FULL` e cópias do registo dava para restaurar até um instante (testado).
- As folhas, clientes, veículos e colaboradores têm soft delete e a API não os apaga.

**7. Falha do fornecedor ou da região.** *Não provocado.* Sem segunda região, a Bancada fica em baixo até haver um servidor novo noutro sítio (é o cenário 4, com o DNS a apontar para o novo). Custo de uma segunda região: NÃO justificado por nenhum requisito conhecido.

**8. Fuga de credenciais.** *Rotações validadas.* Há um precedente neste repositório: a password do `sa` e o `JWT_SECRET` estiveram num repositório público.
- Resposta: mudar `JWT_SECRET` (termina todas as sessões), mudar `DB_PASSWORD` e o `sa` (secção 11), ver os registos.
- Prevenção: `.env` a 600, nada no git, GitGuardian em cada PR, `config.js` recusa segredos curtos.

**Plano B do negócio (ASSUMIDO):** a folha de papel. Confirmar com o cliente.

---

## 15. RPO e RTO

**REQUISITO NÃO DEFINIDO.** Não os invento. O que a tecnologia consegue entregar, medido:

| | Consegue |
|---|---|
| RPO técnico | no máximo o intervalo entre cópias: 1 hora com o agendamento proposto, 15 minutos com `*/15`; com `FULL` e cópias do registo, restaurar até um instante |
| RTO técnico | restaurar os dados: 2 a 3 s; recriar os serviços: 17 s. O que **domina** o RTO real é arranjar um servidor novo, o DNS e o certificado, e **isso não foi medido** (precisa de um fornecedor) |

**Perguntas para o cliente**
1. Quanto trabalho a oficina aceita repetir: uma hora, meio dia, um dia? (RPO)
2. Quanto tempo aceita estar sem o sistema: uma hora, uma manhã, um dia? A folha de papel serve de plano B? (RTO)
3. Há horas em que parar não custa (fim de semana)? (janela de manutenção)
4. Quem recebe o alerta e o que faz às duas da manhã?
5. Quanto tempo precisam de guardar as folhas? Que obrigações legais de retenção há?
6. Quantas oficinas e tablets se esperam nos próximos 12 meses?
7. Qual o orçamento mensal máximo?
8. Os dados têm de ficar na UE? (a proposta assume que sim)

---

## 16. Observabilidade

| | Estado |
|---|---|
| **Registos da API** | **ATUAL, mínimo**: 4 linhas de `console` (falha de saúde, erro do pool, erro não tratado, paragem). Não há registo de pedidos |
| **Registo de acessos** | **validado**: o Caddy, em JSON, sem pesquisa nem cookies |
| **Rotação** | **validado**: 3 × 10 MB por container |
| **Saúde** | `/api/saude` faz de "pronto" e verifica a BD. O `healthcheck` do container usa-a. "Vivo" é o processo a correr (o Docker reinicia-o) |
| **Métricas** | não há coletor. Valores de referência medidos: API 86 a 149 MB, SQL Express 0,5 a 1,0 GiB, CPU do SQL até 238% de 400% sob 10 pedidos em simultâneo |
| **Alertas** | **RECOMENDADO, só três**: (1) a Bancada não responde há mais de 2 minutos; (2) uma cópia deixou de correr (o sinal de vida não chegou em 90 minutos); (3) o disco passou de 80%. Mais do que isto é ruído |

Prometheus, Grafana e agregadores de registos são sobre-engenharia para um servidor: `docker compose logs` chega.

---

## 17. Desempenho e escala

| Tema | Análise |
|---|---|
| Aplicação sem estado | quase: a sessão está no cookie e a validade na BD. **Exceção:** os limites de tentativas estão em memória, por instância. Duas instâncias duplicavam os limites. Está documentado; só importa se houver mais de uma |
| Escala vertical primeiro | uma VM maior resolve muito antes de qualquer outra coisa |
| Capacidade medida | o quadro aguentou 39 pedidos/s com 10 em simultâneo (34 pedidos/s medido de novo na Express, com `curl`), sem erros. A 3 pedidos por minuto por tablet, isso dá **a ordem de grandeza** de centenas de tablets só a olhar para o quadro. Não é uma promessa: sem histórico nem escritas, com a API e a BD na mesma máquina |
| Pontos fracos conhecidos | histórico com 12 000 folhas (607 ms a p50 com 10 em simultâneo): [PERF-001](auditoria.md#perf-001) e [PERF-002](auditoria.md#perf-002) |
| Cache e CDN | ficheiros com hash em cache imutável; a API nunca põe dados em cache. CDN sem utilidade |
| Filas e tarefas | não há; não são precisas |
| Base de dados | a Express usa um processador (ou 4 núcleos) e 1410 MB para dados (documentação da Microsoft). Com estes tamanhos tudo cabe em memória |

**Quando mudar** (gatilhos a vigiar, não a fazer já): CPU da BD acima de 70% de forma sustentada, p95 do quadro acima de 1 s, base com vários GB, ou um requisito de disponibilidade que uma VM não cumpra. Aí, por ordem: VM maior, BD noutra máquina, segunda instância da API com limites partilhados (Redis).

---

## 18. Custos

**Custo necessário**
- a VM (o custo principal; preço NÃO VERIFICADO);
- o domínio;
- o armazenamento das cópias fora do servidor (centenas de MB no total: o mínimo do serviço).

**Custo opcional**
- monitor externo com plano pago; análise de imagens; base de dados gerida; um serviço de cópias pago.

**Desperdício a evitar**
- staging sempre ligado; VM maior do que a pilha precisa (usa cerca de 1,2 GB); balanceador, gateway de rede ou CDN para uma VM; agregadores de registos pagos (os registos têm 30 MB no máximo); *snapshots* do disco sem política de retenção a somar-se às cópias; a licença da edição Standard sem precisar dela.

**O que a Express poupa:** a licença do SQL Server, e por isso a recomendação de a usar, desde que os limites (10 GB, 4 núcleos) sirvam. **Não indico preços**: não os verifiquei e mudam; consultar as tabelas do fornecedor no momento da decisão.

---

## 19. Publicação

`infra/deploy.sh`, validado (secção 4 e abaixo). Passos:
1. sobe a base de dados e espera que esteja saudável;
2. cópia de segurança (só se a base já existir; na primeira publicação não há nada a copiar);
3. constrói a imagem (a anterior fica com a etiqueta `anterior`);
4. `setup`: cria a base se não existir, ajusta o login e as permissões da API;
5. troca o container da API;
6. teste de fumo (`fumo.sh`): `/api/saude`, cabeçalhos, origem recusada e aceite. Se falhar, mostra o registo e volta à versão anterior.

Medido: publicação normal 9 s, com 1,7 s sem resposta (a API é um só container e é trocado: não há *blue/green*). Numa publicação partida o retrocesso levou 22 s no total. Os tablets ficam com erros nesse intervalo e recuperam no pedido seguinte (a cada 20 s).

**Primeira publicação num servidor novo** (validada de ponta a ponta em `localhost`; **o servidor, o DNS e o certificado a sério: NÃO VERIFICADOS**):

```bash
# 1. servidor x86-64 com Docker, o plugin Compose, git e age; Docker a arrancar com o sistema
# 2. firewall do fornecedor: entrada só em 22 (restrita), 80 e 443; DNS do domínio a apontar para o servidor
git clone <repositório> /opt/bancada && cd /opt/bancada && git checkout <etiqueta>
node backend/scripts/criar-env.js          # ou, sem Node: docker run --rm --user "$(id -u):$(id -g)" -v "$PWD":/app -w /app node:22-bookworm-slim node backend/scripts/criar-env.js
cat >> .env <<'EOF'
COMPOSE_FILE=docker-compose.prod.yml
DOMINIO=bancada.exemplo.pt
AGE_DESTINATARIO=age1...                   # a chave PÚBLICA, gerada no teu computador com age-keygen
EOF
infra/deploy.sh                            # 42 s no ensaio local
# 3. a primeira oficina regista-se na página de registo
# 4. agendar as cópias (secção 13) e fazer o primeiro restauro de teste
```

(O comando do `criar-env.js` sem Node no servidor: o ensaio foi feito com Node; o desse `docker run` **NÃO foi verificado**.)

---

## 20. Migrações da base de dados

**ATUAL, e é um bloqueio para dados reais.** O `db-setup.js` cria o esquema (`schema.sql`) só quando a base **não existe**. Se uma versão nova precisar de uma coluna nova, alterar o `schema.sql` **não faz nada** numa base que já existe: teria de se aplicar à mão.

**RECOMENDADO, só desenhado:**
- uma tabela `Versao_Esquema` e uma pasta `backend/database/migracoes/` com ficheiros numerados (`0001-...sql`);
- o `db-setup.js` aplica, por ordem e cada uma numa transação, as que faltam, e regista-as;
- **compatíveis com a versão anterior da aplicação**: primeiro acrescentar (coluna nova, opcional), publicar, e só numa versão seguinte remover o que ficou por usar. Assim o retrocesso da aplicação continua seguro;
- a cópia feita pelo `deploy.sh` antes de publicar é a rede de segurança.

Bloqueios e tempo de paragem: com 21,5 MB de dados, um `ALTER TABLE` deve demorar milissegundos, mas **não o medi**. Não se pode assumir que todas as migrações se desfazem automaticamente: uma que apague ou renomeie uma coluna só se desfaz restaurando a cópia, e perdem-se os dados escritos desde então.

---

## 21. Retrocesso

| | |
|---|---|
| **Aplicação** | **automático e validado**: o `deploy.sh` volta à imagem `anterior` se o teste de fumo falhar. À mão: `git checkout <etiqueta anterior> && infra/deploy.sh` |
| **Base de dados** | restaurar a cópia de antes da publicação (`infra/restaurar.sh ... --substituir`). Perdem-se os dados escritos depois dessa cópia |
| **Infraestrutura** | o compose, o Caddyfile e os scripts estão no git: voltar a uma etiqueta anterior |
| **Configuração** | o `.env` não está no git: guardar uma cópia cifrada à parte |

**Quando o retrocesso é inseguro ou impossível**
- depois de uma migração que removeu ou mudou dados (só a cópia repõe, com perda);
- depois de rodar segredos por causa de uma fuga: **não** repor o `JWT_SECRET` nem as passwords antigas;
- depois de gravar dados num formato que a versão anterior não lê.

---

## 22. Resposta a incidentes

A sequência é sempre: **deteção, contenção, investigação, recuperação, validação, revisão**. O que muda em cada tipo:

| Incidente | Deteção | Contenção | Investigação | Recuperação | Validação |
|---|---|---|---|---|---|
| **Fora do ar** | monitor externo | ver se é o servidor, o Caddy, a API ou a BD (`docker compose ps`) | `docker compose logs` | reiniciar o serviço; senão, cenário 4 | `fumo.sh` |
| **Publicação falhada** | `deploy.sh` | o retrocesso automático | o registo que o script mostra | nova etiqueta | `fumo.sh` |
| **Problema na BD** | `/api/saude` 503 | parar a escrita (`docker compose stop app`) | registo do SQL Server; `DBCC CHECKDB` numa cópia restaurada | reiniciar; ou restaurar | login, quadro, contagens |
| **Segurança** | alerta, ou aviso de terceiros | rodar segredos (secção 11); ver o registo de acessos | quem, quando, o quê (o Caddy regista IP, caminho, estado) | restaurar de uma cópia anterior ao incidente, se houve alteração de dados | testes + revisão de acessos |
| **Latência alta** | queixa; monitor | ver CPU e memória (`docker stats`) | a consulta lenta (histórico: PERF-001) | reiniciar; depois corrigir a causa | tempos do quadro |
| **Recursos esgotados** | alerta de disco | apagar cópias e registos antigos | o que cresceu (`du`, `docker system df`) | libertar espaço; VM maior se preciso | `df`, `fumo.sh` |

Depois de cada incidente: escrever o que se passou, o que se fez e o que muda (uma página, no repositório).

---

## 23. Lista de verificação

Avalia a proposta **validada na cópia**. Nenhum item foi verificado num servidor real, e por isso a instalação **não deve ser tratada como pronta para produção** antes de se repetir no servidor o que está marcado.

| # | Item | Estado | Evidência | O que falta |
|---|---|---|---|---|
| 1 | Segredos geridos com segurança | NEEDS REVIEW | `.env` a 600, fora do git e da imagem, rotações validadas | decidir onde ficam a chave privada e a cópia do `.env`; não há gestor de segredos (e não é preciso) |
| 2 | HTTPS configurado | NEEDS REVIEW | HTTPS, HSTS, cookie `Secure` validados com a autoridade local do Caddy | certificado a sério: precisa de domínio e servidor |
| 3 | Acesso à base de dados restrito | PASS | sem portas publicadas; API sem `sa`; login sem `DELETE` | |
| 4 | Cópias configuradas | NEEDS REVIEW | scripts validados | `cron`, cópia fora do servidor e o sinal de vida por montar |
| 5 | Restauro testado | PASS | `restauro-teste.sh` (2,2 s), simulacro de desastre (17 s, somas iguais), restauro até um instante (1,4 s), chave errada e cópia truncada falham com mensagem clara | repetir todos os meses |
| 6 | Monitorização configurada | NEEDS REVIEW | só proposta (secção 16) | montar o monitor e os três alertas |
| 7 | *Health checks* configurados | PASS | `/api/saude`; o `healthcheck` do container passa a `unhealthy` aos 40 s e volta a `healthy` | |
| 8 | Registos configurados | NEEDS REVIEW | rotação e registo de acessos sem dados pessoais validados | a API quase não regista |
| 9 | Publicação reprodutível | PASS | `deploy.sh` a partir do git: primeira publicação em 42 s, normal em 9 s, com retrocesso; `npm ci` com lockfiles | fixar as imagens `node` e `caddy` por versão (só a BD está fixa) |
| 10 | Retrocesso documentado | PASS | secção 21; retrocesso automático validado | |
| 11 | Dependências analisadas | NEEDS REVIEW | `npm audit` a 0 no CI | análise da imagem; Dependabot |
| 12 | Configuração de produção separada | PASS | `docker-compose.prod.yml` com `COOKIE_SECURE`, `APP_ORIGINS`, `TRUST_PROXY`, `DB_ENCRYPT` e `COMPOSE_FILE` no `.env` | |
| 13 | Mínimo privilégio | PASS | API sem `sa`, sem `DELETE`, utilizador `node`, sistema de ficheiros só de leitura, sem capacidades | o trabalho de cópias corre como `sa` dentro do container da BD: escolha consciente, sem exposição na rede |
| 14 | Custos compreendidos | NEEDS REVIEW | estrutura de custos clara (secção 18) | preços e fornecedor por escolher |
| 15 | Cenários de falha considerados | PASS | 8 cenários (secção 14); 5 provocados na cópia | disco cheio e falha do fornecedor não foram provocados |

---

## 24. Riscos

| Risco | Impacto | Mitigação | Estado |
|---|---|---|---|
| Usar a edição Developer em produção | licença | `MSSQL_PID=Express` na pilha de produção | resolvido na proposta |
| Perder a chave privada das cópias | perder todas as cópias | duas cópias da chave, em sítios diferentes | por fazer |
| Sem migrações | não dá para evoluir o esquema com dados reais | secção 20 | **aberto** |
| Servidor único | indisponibilidade até haver um novo | cópias fora; simulacro de 17 s; plano B em papel | aceite, a confirmar (RPO/RTO) |
| Cópias só no servidor | perdem-se com ele | copiar para fora (secção 13) | por fazer |
| Limites de tentativas em memória | só valem com uma instância | uma instância; Redis se crescer | aceite |
| Imagens `node` e `caddy` sem versão fixa | uma reconstrução muda versões | fixar por versão e subir de propósito | por fazer |
| Sem monitorização | descobre-se por telefone | secção 16 | por fazer |
| Registo da API mínimo | investigar incidentes é lento | acrescentar registo de pedidos e erros com contexto | por fazer |
| Dados pessoais nas cópias | RGPD | retenção curta; cópias cifradas; política de privacidade | por fazer |
| Falta de migrações + retrocesso | um retrocesso pode perder dados | migrações compatíveis; cópia antes de publicar | aberto |
| Certificado e DNS não testados | a primeira publicação real pode falhar aí | ensaiar com o domínio antes de dar o endereço à oficina | por fazer |

---

## 25. O que não foi verificado

- Tudo o que precisa de um servidor real: fornecedor, DNS, certificado do Let's Encrypt, firewall, SSH, atualizações do sistema, disco cifrado, arranque do Docker com o sistema, tempo de criar um servidor novo.
- Um destino de cópias fora do servidor (nenhum foi testado).
- Preços e planos de qualquer fornecedor ou serviço de monitorização.
- Os limites e as licenças da Microsoft (Developer, Express) lidos da documentação, não testados: 10 GB, 1410 MB, 4 núcleos, 2 GB mínimos de memória. **Testado:** compressão, TDE, cópias cifradas, Agent, e que a Express corre os 52 testes.
- Disco cheio e falha do fornecedor.
- Migrações (não existem).
- O comando `docker run ... criar-env.js` para servidores sem Node.
- A duração do trabalho `infraestrutura` do CI no GitHub.
- O lançador no macOS (herdado da reauditoria).

---

## 26. Relatório final

| Tema | Resumo | Onde |
|---|---|---|
| **Infraestrutura atual** | containers locais; CI sem publicação; Developer Edition; sem cópias, HTTPS, monitorização nem migrações | 1, 5, 6, 7 |
| **Infraestrutura recomendada** | uma VM x86-64 na UE com Caddy, API e SQL Server Express | 9 |
| **Serviços de nuvem** | VM, disco, armazenamento de cópias fora, DNS, monitor externo. Nada mais | 9 |
| **Estratégia Docker** | compose de produção sem portas na API e na BD, `setup` à parte, imagem da BD fixa, endurecimento do container | 5, 6 |
| **CI/CD** | 3 trabalhos; publicação manual com `deploy.sh`; etiquetas de versão | 7, 8 |
| **Segurança** | HTTPS, cookies, CSRF, limite de tentativas e registos validados; TDE não existe na Express | 10, 11 |
| **Observabilidade** | `/api/saude`, `healthcheck`, registo de acessos do Caddy; 3 alertas | 16 |
| **Cópias** | `SIMPLE` e cópias completas de hora a hora, cifradas com `age`; restauro testado todos os meses | 13 |
| **Recuperação de desastres** | 8 cenários; simulacro de perda total em 17 s | 14 |
| **RPO e RTO** | REQUISITO NÃO DEFINIDO; perguntas na secção 15 | 15 |
| **Escala** | vertical primeiro; os limites de tentativas em memória prendem a uma instância | 17 |
| **Custo** | a VM domina; sem preços verificados | 18 |
| **Publicação** | `infra/deploy.sh`, 9 s, 1,7 s sem resposta | 19 |
| **Retrocesso** | automático para a aplicação; a base pela cópia | 21 |
| **Resposta a incidentes** | seis tipos, mesma sequência | 22 |
| **Riscos** | migrações, chave das cópias, servidor único, cópias fora | 24 |
| **Informação não verificada** | tudo o que precisa de um servidor real | 25 |
