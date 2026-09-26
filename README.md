<p align="center">
  <img src="Relatorio/Anexos/ubi-banner.png" alt="Universidade da Beira Interior" width="100%">
</p>

<h1 align="center">Bancada</h1>

<p align="center">
  <strong>Folhas de obra digitais para oficinas.</strong><br>
  <em>Projeto final de Informática Web, Móvel e na Nuvem · Universidade da Beira Interior</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Estado-Em_desenvolvimento-orange?style=for-the-badge" alt="Estado">
  <a href="https://github.com/TiagoPereira001/Projeto_final_UBI/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/TiagoPereira001/Projeto_final_UBI/ci.yml?style=for-the-badge&label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/Stack-React_%7C_Node.js_%7C_SQL_Server-blue?style=for-the-badge" alt="Stack">
  <img src="https://img.shields.io/badge/Docker-pronto-2496ED?style=for-the-badge&logo=docker" alt="Docker">
</p>

<p align="center">
  <img src="docs/imagens/quadro-tablet.png" alt="Quadro da oficina no tablet: luzes de estado e lista de veículos" width="100%">
</p>

## O que é

A Bancada substitui as folhas de obra em papel das oficinas. Cada entrada de um veículo passa a ser uma folha digital, onde os mecânicos registam as peças e as horas à medida que trabalham, e o gestor vê o que está na oficina, em que estado, quanto vale o trabalho e quem o fez.

O projeto nasceu na oficina **Duarte & Raposo** (Canhoso, Covilhã), especializada em mecânica, eletricidade e autocaravanas, onde as folhas de papel se perdiam, sujavam e obrigavam a fazer contas à mão. Começou como um sistema só para essa oficina e passou a servir **qualquer oficina**: cada uma regista-se sozinha e só vê os seus dados. A Duarte & Raposo é o primeiro cliente.

## Funcionalidades

- **Quadro da oficina** com um "tablier": uma luz por estado (abertas, em curso, a aguardar peças, prontas), acesa quando há veículos nesse estado, como as luzes do painel de um carro. Tocar numa luz filtra a lista.
- **Tablet partilhado (modo bancada):** o tablet fica na oficina e cada mecânico entra com o seu nome e PIN. O que regista fica em nome dele, e a sessão termina sozinha se o tablet ficar parado.
- **Nova entrada** a partir da matrícula: se o veículo já cá esteve aparece logo; se for novo, regista-se o veículo e o dono no mesmo passo.
- **Folha de obra:** estado da reparação, peças, mão de obra (em horas) e outros custos, totais com IVA calculados ao cêntimo, observações e conselhos para o cliente (manutenção preventiva). Uma folha entregue fica fechada.
- **Autocaravanas:** além da marca/modelo do chassis, guarda-se a marca da célula habitacional.
- **Gestão:** histórico de folhas, clientes (incluindo estrangeiros), veículos com o histórico de visitas, equipa (PIN e/ou email) e definições da oficina (dados e taxa de IVA).
- **Registo público** de oficinas novas.
- **Temas claro e escuro**, pensado para tablet (alvos de toque grandes) mas também para computador e telemóvel. É uma PWA: pode ser instalada no ecrã inicial.

A Bancada **não emite faturas**: em Portugal isso exige software certificado pela Autoridade Tributária. Calcula os totais e o IVA; a fatura é emitida no programa de faturação da oficina.

<p align="center">
  <img src="docs/imagens/folha.png" alt="Folha de obra com linhas, totais com IVA e notas" width="49%">
  <img src="docs/imagens/bancada-pin.png" alt="Tablet partilhado: o mecânico escreve o seu PIN" width="49%">
</p>

## Stack

| Parte | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 8, React Router 7, PWA (vite-plugin-pwa), CSS próprio com tokens, fontes Barlow self-hosted |
| Backend | Node.js 22, Express 5, JWT em cookies httpOnly, bcrypt, helmet, express-rate-limit |
| Base de dados | SQL Server 2022 (Docker), modelo relacional normalizado |
| Qualidade | Testes com `node:test` contra SQL Server real, GitHub Actions, oxlint |
| Infraestrutura | Docker Compose; imagem única com a API a servir o frontend (mesma origem) |

## Segurança

- **Isolamento entre oficinas** na API (todas as consultas filtram pela oficina da sessão), na base de dados (chaves estrangeiras compostas) e nos testes automáticos.
- Sessão em cookie `httpOnly` e `SameSite=Strict`, verificação de origem contra CSRF e `Content-Security-Policy` rigorosa.
- A autoria das folhas e das linhas vem sempre da sessão; desativar uma conta ou mudar a password corta as sessões na hora.
- Passwords com bcrypt (custo 12); login com tempo constante; rate limiting por conta e por IP; PIN bloqueado após 5 falhas.
- A API usa um login da base de dados só de dados, sem permissão para apagar clientes, veículos, colaboradores ou folhas (soft delete garantido pela própria BD).
- Segredos só no `.env` (nunca no código); SQL Server acessível apenas a partir da própria máquina.

A análise completa (o que foi encontrado, o risco e o que mudou) está em [`docs/analise.md`](docs/analise.md).

## Base de dados

Seis tabelas: `Oficina`, `Colaborador`, `Cliente`, `Veiculo`, `Folha_Obra` e `Linha_Reparacao`. O esquema está em [`backend/database/schema.sql`](backend/database/schema.sql), com comentários a explicar cada decisão.

## Como executar

Requisitos: Docker, Node.js 22 ou mais recente.

```bash
# 1. configuração: copiar o modelo e preencher as passwords e o JWT_SECRET
cp .env.example .env

# 2. base de dados (SQL Server em Docker, só acessível em 127.0.0.1)
docker compose up -d

# 3. API: preparar a BD e carregar a Duarte & Raposo com dados de demonstração
cd backend
npm install
npm run db:setup
npm run db:seed        # mostra a password do gestor e os PINs dos mecânicos
npm run dev            # http://localhost:3000

# 4. frontend (noutro terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

> **Mac com Apple Silicon:** o SQL Server não tem imagem ARM; o `docker-compose.yml` já usa `platform: linux/amd64` (emulação). O primeiro arranque demora um pouco mais.

**Tudo em containers** (API a servir o frontend compilado): `docker compose --profile app up -d --build` e abrir http://localhost:3000.

**Testes** (precisam do SQL Server a correr): `cd backend && npm test`. Usam uma base de dados própria (`Bancada_Teste`), nunca a de desenvolvimento.

Os dados criados pelo `npm run db:seed` (clientes, veículos, matrículas, folhas) são **fictícios**.

## Estrutura

```text
.
├── backend/            API REST (rotas, middleware, validação, scripts da BD, testes)
├── frontend/           React + Vite (PWA): páginas, componentes, estilos
├── docs/               análise de segurança, performance e viabilidade; imagens
├── Relatorio/          relatório em LaTeX e anexos
├── AI.md               mapa do projeto para agentes de IA
├── DESIGN.md           sistema visual (cores, tipografia, componentes)
├── PRODUCT.md          utilizadores e princípios do produto
├── docker-compose.yml
└── Dockerfile
```

Para trabalhar no código (pessoas ou agentes de IA), o [`AI.md`](AI.md) tem o mapa detalhado, as regras que não se podem partir e os comandos.

## Autor

**Tiago Dias Pereira** (nº 55019)
Projeto final da licenciatura em Informática Web, Móvel e na Nuvem, **Universidade da Beira Interior**, Covilhã.
