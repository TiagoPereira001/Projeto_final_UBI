<p align="center">
  <img src="Relatorio/Anexos/ubi-banner.png" alt="UBI Logo" max-width="100%">
</p>

<h1 align="center">🚐 Duarte & Raposo - Sistema de Gestão Digital</h1>

<p align="center">
  <strong>Projeto de Informática Web, Móvel e na Nuvem</strong><br>
  <em>Licenciatura em Informática Web, Móvel e na Nuvem @ Universidade da Beira Interior</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Em_Desenvolvimento-orange?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Backend-Completo-success?style=for-the-badge" alt="Backend">
  <img src="https://img.shields.io/badge/Frontend-Em_Curso-yellow?style=for-the-badge" alt="Frontend">
  <img src="https://img.shields.io/badge/Stack-React_%7C_Node.js_%7C_SQL_Server-blue?style=for-the-badge" alt="Stack">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker" alt="Docker">
</p>

---

## 📝 Resumo do Projeto

Este projeto nasce da necessidade real de digitalização da oficina **Duarte & Raposo**, localizada no Canhoso. Especializada em mecânica, eletricidade e, principalmente, **autocaravanas**, a oficina enfrenta os desafios típicos do uso de papel: perda de informação, dificuldade em consultar históricos e morosidade no cálculo de faturação.

A solução desenvolvida é um ecossistema digital composto por uma **PWA (Progressive Web App)** focada na agilidade dos mecânicos e um **Dashboard Web** para a gestão administrativa, permitindo o controlo total do fluxo de trabalho, desde a entrada do veículo até à entrega final ao cliente.

## 🎯 Objetivos Principais

*   **Digitalização Total:** Substituição definitiva das "folhas de obra" em papel por registos digitais persistentes.
*   **Foco em Autocaravanas:** Gestão detalhada diferenciando a marca do *chassis* e da *célula*, permitindo um acompanhamento técnico preciso.
*   **Agilidade Operacional:** Interface PWA que permite o registo de entradas e peças de forma rápida, otimizando o tempo dos mecânicos.
*   **Gestão de Faturação:** Automatização dos cálculos de IVA e agrupamento de peças/mão de obra para facilitar a emissão de faturas.
*   **Rastreabilidade (Auditing):** Controlo de qual colaborador realizou cada intervenção, garantindo responsabilidade e histórico claro.

## ⚖️ Regras de Negócio & Lógica

*   **Complexidade das Autocaravanas:** O sistema trata as autocaravanas como entidades complexas, exigindo o registo separado da marca/modelo do chassis (mecânica) e da marca da célula habitacional.
*   **Soft Deletes:** Não ocorrem eliminações físicas de clientes, veículos ou colaboradores na base de dados para preservar o histórico fiscal e de negócio; utiliza-se uma flag booleana (`ativo`). As Folhas de Obra e Linhas de Reparação são exceção — são registos históricos que não se desativam, só mudam de estado.
*   **Manutenção Preventiva:** As folhas de obra suportam o registo de "Conselhos" (recomendações futuras geradas durante a intervenção para fidelização do cliente).
*   **Entrada Rápida, Depois Detalhe:** Uma Folha de Obra pode ser criada só com os dados da entrada do veículo; as Linhas de Reparação (peças/serviços) são adicionadas depois, à medida que o mecânico trabalha.

## 🛠️ Stack Tecnológica

O projeto utiliza uma arquitetura moderna e robusta, focada em portabilidade e escalabilidade:

*   **Frontend (Móvel):** [React.js](https://reactjs.org/) - PWA (Progressive Web App) desenhada para uso rápido no chão da oficina.
*   **Frontend (Gestão):** Dashboard Web, na mesma aplicação React, para administração, cálculos de IVA e análise de histórico.
*   **Backend (API):** [Node.js](https://nodejs.org/) com Express - API REST para lógica de negócio e integração.
*   **Autenticação:** [JWT](https://jwt.io/) (JSON Web Token) com passwords encriptadas via `bcrypt`.
*   **Base de Dados:** [SQL Server](https://www.microsoft.com/pt-pt/sql-server/) - Armazenamento relacional robusto seguindo a 3ª Forma Normal (3NF).
*   **Contentorização:** [Docker](https://www.docker.com/) - Todo o ambiente de desenvolvimento é orquestrado via `docker-compose` (compatível com Intel e Apple Silicon).

## 🏗️ Estrutura da Base de Dados

O modelo relacional é composto por 5 tabelas principais:

1.  **Colaboradores:** `ID_Colaborador` (PK), `Nome`, `Cargo`, `Email`, `Password_Hash`, `Ativo`.
2.  **Clientes:** `ID_cliente` (PK), `nome`, `Contribuinte_NIF`, `Telefone`, `Morada`, `ativo`.
3.  **Autocaravanas:** `Matricula` (PK), `Marca_chassis`, `Modelo_chassis`, `marca_celula`, `Ano`, `ativo`, `ID_cliente` (FK).
4.  **Folhas de Obra:** `ID_folha` (PK), `Data_entrada`, `KMS_entrada`, `Estado_reparacao`, `Observacoes`, `Conselhos`, `Matricula` (FK), `ID_Colaborador` (FK).
5.  **Linhas de Reparação:** `ID_linha` (PK), `Designacao`, `Quantidade`, `valor_unitario`, `Categoria`, `ID_folha` (FK).

## 📡 API REST — Estado Atual

Todas as rotas abaixo (exceto o login) exigem autenticação via JWT (`Authorization: Bearer <token>`).

| Recurso | Rotas | Observações |
|---|---|---|
| **Auth** | `POST /api/auth/login`, `GET /api/auth/me` | Login com rate limiting (8 tentativas / 15 min) |
| **Colaboradores** | CRUD completo | Criar/editar/desativar restrito a `Cargo = Gestor` |
| **Clientes** | CRUD completo | |
| **Autocaravanas** | CRUD completo | Valida existência do cliente antes de criar |
| **Folhas de Obra** | CRUD + `POST /:id/linhas` | Criação com linhas usa transação SQL (tudo ou nada) |
| **Linhas de Reparação** | `DELETE /linhas/:id` | Delete físico (corrige enganos de registo) |

## 🔒 Segurança

Pontos implementados até ao momento:

*   Todas as rotas de negócio protegidas por **autenticação JWT**; criação/edição de colaboradores adicionalmente restrita por **autorização baseada em Cargo**.
*   Passwords nunca guardadas em texto simples (`bcrypt`, 10 salt rounds).
*   Segredos (password da BD, `JWT_SECRET`) fora do código, geridos por variáveis de ambiente (`.env`, nunca commitado) — a aplicação recusa-se a arrancar se faltarem.
*   **Rate limiting** no login, para mitigar ataques de força bruta.
*   Mensagens de erro genéricas para o cliente; detalhes técnicos ficam só nos logs do servidor.
*   Cabeçalhos HTTP de segurança via `helmet`; CORS restrito ao domínio do frontend.

## 📂 Estrutura do Projeto

```text
.
├── backend/                 # API REST e Lógica de Negócio
│   ├── database/            # Scripts SQL e Schema
│   │   └── schema.sql
│   ├── middleware/
│   │   └── auth.js          # Verificação de JWT e autorização por Cargo
│   ├── routes/               # Uma rota por entidade (colaboradores, clientes, ...)
│   ├── db.js                 # Pool de ligação ao SQL Server
│   ├── server.js              # Ponto de entrada da API
│   ├── .env                  # Segredos locais (NUNCA commitado)
│   └── package.json
├── frontend/                 # PWA (mecânicos) + Dashboard (gestão), React + Vite
│   ├── src/
│   │   ├── context/           # AuthContext (sessão/login)
│   │   ├── components/        # RotaProtegida, etc.
│   │   ├── pages/              # Login, Oficina, Dashboard
│   │   └── lib/                # Cliente da API
│   └── package.json
├── Relatorio/                 # Documentação Académica
│   ├── relatorio_projeto_final_55019.tex
│   ├── relatorio_projeto_final_55019.pdf
│   └── Anexos/                 # Diagramas e Imagens
├── docker-compose.yml         # Orquestração de Containers (API + DB)
├── .env.example                # Modelo de variáveis de ambiente (sem segredos)
├── README.md                   # Documentação Principal
└── Contexto.md                 # Notas de Contexto do Projeto
```

## 🚀 Como Executar

### 1. Base de dados (Docker)

1.  Certifique-se que tem o **Docker** e **Docker Compose** instalados.
2.  Clone o repositório.
3.  Copie o `.env.example` para `.env` (na raiz) e para `backend/.env`, preenchendo `DB_PASSWORD` e `JWT_SECRET` com valores próprios (nunca os valores de exemplo).
4.  Na raiz do projeto, execute:
    ```bash
    docker-compose up -d
    ```
5.  Na primeira vez, é preciso correr o `schema.sql` dentro do container (ver secção seguinte).
6.  A base de dados SQL Server estará disponível na porta `1433`.

> **Nota (Mac Apple Silicon):** o SQL Server não tem imagem nativa ARM; o `docker-compose.yml` já força `platform: linux/amd64`, que corre por emulação Rosetta 2. É normal demorar um pouco mais a arrancar.

### 2. Backend (API)

```bash
cd backend
npm install
npm run dev
```

A API fica disponível em `http://localhost:3000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

A app fica disponível em `http://localhost:5173`.

## 👨‍💻 Autor

*   **Tiago Pereira** (nº 55019)
*   Projeto desenvolvido para a UC de **Projeto de Software Web, Móvel e na Nuvem**.
*   **Universidade da Beira Interior (UBI)**, Covilhã, Portugal.

---
<p align="center">
  <em>"Transformando o trabalho manual em eficiência digital."</em>
</p>