Resumo do Projeto: Sistema de Gestão Digital - Oficina Duarte & Raposo

Autor: Tiago Dias Pereira (55019)
Curso: Informática Web, Móvel e na Nuvem (UBI)
Ambiente de Desenvolvimento: Arch Linux

1. O Problema e o Objetivo

A oficina Duarte & Raposo trabalha atualmente com um sistema analógico baseado em folhas de obra em papel. Isto gera desorganização, perda de histórico (dificuldade em consultar intervenções passadas), perdas de garantias e um processo de faturação manual moroso.
O objetivo é desmaterializar todo o processo através de um sistema informático desenhado à medida, com foco especial na reparação de autocaravanas (veículos complexos).

2. Arquitetura e Stack Tecnológica

Base de Dados: SQL Server.

Infraestrutura: Docker (via docker-compose) para isolamento do motor da base de dados e facilidade de deploy.

Backend: API REST em Node.js com o framework Express.

Frontend (Fase Seguinte):

PWA (React): Mobile-first, para os mecânicos registarem folhas de obra e peças diretamente no chão de oficina.

Dashboard Web (React): Para a gerência consultar faturas, IVA e histórico.

3. Decisões de Engenharia de Dados (O Raciocínio)

A modelação relacional cumpriu as regras da 3ª Forma Normal (3FN) e incorporou lógica de negócio específica:

Gestão de Autocaravanas: Divisão imperativa entre a mecânica (Marca_chassis, Modelo_chassis) e o habitáculo (marca_celula).

Rastreabilidade (Auditoria): Criação da tabela Colaboradores. Todas as folhas de obra têm de registar o ID_Colaborador que as criou, responsabilizando quem regista as peças.

Soft Deletes: Implementação do campo booleano Ativo em vez de apagar registos fisicamente (DELETE). Garante a integridade do histórico fiscal para a oficina.

Manutenção Preventiva: Criação do campo Conselhos nas Folhas de Obra para alertar clientes sobre reparações futuras.

4. O que já foi feito até ao momento (Status: Concluído)

[x] Levantamento de Requisitos a partir das folhas de papel reais.

[x] Criação do Diagrama Entidade-Relacionamento (DER).

[x] Derivação para Esquema Relacional e validação das chaves (PK/FK).

[x] Configuração do docker-compose.yml e arranque do SQL Server em Arch Linux.

[x] Criação da Base de Dados (OficinaDR) e tabelas através da injeção do ficheiro schema.sql.

[x] Ligação visual à BD validada usando a extensão SQL Server do VS Code.

[x] Criação do ficheiro de ignorados (.gitignore) para proteger passwords e ficheiros pesados.

[x] Relatório em LaTeX (Fase 1) redigido com rigor académico e estruturado com a documentação do modelo de dados.

[x] Backend: Inicialização do Node.js (server.js), conexão à BD validada e criação das duas primeiras rotas CRUD (GET e POST para Clientes).

5. Próximos Passos (Fase 2)

Concluir a API (Node.js):

Criar rotas CRUD para Autocaravanas.

Criar rotas CRUD para Colaboradores.

Criar rotas CRUD para Folhas_Obra e Linhas_reparacao (que exigem lógica transacional).

Desenvolver o Frontend (React):

Criar a interface Mobile para os mecânicos.

Criar o Dashboard Desktop para os gestores.

Finalizar o Relatório: Adicionar as secções de Testes, Rotas da API e capturas de ecrã da aplicação final ao documento LaTeX.
