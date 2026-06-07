# 🚐 Duarte & Raposo - Camper Management System

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-orange)
![Licence](https://img.shields.io/badge/Licence-MIT-blue)
![React](https://img.shields.io/badge/Frontend-React_PWA-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=nodedotjs&logoColor=white)

## 📌 Sobre o Projeto
Sistema de gestão integrada desenvolvido para a oficina **Duarte & Raposo** (Canhoso), especializada em reparações automóveis, elétricas e de autocaravanas. 

Este projeto visa a digitalização completa do fluxo de trabalho da oficina, substituindo as tradicionais folhas de obra em papel por uma plataforma segmentada. O sistema permite um rastreio eficiente das reparações, gestão de material aplicado e acompanhamento do histórico de cada veículo, com especial foco na complexidade das autocaravanas.

Projeto desenvolvido no âmbito da unidade curricular de **Projeto de Software Web, Móvel e na Nuvem** (3º Ano) da Universidade da Beira Interior.

## 🚀 Funcionalidades

O sistema divide-se em duas frentes principais:

### 1. Aplicação Móvel (PWA) - Para os Mecânicos
* **Registo Rápido:** Criação de novas folhas de obra em menos de 3 cliques.
* **Checklist de Entrada:** Registo do estado das baterias, águas, gás e danos exteriores aquando da receção da autocaravana.
* **Gestão de Peças:** Adição de componentes e horas de mão de obra em tempo real.
* **Captura de Imagens:** Upload de fotografias de avarias diretamente através da câmara do smartphone para anexar à folha de obra.

### 2. Dashboard Web - Para a Gestão Administrativa
* **Visão Geral:** Monitorização do estado das reparações ativas na oficina.
* **Base de Dados de Clientes e Veículos:** Pesquisa rápida de histórico de manutenções por matrícula.
* **Preparação para Faturação:** Exportação organizada dos dados da folha de obra (peças e horas) para facilitar a faturação final.

## 🛠️ Stack Tecnológica

* **Frontend (PWA & Web):** React.js
* **Backend (API):** Node.js, Express
* **Base de Dados:** SQL Server
* **Segurança:** Autenticação via JWT (JSON Web Tokens), bcrypt para encriptação de passwords.

## 📂 Estrutura do Repositório (Prevista)

\`\`\`text
/
├── frontend/             # Aplicação React (Dashboard Web e PWA)
│   ├── src/
│   │   ├── components/   # Componentes reutilizáveis (UI)
│   │   ├── pages/        # Ecrãs da aplicação
│   │   └── services/     # Integração com a API
├── backend/              # API REST em Node.js
│   ├── controllers/      # Lógica de negócio
│   ├── routes/           # Endpoints da API
│   ├── models/           # Estruturas da Base de Dados
│   └── middlewares/      # Validações de Segurança e JWT
└── docs/                 # Documentação, Diagramas ERD e Relatórios (LaTeX)
\`\`\`

## 👨‍💻 Equipa de Desenvolvimento
* **Tiago Pereira** (55019)

---
*Este repositório tem fins académicos e representa um protótipo em evolução.*
