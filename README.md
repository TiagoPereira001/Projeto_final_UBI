<p align="center">
  <img src="Relatorio/Anexos/ubi-banner.png" alt="Universidade da Beira Interior" width="100%">
</p>

<h1 align="center">Bancada</h1>

<p align="center">
  <strong>Folhas de obra digitais para oficinas.</strong><br>
  <em>Licenciatura em Informática Web, Móvel e na Nuvem · Universidade da Beira Interior</em>
</p>

<p align="center">
  <img src="docs/imagens/aviso-em-desenvolvimento.svg" alt="Em desenvolvimento: ainda não está pronto para uso real. Todos os direitos reservados, © 2026 Tiago Dias Pereira.">
</p>

> **Em desenvolvimento.** A Bancada ainda não foi testada numa oficina e não deve ser usada com dados reais.<br>
> **Todos os direitos reservados** a Tiago Dias Pereira. O código está público só para consulta: ver [Direitos de autor](#direitos-de-autor).

<p align="center">
  <a href="https://github.com/TiagoPereira001/Projeto_final_UBI/actions/workflows/ci.yml?query=branch%3Adev"><img src="https://img.shields.io/github/actions/workflow/status/TiagoPereira001/Projeto_final_UBI/ci.yml?branch=dev&style=for-the-badge&label=CI%20(dev)" alt="CI"></a>
  <img src="https://img.shields.io/badge/Testes-54-2ea44f?style=for-the-badge" alt="Testes">
  <img src="https://img.shields.io/badge/Stack-React_%7C_Node.js_%7C_SQL_Server-blue?style=for-the-badge" alt="Stack">
  <img src="https://img.shields.io/badge/Docker-pronto-2496ED?style=for-the-badge&logo=docker" alt="Docker">
</p>

<p align="center">
  <img src="docs/imagens/quadro-tablet.png" alt="Quadro da oficina no tablet: luzes de estado e lista de veículos" width="100%">
</p>

## O que é

A Bancada substitui as folhas de obra em papel das oficinas. Cada entrada de um veículo passa a ser uma folha digital. Os mecânicos registam as peças e as horas à medida que trabalham, e o gestor vê o que está na oficina, em que estado, quanto vale o trabalho e quem o fez.

O projeto nasceu na oficina **Duarte & Raposo** (Canhoso, Covilhã), especializada em mecânica, eletricidade e autocaravanas, onde as folhas de papel se perdiam, se sujavam e obrigavam a fazer as contas à mão. Começou como um sistema só para essa oficina e passou a servir **qualquer oficina**: cada uma regista-se sozinha e só vê os seus dados. A Duarte & Raposo é o primeiro cliente.

A descrição completa do produto (utilizadores, percurso de um carro pela oficina, o que existe e o que ainda não existe) está no [`PRODUCT.md`](PRODUCT.md).

**Para a experimentares:** num Mac, faz duplo clique em [`Iniciar Bancada.command`](#no-mac-com-um-duplo-clique) (só precisas do Docker Desktop). No Windows, ou se queres mexer no código, segue o guia [Como pôr a Bancada a funcionar](#como-pôr-a-bancada-a-funcionar).

## Funcionalidades

- **Quadro da oficina** com um "tablier": uma luz por estado (abertas, em curso, a aguardar peças, prontas), acesa quando há veículos nesse estado, como as luzes do painel de um carro. Tocar numa luz filtra a lista.
- **Tablet partilhado (modo bancada):** o tablet fica na oficina e cada mecânico entra com o seu nome e PIN. O que regista fica em nome dele, e a sessão termina sozinha se o tablet ficar parado.
- **Nova entrada** a partir da matrícula. Se o veículo já cá esteve, aparece logo; se for novo, regista-se o veículo e o dono no mesmo passo.
- **Folha de obra:**
  - estado da reparação, escolhido com um toque (entregar pede um segundo, porque fecha a folha);
  - peças, mão de obra (em horas) e outros custos, com os totais e o IVA calculados ao cêntimo;
  - observações e conselhos para o cliente (manutenção preventiva);
  - uma folha entregue fica fechada.
- **Autocaravanas:** além da marca e do modelo do chassis, guarda-se a marca da célula habitacional.
- **Gestão:**
  - histórico de folhas;
  - clientes, incluindo estrangeiros;
  - veículos, com o histórico de visitas;
  - equipa (PIN e/ou email);
  - definições da oficina (dados, taxa de IVA e tablets).
- **Registo público** de oficinas novas.
- **Temas claro e escuro.** Pensada para tablet (alvos de toque grandes), funciona também no computador e no telemóvel. É uma PWA: pode ser instalada no ecrã inicial.

A Bancada **não emite faturas**: em Portugal, isso exige software certificado pela Autoridade Tributária. Calcula os totais e o IVA; a fatura é emitida no programa de faturação da oficina.

<p align="center">
  <img src="docs/imagens/folha.png" alt="Folha de obra com linhas, totais com IVA e notas" width="49%">
  <img src="docs/imagens/bancada-pin.png" alt="Tablet partilhado: o mecânico escreve o seu PIN" width="49%">
</p>

## Estado do projeto

**Feito:**
- API multi-oficina com sessões seguras e modo bancada;
- base de dados com o isolamento entre oficinas garantido também pelas chaves estrangeiras;
- interface completa para tablet, computador e telemóvel;
- 54 testes automáticos contra um SQL Server real;
- integração contínua no GitHub;
- arranque para testes com um duplo clique no Mac (`Iniciar Bancada.command`);
- auditoria de qualidade, segurança, desempenho e acessibilidade (repetida a 28/09/2026 sobre a versão atual) e revisão de código, com as provas e os scripts para as repetir;
- proposta de publicação num servidor (HTTPS, cópias de segurança cifradas, restauro, retrocesso), validada numa cópia em `localhost`;
- documentação e relatório.

**Ainda não feito:**
- instalação na oficina e testes com os mecânicos;
- versão online: a proposta está pronta ([`docs/infraestrutura.md`](docs/infraestrutura.md)), mas falta servidor, domínio e certificado;
- migrações da base de dados e cópias de segurança a correr (os scripts existem, ainda não estão em uso);
- correção dos achados abertos da auditoria e da revisão de código;
- integração com programas de faturação.

A lista completa está no [`docs/analise.md`](docs/analise.md).

## Stack

| Parte | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 8, React Router 7, PWA (vite-plugin-pwa), CSS próprio com tokens, fontes Barlow self-hosted |
| Backend | Node.js 22, Express 5, JWT em cookies httpOnly, bcrypt, helmet, express-rate-limit |
| Base de dados | SQL Server 2022 (Docker), modelo relacional normalizado |
| Qualidade | 54 testes com `node:test` contra SQL Server real, GitHub Actions (testes, lint e build, e validação dos scripts, do compose e da imagem), oxlint, GitGuardian |
| Infraestrutura | Docker Compose; imagem única com a API a servir o frontend (mesma origem). Proposta para um servidor: Caddy (HTTPS), SQL Server Express, `infra/` (ainda não em uso) |

## Segurança

- **Isolamento entre oficinas** em três sítios:
  - na API: todas as consultas filtram pela oficina da sessão;
  - na base de dados: chaves estrangeiras compostas;
  - nos testes automáticos.
- **Sessão:** fica num cookie `httpOnly` com `SameSite=Strict`. Há verificação de origem contra CSRF e uma `Content-Security-Policy` rigorosa.
- **Autoria:** a autoria das folhas e das linhas vem sempre da sessão. Desativar uma conta ou mudar a password corta as sessões na hora.
- **Login e passwords:**
  - passwords com bcrypt (custo 12);
  - login com tempo constante;
  - limite de tentativas por conta e por IP;
  - PIN bloqueado após 5 falhas.
- **Base de dados:** a API usa um login só de dados, sem permissão para apagar clientes, veículos, colaboradores nem folhas. O soft delete é garantido pela própria base de dados.
- **Segredos:** só no `.env`, nunca no código. O SQL Server só é acessível a partir da própria máquina.

A análise completa (o que foi encontrado, o risco e o que mudou) está em [`docs/analise.md`](docs/analise.md).

## Base de dados

Seis tabelas: `Oficina`, `Colaborador`, `Cliente`, `Veiculo`, `Folha_Obra` e `Linha_Reparacao`. O esquema está em [`backend/database/schema.sql`](backend/database/schema.sql), com comentários a explicar cada decisão, e o diagrama no anexo do relatório.

## Como pôr a Bancada a funcionar

Este guia leva-te de um computador sem nada instalado até à Bancada aberta no browser, com dados de demonstração (clientes, veículos e folhas fictícios). Serve para **macOS** e para **Windows**. Não precisas de saber programar: basta copiar os comandos, um de cada vez, e confirmar que aparece o que o guia diz. Se alguma coisa correr mal, procura a mensagem de erro em [Problemas comuns](#problemas-comuns).

Qual caminho escolher:

| Se tens... | e queres... | Faz |
|---|---|---|
| um **Mac** | só experimentar a Bancada | [duplo clique em `Iniciar Bancada.command`](#no-mac-com-um-duplo-clique): só precisas do Docker Desktop |
| um **Windows** | só experimentar a Bancada | o [passo a passo](#passo-a-passo-primeira-vez) com a [alternativa tudo em containers](#alternativa-tudo-em-containers) (ainda não há um script de duplo clique para o Windows) |
| um Mac ou um Windows | mexer no código | o [início rápido](#início-rápido-para-quem-já-tem-docker-desktop-nodejs-22-e-git) ou o passo a passo |

A primeira vez demora mais, porque há programas para instalar e a base de dados para descarregar. Da segunda vez em diante é muito mais rápido: ver [Da próxima vez](#da-próxima-vez).

### No Mac, com um duplo clique

Para experimentar a Bancada num Mac só precisas do **Docker Desktop**. Não é preciso instalar o Node.js nem escrever comandos. É a forma mais simples de a testar, e serve as vezes que quiseres: da segunda vez em diante, é só outro duplo clique. É só para testes no teu computador (não publica nada na internet).

1. Instala o Docker Desktop (passo 1, no macOS) e descarrega o projeto (passo 2).
2. Abre a pasta do projeto no Finder e faz duplo clique em **`Iniciar Bancada.command`**.
3. Abre-se uma janela do Terminal que trata de tudo:
   - abre o Docker Desktop, se estiver fechado;
   - cria o `.env` com passwords aleatórias;
   - arranca a base de dados, a API e a interface, em containers;
   - cria os dados de demonstração (fictícios);
   - abre o browser em **http://localhost:3000**.

   Da primeira vez demora vários minutos.
4. Entra com o email e a password que a janela mostra. Das vezes seguintes, a janela pergunta se continuas com os mesmos dados ou se crias dados novos, com uma password nova.

**Para parar**, carrega em Enter nessa janela, ou fecha-a. Os dados ficam guardados para a próxima vez.

A janela também resolve sozinha os problemas mais comuns:
- o Docker Desktop fechado;
- um `.env` antigo ou incompleto;
- uma base de dados criada antes com outra password (pergunta antes de a apagar);
- containers de outra cópia do projeto.

> **Se o macOS não deixar abrir o ficheiro** ("programador não identificado"): acontece quando o projeto veio num ZIP descarregado pelo browser. Carrega com o botão direito no ficheiro, depois em *Abrir* e outra vez em *Abrir*. Nas versões mais recentes do macOS, vai a *Definições do Sistema* → *Privacidade e segurança*: mais abaixo aparece um botão para o abrir na mesma.
>
> **Se o duplo clique abrir o ficheiro num editor de texto** em vez de o correr: no Terminal, na pasta do projeto, escreve `chmod +x "Iniciar Bancada.command"` e tenta outra vez.

### Início rápido (para quem já tem Docker Desktop, Node.js 22 e Git)

Com o Docker Desktop aberto, num terminal (Terminal no macOS, PowerShell no Windows), um comando de cada vez:

```bash
git clone https://github.com/TiagoPereira001/Projeto_final_UBI.git
cd Projeto_final_UBI
node backend/scripts/criar-env.js
docker compose up -d
cd backend
npm install
npm run db:setup
npm run db:seed
npm run dev
```

Noutro terminal, na pasta `Projeto_final_UBI`:

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173 e entra com o email e a password que o `npm run db:seed` mostrou.

### Passo a passo (primeira vez)

Duas palavras que vão aparecer muito:

- **Terminal**: a janela onde se escrevem comandos. No **macOS** é a aplicação *Terminal* (carrega em `Cmd + Espaço`, escreve `Terminal` e carrega em Enter). No **Windows** é o *PowerShell* (abre o menu Iniciar, escreve `PowerShell` e abre-o normalmente, **não** como administrador).
- **Comando**: uma linha para copiar para o terminal e confirmar com Enter. Escreve um comando de cada vez e espera que acabe (quando acaba, o terminal fica outra vez à espera) antes de escreveres o seguinte.

Os comandos são iguais no macOS e no Windows, exceto quando o guia diz o contrário.

#### Passo 1: instalar três programas

| Programa | Para quê |
|---|---|
| **Docker Desktop** | corre a base de dados (SQL Server) dentro de um *container*, uma espécie de caixa isolada, sem a instalar no computador. É gratuito para uso pessoal e para ensino |
| **Node.js 22** | corre a API e a interface da Bancada. A versão 22 é a que os testes automáticos usam |
| **Git** | descarrega o projeto do GitHub (também dá para usar um ZIP: ver o passo 2) |

<details>
<summary><strong>No macOS</strong></summary>

1. **Vê que processador tem o teu Mac.** Abre o menu Apple (a maçã no canto superior esquerdo) → *Acerca deste Mac*. Se aparece **Chip** (Apple M1, M2, M3...), o teu Mac é *Apple Silicon*. Se aparece **Processador** (Intel), é *Intel*.
2. **Docker Desktop.** Vai a https://www.docker.com/products/docker-desktop/, carrega em *Download Docker Desktop* e escolhe a versão para Mac com **Apple Silicon** ou com **Intel**, conforme o ponto anterior. Abre o ficheiro `.dmg` que descarregaste e arrasta o Docker para a pasta *Aplicações*. (O Docker Desktop precisa de um macOS recente: se recusar instalar, atualiza o macOS em *Definições do Sistema* → *Geral* → *Atualização de software*.)
3. **Abre o Docker Desktop** (pasta *Aplicações* → *Docker*). Aceita os termos e, se ele pedir a password do Mac, escreve-a (é para acabar a instalação). Se pedir para iniciar sessão ou criar conta, podes saltar (*Skip*): não precisas de conta. Espera até aparecer **Engine running** no canto inferior esquerdo da janela.
4. **Só nos Mac com Apple Silicon:** o SQL Server só existe para processadores Intel, e o Docker traduz com o *Rosetta*. No Docker Desktop, abre *Settings* (a roda dentada, em cima à direita) → *General* e confirma que a opção **Use Rosetta for x86_64/amd64 emulation on Apple Silicon** está ligada. Se mudaste alguma coisa, carrega em *Apply & restart*. Se o macOS pedir para instalar o Rosetta, aceita.
5. **Node.js.** Vai a https://nodejs.org/en/download, escolhe a versão **v22** (LTS) e descarrega o *macOS Installer (.pkg)*. Abre-o e vai carregando em *Continuar* até ao fim.
6. **Git.** No Terminal, escreve `git --version` e carrega em Enter. Se aparecer uma versão (`git version 2...`), já tens o Git. Se o Mac abrir uma janela a propor instalar as *ferramentas da linha de comandos*, carrega em **Instalar** e espera que acabe (pode demorar uns minutos).
7. **Confirma** no Terminal. Cada comando tem de mostrar um número de versão, sem erros:

   ```bash
   docker --version
   node -v
   npm -v
   git --version
   ```

   O `node -v` tem de começar por `v22` (ou um número maior).

</details>

<details>
<summary><strong>No Windows</strong></summary>

1. **Confirma que o teu Windows serve.** Precisas do Windows 10 (versão 22H2) ou do Windows 11, de 64 bits. Vês isto em *Definições* → *Sistema* → *Acerca de*. Computadores com processador ARM (Snapdragon) não foram testados.
2. **Confirma que a virtualização está ligada.** Abre o *Gestor de Tarefas* (`Ctrl + Shift + Esc`) → *Desempenho* → *CPU*. Em baixo, a **Virtualização** tem de estar ativada. Se estiver desativada, é preciso ligá-la na BIOS/UEFI do computador: procura na internet "ativar virtualização" com a marca e o modelo do teu computador.
3. **Docker Desktop.** Vai a https://www.docker.com/products/docker-desktop/, carrega em *Download Docker Desktop* e escolhe a versão para Windows **AMD64** (é a da maioria dos computadores). Corre o instalador e deixa ligada a opção **Use WSL 2 instead of Hyper-V**. No fim, reinicia o computador se ele pedir.
4. **Abre o Docker Desktop** (menu Iniciar → *Docker Desktop*). Aceita os termos. Se pedir para iniciar sessão ou criar conta, podes saltar (*Skip*). Se aparecer um aviso a dizer que o **WSL** precisa de ser atualizado, abre o PowerShell **como administrador** (menu Iniciar, escreve `PowerShell`, botão direito → *Executar como administrador*), escreve `wsl --update`, espera que acabe e reinicia o computador. Espera até o Docker Desktop mostrar **Engine running** no canto inferior esquerdo.
5. **Node.js.** Vai a https://nodejs.org/en/download, escolhe a versão **v22** (LTS) e descarrega o *Windows Installer (.msi)*. Abre-o e vai carregando em *Next* até ao fim: as opções que vêm escolhidas servem (não é preciso ligar a das *Tools for Native Modules*).
6. **Git.** Vai a https://git-scm.com/download/win, descarrega o instalador para Windows de 64 bits (*x64*), abre-o e vai carregando em *Next* até ao fim (as opções que vêm escolhidas servem).
7. **Fecha o PowerShell e abre-o outra vez** (para ele encontrar os programas novos). Confirma que cada comando mostra um número de versão, sem erros:

   ```powershell
   docker --version
   node -v
   npm -v
   git --version
   ```

   O `node -v` tem de começar por `v22` (ou um número maior). Se o `npm -v` der um erro a falar de scripts desativados, vê o [problema 4](#problemas-comuns).

</details>

#### Passo 2: descarregar o projeto

No terminal (que abre na tua pasta pessoal), um comando de cada vez:

```bash
git clone https://github.com/TiagoPereira001/Projeto_final_UBI.git
cd Projeto_final_UBI
```

O primeiro cria a pasta `Projeto_final_UBI`, com o projeto lá dentro; o segundo entra nela. **Todos os comandos dos passos seguintes são para escrever dentro desta pasta** (a que tem o ficheiro `docker-compose.yml`). Para confirmares onde estás, escreve `ls`: tem de aparecer o `docker-compose.yml` na lista.

> **Sem Git?** Na página do projeto no GitHub, carrega em *Code* → *Download ZIP* e descompacta o ficheiro. A pasta chama-se `Projeto_final_UBI-main`. Para abrires um terminal dentro dela: no macOS, escreve `cd ` (com um espaço no fim) no Terminal, arrasta a pasta para a janela e carrega em Enter; no Windows, abre a pasta no Explorador de Ficheiros, clica na barra do endereço, escreve `powershell` e carrega em Enter. Confirma com `ls` que o `docker-compose.yml` está lá (no Windows, ao descompactar, às vezes fica uma pasta com o mesmo nome dentro de outra: entra na de dentro).

#### Passo 3: criar o ficheiro de configuração (`.env`)

A Bancada precisa de um ficheiro chamado `.env`, com as passwords da base de dados e um segredo para as sessões. Este comando cria-o com valores aleatórios e seguros, só para o teu computador:

```bash
node backend/scripts/criar-env.js
```

Deve aparecer `Criei o .env com passwords e um JWT_SECRET novos, só para este computador.` Se aparecer `Já existe um .env na pasta do projeto: não mexi nele.`, já o tinhas criado antes: podes seguir.

- Não precisas de saber estas passwords: o Docker e a API vão buscá-las ao `.env` sozinhos.
- **Nunca envies nem publiques o `.env`.** O Git já está configurado para o ignorar.
- É um ficheiro escondido (o nome começa por um ponto). Para o veres: no Finder, `Cmd + Shift + .`; no Explorador de Ficheiros do Windows 11, *Ver* → *Mostrar* → *Itens ocultos* (no Windows 10, *Ver* → *Itens ocultos*).

<details>
<summary>Preferes criar o <code>.env</code> à mão?</summary>

1. Copia o modelo: no macOS, `cp .env.example .env`; no Windows, `Copy-Item .env.example .env`.
2. Abre a cópia: no macOS, `open -e .env`; no Windows, `notepad .env`.
3. Preenche as três linhas que estão vazias e grava:
   - `DB_ADMIN_PASSWORD=` e `DB_PASSWORD=`: passwords com **pelo menos 8 caracteres, com maiúsculas, minúsculas, algarismos e um símbolo** (por exemplo `_` ou `-`). Não uses `$`, `#`, espaços nem aspas.
   - `JWT_SECRET=`: pelo menos 32 caracteres ao acaso (letras e algarismos). Com o Node.js instalado, este comando gera um (copia o resultado):

     ```bash
     node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
     ```

</details>

> **Importante:** depois do passo 4, não mudes o `DB_ADMIN_PASSWORD`. O SQL Server fica com a password do primeiro arranque (ver o [problema 9](#problemas-comuns)).

#### Passo 4: arrancar a base de dados

1. **Confirma que o Docker Desktop está aberto e diz Engine running.** Se não estiver, o comando seguinte dá erro (é o [problema 1](#problemas-comuns)).
2. No terminal, na pasta do projeto:

   ```bash
   docker compose up -d
   ```

   Da primeira vez, o Docker descarrega o SQL Server (ocupa cerca de 2,3 GB no disco): pode demorar vários minutos. No fim, a linha do `bancada_sql` diz `Started` (ou `Running`, se já estava a correr).
3. Confirma que a base de dados está pronta:

   ```bash
   docker compose ps
   ```

   Na coluna `STATUS`, o `bancada_sql` tem de mostrar **(healthy)**. Se ainda disser `(health: starting)`, espera meio minuto e repete o comando. Nos Mac com Apple Silicon, o primeiro arranque é mais lento.

O SQL Server fica só acessível a partir deste computador, nunca da rede.

#### Passo 5: preparar e arrancar a API

Ainda no mesmo terminal, um comando de cada vez:

```bash
cd backend
npm install
npm run db:setup
npm run db:seed
npm run dev
```

| Comando | O que faz | O que deves ver no fim |
|---|---|---|
| `cd backend` | entra na pasta da API | nada (é normal) |
| `npm install` | descarrega as bibliotecas de que a API precisa (só da primeira vez) | `added ... packages` e, normalmente, `found 0 vulnerabilities` |
| `npm run db:setup` | cria a base de dados, as tabelas e o login que a API usa | `Base de dados Bancada pronta. A API entra como bancada_app.` Antes disso pode aparecer `À espera do SQL Server (1/20)...`, o que é normal |
| `npm run db:seed` | cria a oficina Duarte & Raposo com clientes, veículos e folhas **fictícios** | o email e a password do gestor, os PINs de três mecânicos e `Guarda estes dados: não voltam a ser mostrados.` |
| `npm run dev` | arranca a API | `API da Bancada a correr em http://localhost:3000` |

Se já tinhas feito este passo antes, o `db:setup` diz `A base de dados Bancada já existia: só atualizei o login bancada_app.` (está certo) e o `db:seed` diz `Já existe uma conta ...` (ver [Recomeçar do zero](#recomeçar-do-zero)).

**Guarda o que o `npm run db:seed` mostrou** (numa nota, por exemplo): a password do gestor e os PINs não voltam a aparecer. Se os perderes, vê [Recomeçar do zero](#recomeçar-do-zero).

**Deixa este terminal aberto**, com a API a correr: se o fechares, a API desliga-se.

> Se o sistema perguntar se o Node.js pode aceitar ligações da rede (a Firewall do Windows, ou a do macOS se a tiveres ligada), podes recusar (*Cancelar*): a Bancada funciona na mesma neste computador.

#### Passo 6: abrir a Bancada

1. Abre um **segundo** terminal: no macOS, com o Terminal à frente, carrega em `Cmd + N` (janela nova); no Windows, abre outro PowerShell pelo menu Iniciar. O terminal novo abre na tua pasta pessoal, por isso entra outra vez na pasta do projeto e arranca a interface, um comando de cada vez:

   ```bash
   cd Projeto_final_UBI
   cd frontend
   npm install
   npm run dev
   ```

   (Se usaste o ZIP no passo 2, entra na pasta como fizeste lá e depois escreve `cd frontend`.)

   No fim deve aparecer `VITE ... ready` e a linha `Local:   http://localhost:5173/`. Deixa também este terminal aberto.
2. No browser (Chrome, Edge, Safari ou Firefox), abre **http://localhost:5173**. Escreve o endereço exatamente assim, com `localhost`: por segurança, a API recusa pedidos que venham de outros endereços (ver o [problema 13](#problemas-comuns)).
3. Entra com o **email** e a **password** do gestor que o `npm run db:seed` mostrou.
4. Deves ver o quadro da oficina, com as quatro luzes do tablier e cinco veículos (fictícios) na oficina.

Para experimentar o **modo bancada** (o tablet partilhado dos mecânicos): *Definições* → *Usar este dispositivo como bancada*. Aparece "Quem vai trabalhar?": toca num mecânico e escreve o PIN dele. Para voltares a entrar como gestor, usa *Entrar com email*. Para o computador deixar de ser a bancada: *Definições* → *Desligar neste dispositivo*.

### Da próxima vez

**No Mac com o duplo clique:** faz outra vez duplo clique em `Iniciar Bancada.command`. Não é preciso mais nada.

No resto dos casos, com o Docker Desktop aberto (e a dizer Engine running):

1. Terminal 1, na pasta do projeto:

   ```bash
   docker compose up -d
   cd backend
   npm run dev
   ```

2. Terminal 2, na pasta do projeto:

   ```bash
   cd frontend
   npm run dev
   ```

3. Abre http://localhost:5173.

Não é preciso repetir o `npm install`, o `db:setup` nem o `db:seed`.

**Para parar:** em cada terminal, carrega em `Ctrl + C` (também no Mac é `Ctrl`, não `Cmd`). Se o Windows perguntar se queres terminar o trabalho (`Y/N` ou `S/N`), responde `Y` ou `S`. Depois, na pasta do projeto, `docker compose stop`. Os dados ficam guardados para a próxima vez.

**Para ir buscar a versão mais recente do projeto:** na pasta do projeto, `git pull`, e depois `npm install` outra vez nas pastas `backend` e `frontend`.

### Alternativa: tudo em containers

(No Mac, o `Iniciar Bancada.command` faz tudo isto por ti, incluindo o `.env`.)

Em vez dos passos 5 e 6, o Docker pode correr também a API e a interface já compilada. Serve para experimentar a Bancada sem instalar o Node.js, mas as alterações ao código só aparecem depois de voltar a construir tudo. Precisas na mesma do `.env` do passo 3 (sem Node.js, cria-o à mão). Não uses este modo ao mesmo tempo que os passos 5 e 6: a porta 3000 é a mesma. No Mac, o [`Iniciar Bancada.command`](#no-mac-com-um-duplo-clique) faz isto tudo com um duplo clique.

```bash
docker compose --profile app up -d --build
docker exec bancada_app node backend/scripts/seed.js
```

1. O primeiro comando constrói a aplicação (da primeira vez demora uns minutos) e arranca-a com a base de dados.
2. Antes do segundo, espera que `docker logs bancada_app` mostre `API da Bancada a correr em http://localhost:3000`: a API só arranca depois de preparar a base de dados.
3. O segundo cria os dados de demonstração e mostra o email, a password e os PINs.
4. Abre **http://localhost:3000** (neste modo é a porta 3000, não a 5173).

Para parar: `docker compose --profile app stop`. Para voltar a arrancar: `docker compose --profile app up -d`.

### Correr os testes (opcional)

Com a base de dados a correr (passo 4), na pasta `backend`:

```bash
npm test
```

No fim deve aparecer `# pass 54` e `# fail 0`. Os testes usam uma base de dados própria (`Bancada_Teste`) e nunca tocam na de desenvolvimento. Para verificar a interface, na pasta `frontend`: `npm run lint` e depois `npm run build`.

### Recomeçar do zero

- **Perdeste a password do gestor ou os PINs**, ou o `db:seed` diz `Já existe uma conta ...`: na pasta `backend`, corre `npm run db:reset` e depois `npm run db:seed`. Atenção: isto apaga todos os dados da base de dados de desenvolvimento.
- **Apagar também o SQL Server do Docker** (por exemplo, depois de mudar o `DB_ADMIN_PASSWORD`): na pasta do projeto, `docker compose down -v`, e depois volta ao passo 4. Se quiseres passwords novas, apaga antes o `.env` e faz outra vez o passo 3.

### Problemas comuns

Dica: procura nesta página (`Cmd + F` no Mac, `Ctrl + F` no Windows) um pedaço da mensagem que te apareceu.

#### No terminal e na instalação

1. **`failed to connect to the docker API at unix:///Users/.../.docker/run/docker.sock` ... `no such file or directory`** ou **`Cannot connect to the Docker daemon`** (macOS), ou uma mensagem com **`error during connect`** e **`dockerDesktopLinuxEngine`** (Windows).<br>
   O Docker Desktop não está aberto, ou ainda está a arrancar. Abre-o, espera até aparecer **Engine running** e repete o comando.
2. **`zsh: command not found: docker`** (macOS) ou **`O termo 'docker' não é reconhecido`** / **`The term 'docker' is not recognized`** (Windows). O mesmo com `node`, `npm` ou `git`.<br>
   O programa não está instalado, ou o terminal foi aberto antes de o instalares. Instala-o (passo 1), fecha o terminal e abre outro.
3. **`no configuration file provided: not found`** (no `docker compose`), **`npm error enoent Could not read package.json`** (no `npm`) ou **`Cannot find module`** com `criar-env.js` (no `node`).<br>
   Estás na pasta errada. O `docker compose` e o `node backend/scripts/criar-env.js` correm na pasta do projeto (a que tem o `docker-compose.yml`); os comandos `npm` correm na pasta `backend` ou `frontend`, conforme o passo. Para veres onde estás, escreve `pwd`; para subires uma pasta, `cd ..`.
4. **Windows: o `npm` dá um erro que fala em `npm.ps1` e em scripts desativados** (em inglês, `running scripts is disabled on this system`).<br>
   O PowerShell bloqueia os scripts do npm por omissão. Corre uma vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, responde `S` (ou `Y`) e repete o comando.
5. **Windows: o Docker Desktop fala em WSL, ou não arranca.**<br>
   Num PowerShell como administrador, corre `wsl --update` e reinicia o computador. Se continuar, confirma a virtualização (ponto 2 da instalação no Windows).
6. **`process.loadEnvFile is not a function`**, ou o `node -v` mostra uma versão abaixo de 22.<br>
   O Node.js é antigo: instala a versão 22 (passo 1), fecha o terminal e abre outro.

#### Na base de dados

7. **`required variable DB_ADMIN_PASSWORD is missing a value: Define DB_ADMIN_PASSWORD no .env (ver .env.example)`**<br>
   Não há `.env` na pasta do projeto (tem de estar na pasta do projeto, não em `backend`). Faz o passo 3.
8. **O `bancada_sql` reinicia sem parar:** o `docker compose ps` mostra sempre `Up` há poucos segundos (ou `Restarting`), e o `docker compose logs db` mostra **`Password validation failed. The password does not meet SQL Server password policy requirements`**.<br>
   O `DB_ADMIN_PASSWORD` é fraco demais. Corre `docker compose down -v`, corrige a password no `.env` (ou apaga o `.env` e faz outra vez o passo 3) e repete o passo 4.
9. **O `npm run db:setup` fica um minuto a dizer `À espera do SQL Server` e acaba em `Login failed for user 'sa'`.**
   - Se mudaste o `DB_ADMIN_PASSWORD` depois do primeiro arranque, o SQL Server continua com a password antiga. Volta a pôr a antiga no `.env` ou, para recomeçar (apaga os dados), corre `docker compose down -v` e repete os passos 4 e 5.
   - Se nunca mudaste nada, o SQL Server pode ainda estar a arrancar: espera que o `docker compose ps` mostre `(healthy)` e repete o `npm run db:setup`.
   - Se acabar em `Failed to connect to localhost:1433`, a base de dados não está a correr: faz o passo 4.
10. **`port is already allocated`** ou **`ports are not available`**, com a porta **1433**.<br>
    Já há outro SQL Server neste computador (é comum no Windows, com o SQL Server Express). Para-o (no Windows: menu Iniciar → *Serviços* → *SQL Server (...)* → *Parar*) e repete o passo 4. No Windows, se não houver outro SQL Server, a porta pode estar reservada pelo sistema: num PowerShell como administrador, corre `net stop winnat`; repete o passo 4 no teu terminal normal; e, no fim, corre `net start winnat` no PowerShell de administrador.
11. **Mac com Apple Silicon: o `bancada_sql` para ou reinicia, e o `docker compose logs db` não fala de passwords** (pode falar em `Invalid mapping of address`).<br>
    Falta o Rosetta: vê o ponto 4 da instalação no macOS, carrega em *Apply & restart* e repete o passo 4.

#### Na API e no browser

12. **`EADDRINUSE: address already in use`** com a porta `3000` (API), ou o `npm run dev` do frontend diz **`Port 5173 is in use, trying another one...`** e abre noutra porta (`5174`...).<br>
    Há outro programa a usar essa porta, muitas vezes um terminal antigo da Bancada (ou o modo tudo em containers, na porta 3000: para-o com `docker compose --profile app stop`). Fecha-o, para este com `Ctrl + C` e volta a correr `npm run dev`. A interface tem de ficar em `http://localhost:5173`: noutra porta, a entrada falha (problema 13).
13. **No login aparece `Pedido recusado: origem não permitida.`**<br>
    A página foi aberta noutro endereço. Abre exatamente http://localhost:5173 (no modo tudo em containers, http://localhost:3000), com `localhost` e não `127.0.0.1`. Se o Vite abriu noutra porta, vê o problema 12.
14. **No login aparece `Erro 502. Tenta outra vez.`, ou o browser diz que não consegue abrir a página.**
    - `Erro 502`: a API não está a correr. Volta ao terminal do passo 5 (se o fechaste, abre outro, entra na pasta `backend` do projeto e corre `npm run dev`).
    - O browser não abre a página: a interface não está a correr. Volta ao terminal do passo 6 e corre `npm run dev` na pasta `frontend`.
15. **No login aparece `Erro interno do servidor. Tenta outra vez daqui a pouco.`, e o terminal da API mostra `Failed to connect to localhost:1433`.**<br>
    A base de dados não está a correr (por exemplo, o Docker Desktop foi fechado). Abre o Docker Desktop e repete o passo 4. Não é preciso reiniciar a API: volta a ligar-se sozinha.
16. **`Demasiadas tentativas de entrada. Tenta outra vez daqui a 15 minutos.`**<br>
    É uma proteção: no máximo 8 tentativas de entrada com o mesmo email em 15 minutos, certas ou erradas. Espera, ou para a API (`Ctrl + C`) e volta a arrancá-la (`npm run dev`).

## Documentação

| Ficheiro | Para quê |
|---|---|
| [`PRODUCT.md`](PRODUCT.md) | o produto: utilizadores, problema, funcionalidades, o que ainda não existe |
| [`DESIGN.md`](DESIGN.md) | o sistema visual: cores, tipografia, componentes e regras |
| [`AI.md`](AI.md) | mapa do código para agentes de IA (e pessoas): regras que não se podem partir, API, comandos |
| [`CLAUDE.md`](CLAUDE.md) | memória do projeto para o Claude Code: decisões tomadas, preferências, estado atual |
| [`docs/analise.md`](docs/analise.md) | análise de segurança, desempenho e viabilidade |
| [`docs/auditoria.md`](docs/auditoria.md) | auditoria de qualidade, segurança, desempenho e acessibilidade (27/09/2026, repetida a 28/09/2026 na secção 14), com os scripts para a repetir |
| [`docs/infraestrutura.md`](docs/infraestrutura.md) | infraestrutura e publicação: proposta validada numa cópia (HTTPS, SQL Server Express, cópias de segurança, restauro, retrocesso). A Bancada ainda não está publicada |
| [`docs/revisao-codigo.md`](docs/revisao-codigo.md) | revisão de código e dívida técnica (27/09/2026): bugs encontrados, plano de refatoração por fases e exemplos validados, com as provas |
| [`Relatorio/`](Relatorio/) | relatório do projeto e documento das ferramentas usadas (e porquê), em LaTeX, com os PDF compilados |

## Fluxo de trabalho

- **Ramos:** `main` é a versão estável, `dev` é a integração, e cada tarefa tem o seu ramo, que entra no `dev` por pull request.
- **CI:** em cada pull request, o GitHub Actions corre os testes da API contra um SQL Server o lint + build do frontend, e valida os scripts, os ficheiros do Docker Compose e a construção da imagem. A GitGuardian procura segredos. Um PR só entra com tudo verde.
- **Antes de enviar:** `npm test` no backend e `npm run lint && npm run build` no frontend.

## Estrutura

```text
.
├── backend/            API REST (rotas, middleware, validação, scripts da BD, testes)
├── frontend/           React + Vite (PWA): páginas, componentes, estilos
├── docs/               análise de segurança, desempenho e viabilidade; auditoria; infraestrutura; imagens
├── infra/              proposta de publicação num servidor: Caddyfile e scripts (ainda não em uso)
├── Relatorio/          relatório e documento das ferramentas, em LaTeX, e anexos
├── .github/workflows/  integração contínua
├── PRODUCT.md          o produto
├── DESIGN.md           sistema visual
├── AI.md               mapa do projeto para agentes de IA
├── CLAUDE.md           memória do projeto para o Claude Code
├── AGENTS.md           ponto de entrada para outros agentes (aponta para o AI.md)
├── LICENSE             todos os direitos reservados
├── Iniciar Bancada.command   arranque com duplo clique no Mac (tudo em containers)
├── docker-compose.yml
├── docker-compose.prod.yml   proposta para um servidor (ainda não em uso)
└── Dockerfile
```

## Autor

**Tiago Dias Pereira** (nº 55019)
Projeto da UC de Projeto de Software Web, Móvel e na Nuvem, licenciatura em Informática Web, Móvel e na Nuvem, **Universidade da Beira Interior**, Covilhã.

## Direitos de autor

© 2026 Tiago Dias Pereira. Todos os direitos reservados.

O repositório está público para consulta e para a avaliação do projeto, mas não é código aberto. Sem autorização escrita do autor, não é permitido usar, copiar, alterar nem distribuir o código, no todo ou em parte. As bibliotecas e os ficheiros de terceiros mantêm as licenças dos seus autores. Os pormenores estão no [`LICENSE`](LICENSE).
