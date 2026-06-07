<p align="center">
  <img src="Relatorio/Anexos/ubi-banner.jpg" alt="UBI Logo" width="300">
</p>

<h1 align="center">🚐 Duarte & Raposo - Sistema de Gestão Digital</h1>

<p align="center">
  <strong>Projeto de Software Web, Móvel e na Nuvem</strong><br>
  <em>Licenciatura em Engenharia Informática @ Universidade da Beira Interior</em>
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
*   **Agilidade Operacional:** Interface PWA que permite o registo de entradas e peças em menos de 3 cliques, otimizando o tempo dos mecânicos.
*   **Gestão de Faturação:** Automatização dos cálculos de IVA e agrupamento de peças/mão de obra para facilitar a emissão de faturas.
*   **Rastreabilidade (Auditing):** Controlo de qual colaborador realizou cada intervenção, garantindo responsabilidade e histórico claro.

## 🛠️ Stack Tecnológica

O projeto utiliza uma arquitetura moderna e robusta, focada em portabilidade e escalabilidade:

*   **Frontend (PWA & Web):** [React.js](https://reactjs.org/) - Interface rápida e responsiva.
*   **Backend (API):** [Node.js](https://nodejs.org/) com Express - Lógica de negócio e integração.
*   **Base de Dados:** [SQL Server](https://www.microsoft.com/pt-pt/sql-server/) - Armazenamento relacional robusto com sistema de *Soft Delete*.
*   **Contentorização:** [Docker](https://www.docker.com/) - Todo o ambiente de desenvolvimento (API + DB) é orquestrado via `docker-compose`.

## 🏗️ Estrutura da Base de Dados

O modelo relacional foi desenhado seguindo a **3ª Forma Normal (3NF)** e inclui as seguintes entidades:

1.  **Colaboradores:** Gestão de acesso e cargos (Mecânicos/Gestores).
2.  **Clientes:** Dados fiscais e de contacto.
3.  **Autocaravanas:** Registo técnico detalhado e associação ao proprietário.
4.  **Folhas de Obra:** O coração do sistema, registando entradas, KMS, observações e estado da reparação.
5.  **Linhas de Reparação:** Detalhe de cada peça, serviço ou hora de mão de obra aplicada.

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
