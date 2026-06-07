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
*   **Soft Deletes:** Não ocorrem eliminações físicas de clientes, veículos ou colaboradores na base de dados para preservar o histórico fiscal e de negócio; utiliza-se uma flag booleana (`ativo`).
*   **Manutenção Preventiva:** As folhas de obra suportam o registo de "Conselhos" (recomendações futuras geradas durante a intervenção para fidelização do cliente).

## 🛠️ Stack Tecnológica

O projeto utiliza uma arquitetura moderna e robusta, focada em portabilidade e escalabilidade:

*   **Frontend (Móvel):** [React.js](https://reactjs.org/) - PWA (Progressive Web App) desenhada para uso rápido no chão da oficina.
*   **Frontend (Gestão):** Dashboard Web para administração, cálculos de IVA e análise de histórico.
*   **Backend (API):** [Node.js](https://nodejs.org/) com Express - API REST para lógica de negócio e integração.
*   **Base de Dados:** [SQL Server](https://www.microsoft.com/pt-pt/sql-server/) - Armazenamento relacional robusto seguindo a 3ª Forma Normal (3NF).
*   **Contentorização:** [Docker](https://www.docker.com/) - Todo o ambiente de desenvolvimento é orquestrado via `docker-compose`.

## 🏗️ Estrutura da Base de Dados

O modelo relacional é composto por 5 tabelas principais:

1.  **Colaboradores:** `ID_colaborador` (PK), `Nome`, `Cargo`, `Password_hash`, `ativo`.
2.  **Clientes:** `ID_cliente` (PK), `nome`, `Contribuinte_NIF`, `Telefone`, `Morada`, `ativo`.
3.  **Autocaravanas:** `Matricula` (PK), `Marca_chassi`, `Modelo_chassi`, `marca_celula`, `Ano`, `ativo`, `ID_cliente` (FK).
4.  **Folhas de Obra:** `ID_folha` (PK), `Data_entrada`, `KMS_entrada`, `Estado_reparacao`, `Observacoes`, `Conselhos`, `Matricula` (FK), `ID_colaborador` (FK).
5.  **Linhas de Reparação:** `ID_linha` (PK), `Designacao`, `Quantidade`, `valor_unitario`, `Categoria`, `ID_folha` (FK).

## 📂 Estrutura do Projeto

```text
.
├── backend/                # API REST e Lógica de Negócio
│   ├── database/           # Scripts SQL e Schema
│   │   └── schema.sql
│   ├── server.js           # Ponto de entrada da API
│   ├── package.json
│   └── ...
├── Relatorio/              # Documentação Académica
│   ├── relatorio_projeto_final_55019.pdf
│   └── Anexos/             # Diagramas e Imagens
│       ├── Diagrama.png
│       ├── Esquema_relacional.png
│       └── ...
├── docker-compose.yml      # Orquestração de Containers (API + DB)
├── README.md               # Documentação Principal
└── Contexto.md             # Notas de Contexto do Projeto
```

## 🚀 Como Executar

O projeto está totalmente contentorizado. Para levantar o ambiente de desenvolvimento:

1.  Certifique-se que tem o **Docker** e **Docker Compose** instalados.
2.  Clone o repositório.
3.  Na raiz do projeto, execute:
    ```bash
    docker-compose up -d
    ```
4.  A base de dados SQL Server estará disponível na porta `1433`.

## 👨‍💻 Autor

*   **Tiago Pereira** (nº 55019)
*   Projeto desenvolvido para a UC de **Projeto de Software Web, Móvel e na Nuvem**.
*   **Universidade da Beira Interior (UBI)**, Covilhã, Portugal.

---
<p align="center">
  <em>"Transformando o trabalho manual em eficiência digital."</em>
</p>
