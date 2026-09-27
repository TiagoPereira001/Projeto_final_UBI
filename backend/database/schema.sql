/*
  Bancada: gestão digital para oficinas
  Esquema da base de dados (SQL Server 2022)

  A base de dados em si é criada pelo `npm run db:setup` (scripts/db-setup.js),
  que depois corre este ficheiro lá dentro. Para correr à mão (por exemplo na
  extensão SQL Server do VS Code): CREATE DATABASE Bancada; USE Bancada; e
  depois este ficheiro.

  Multi-oficina: cada oficina só vê os seus próprios dados. Todas as tabelas
  que pertencem a uma oficina guardam o ID_Oficina, e as chaves estrangeiras
  compostas (ID_Oficina, ID_...) garantem, na própria base de dados, que uma
  folha de obra nunca aponta para um veículo, cliente ou colaborador de outra
  oficina. A API filtra sempre por oficina; isto é a segunda linha de defesa.

  Convenções:
  - texto com NVARCHAR (nomes com acentos ou de clientes estrangeiros)
  - códigos (cargo, estado, tipo...) em minúsculas e sem acentos; o frontend
    é que os traduz para português bonito
  - datas em UTC (DATETIME2 + SYSUTCDATETIME)
  - nada se apaga a sério: clientes, veículos e colaboradores têm Ativo (soft delete)
*/

-- os índices filtrados (WHERE ...) exigem estas opções ligadas; alguns
-- clientes (como o sqlcmd) desligam-nas por omissão
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Oficinas (cada cliente da plataforma)
CREATE TABLE Oficina (
  ID_Oficina          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Oficina PRIMARY KEY,
  Nome                NVARCHAR(120)     NOT NULL,
  NIF                 CHAR(9)           NOT NULL CONSTRAINT UQ_Oficina_NIF UNIQUE,
  Morada              NVARCHAR(255)     NULL,
  Telefone            VARCHAR(20)       NULL,
  Email               NVARCHAR(254)     NULL,
  -- taxa de IVA por omissão das folhas novas (continente 23%, Madeira 22%, Açores 16%)
  Taxa_IVA            DECIMAL(5,2)      NOT NULL CONSTRAINT DF_Oficina_Taxa_IVA DEFAULT (23.00),
  -- contador para numerar as folhas de obra de cada oficina (1, 2, 3...)
  Ultimo_Numero_Folha INT               NOT NULL CONSTRAINT DF_Oficina_Ultimo_Numero DEFAULT (0),
  -- sobe de cada vez que o gestor "desliga os tablets": invalida todos os modos bancada
  Versao_Bancada      INT               NOT NULL CONSTRAINT DF_Oficina_Versao_Bancada DEFAULT (0),
  Ativo               BIT               NOT NULL CONSTRAINT DF_Oficina_Ativo DEFAULT (1),
  Criado_Em           DATETIME2(0)      NOT NULL CONSTRAINT DF_Oficina_Criado_Em DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT CK_Oficina_Taxa_IVA CHECK (Taxa_IVA BETWEEN 0 AND 100)
);
GO

-- 2. Colaboradores (gestores e mecânicos de cada oficina)
CREATE TABLE Colaborador (
  ID_Colaborador      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Colaborador PRIMARY KEY,
  ID_Oficina          INT               NOT NULL,
  Nome                NVARCHAR(100)     NOT NULL,
  Cargo               VARCHAR(20)       NOT NULL,
  -- email + password: para entrar no seu próprio dispositivo
  Email               NVARCHAR(254)     NULL,
  Password_Hash       CHAR(60)          NULL,
  -- PIN: para entrar no tablet partilhado da oficina (modo bancada)
  PIN_Hash            CHAR(60)          NULL,
  PIN_Falhas          TINYINT           NOT NULL CONSTRAINT DF_Colaborador_PIN_Falhas DEFAULT (0),
  PIN_Bloqueado_Ate   DATETIME2(0)      NULL,
  -- sobe quando a password muda ou o colaborador é desativado: as sessões antigas deixam de valer
  Versao_Sessao       INT               NOT NULL CONSTRAINT DF_Colaborador_Versao_Sessao DEFAULT (0),
  Ativo               BIT               NOT NULL CONSTRAINT DF_Colaborador_Ativo DEFAULT (1),
  Criado_Em           DATETIME2(0)      NOT NULL CONSTRAINT DF_Colaborador_Criado_Em DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT FK_Colaborador_Oficina FOREIGN KEY (ID_Oficina) REFERENCES Oficina (ID_Oficina),
  CONSTRAINT UQ_Colaborador_Oficina UNIQUE (ID_Oficina, ID_Colaborador),
  CONSTRAINT CK_Colaborador_Cargo CHECK (Cargo IN ('gestor', 'mecanico')),
  -- email e password andam sempre juntos
  CONSTRAINT CK_Colaborador_Credenciais CHECK (
    (Email IS NULL AND Password_Hash IS NULL) OR (Email IS NOT NULL AND Password_Hash IS NOT NULL)
  ),
  -- tem de haver pelo menos uma forma de entrar
  CONSTRAINT CK_Colaborador_Acesso CHECK (Password_Hash IS NOT NULL OR PIN_Hash IS NOT NULL),
  -- o gestor administra a oficina, por isso entra sempre com email e password
  CONSTRAINT CK_Colaborador_Gestor CHECK (Cargo <> 'gestor' OR Password_Hash IS NOT NULL)
);
GO

-- o email identifica a conta em toda a plataforma (o login não pede a oficina)
CREATE UNIQUE INDEX UX_Colaborador_Email ON Colaborador (Email) WHERE Email IS NOT NULL;
CREATE INDEX IX_Colaborador_Oficina ON Colaborador (ID_Oficina, Ativo) INCLUDE (Nome, Cargo);
GO

-- 3. Clientes
CREATE TABLE Cliente (
  ID_Cliente          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Cliente PRIMARY KEY,
  ID_Oficina          INT               NOT NULL,
  Nome                NVARCHAR(120)     NOT NULL,
  -- opcional: consumidor final ou cliente estrangeiro (turistas de autocaravana)
  NIF                 VARCHAR(20)       NULL,
  Telefone            VARCHAR(20)       NOT NULL,
  Email               NVARCHAR(254)     NULL,
  Morada              NVARCHAR(255)     NULL,
  Ativo               BIT               NOT NULL CONSTRAINT DF_Cliente_Ativo DEFAULT (1),
  Criado_Em           DATETIME2(0)      NOT NULL CONSTRAINT DF_Cliente_Criado_Em DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT FK_Cliente_Oficina FOREIGN KEY (ID_Oficina) REFERENCES Oficina (ID_Oficina),
  CONSTRAINT UQ_Cliente_Oficina UNIQUE (ID_Oficina, ID_Cliente)
);
GO

-- o mesmo NIF não aparece duas vezes nos clientes ativos da mesma oficina
CREATE UNIQUE INDEX UX_Cliente_Oficina_NIF ON Cliente (ID_Oficina, NIF) WHERE NIF IS NOT NULL AND Ativo = 1;
CREATE INDEX IX_Cliente_Oficina_Nome ON Cliente (ID_Oficina, Ativo, Nome);
GO

-- 4. Veículos (qualquer tipo; as autocaravanas guardam também a marca da célula)
CREATE TABLE Veiculo (
  ID_Veiculo          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Veiculo PRIMARY KEY,
  ID_Oficina          INT               NOT NULL,
  ID_Cliente          INT               NOT NULL,
  -- normalizada: só letras e números, em maiúsculas (AA-00-AA fica AA00AA)
  Matricula           VARCHAR(12)       NOT NULL,
  Tipo                VARCHAR(20)       NOT NULL,
  -- nas autocaravanas, Marca/Modelo são os do chassis (a parte mecânica)
  Marca               NVARCHAR(50)      NOT NULL,
  Modelo              NVARCHAR(60)      NULL,
  Ano                 SMALLINT          NULL,
  -- só autocaravanas: a marca da célula habitacional (Hymer, Adria, Dethleffs...)
  Marca_Celula        NVARCHAR(50)      NULL,
  Ativo               BIT               NOT NULL CONSTRAINT DF_Veiculo_Ativo DEFAULT (1),
  Criado_Em           DATETIME2(0)      NOT NULL CONSTRAINT DF_Veiculo_Criado_Em DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT FK_Veiculo_Cliente FOREIGN KEY (ID_Oficina, ID_Cliente) REFERENCES Cliente (ID_Oficina, ID_Cliente),
  CONSTRAINT UQ_Veiculo_Oficina UNIQUE (ID_Oficina, ID_Veiculo),
  CONSTRAINT CK_Veiculo_Tipo CHECK (Tipo IN ('ligeiro', 'comercial', 'autocaravana', 'motociclo', 'pesado', 'outro')),
  CONSTRAINT CK_Veiculo_Ano CHECK (Ano IS NULL OR Ano BETWEEN 1900 AND 2100),
  CONSTRAINT CK_Veiculo_Celula CHECK (Tipo = 'autocaravana' OR Marca_Celula IS NULL)
);
GO

-- a mesma matrícula só existe uma vez entre os veículos ativos de cada oficina
CREATE UNIQUE INDEX UX_Veiculo_Oficina_Matricula ON Veiculo (ID_Oficina, Matricula) WHERE Ativo = 1;
CREATE INDEX IX_Veiculo_Cliente ON Veiculo (ID_Oficina, ID_Cliente);
GO

-- 5. Folhas de obra (uma por entrada de um veículo na oficina)
CREATE TABLE Folha_Obra (
  ID_Folha            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Folha_Obra PRIMARY KEY,
  ID_Oficina          INT               NOT NULL,
  -- número da folha dentro da oficina (a folha nº 142 da Duarte & Raposo)
  Numero              INT               NOT NULL,
  ID_Veiculo          INT               NOT NULL,
  -- o cliente no dia da entrada: se o carro mudar de dono, o histórico não muda
  ID_Cliente          INT               NOT NULL,
  -- quem abriu a folha: vem sempre da sessão, nunca do que o browser envia
  ID_Colaborador      INT               NOT NULL,
  Data_Entrada        DATETIME2(0)      NOT NULL CONSTRAINT DF_Folha_Data_Entrada DEFAULT (SYSUTCDATETIME()),
  KMS_Entrada         INT               NULL,
  Estado              VARCHAR(20)       NOT NULL CONSTRAINT DF_Folha_Estado DEFAULT ('aberta'),
  Observacoes         NVARCHAR(2000)    NULL,
  -- recomendações para intervenções futuras (manutenção preventiva)
  Conselhos           NVARCHAR(2000)    NULL,
  -- copiada da oficina quando a folha abre: mudar a taxa depois não altera folhas antigas
  Taxa_IVA            DECIMAL(5,2)      NOT NULL,
  Data_Conclusao      DATETIME2(0)      NULL,
  Data_Entrega        DATETIME2(0)      NULL,
  CONSTRAINT FK_Folha_Oficina FOREIGN KEY (ID_Oficina) REFERENCES Oficina (ID_Oficina),
  CONSTRAINT FK_Folha_Veiculo FOREIGN KEY (ID_Oficina, ID_Veiculo) REFERENCES Veiculo (ID_Oficina, ID_Veiculo),
  CONSTRAINT FK_Folha_Cliente FOREIGN KEY (ID_Oficina, ID_Cliente) REFERENCES Cliente (ID_Oficina, ID_Cliente),
  CONSTRAINT FK_Folha_Colaborador FOREIGN KEY (ID_Oficina, ID_Colaborador) REFERENCES Colaborador (ID_Oficina, ID_Colaborador),
  CONSTRAINT UQ_Folha_Oficina_Numero UNIQUE (ID_Oficina, Numero),
  CONSTRAINT CK_Folha_Estado CHECK (Estado IN ('aberta', 'em_curso', 'aguarda_pecas', 'concluida', 'entregue')),
  CONSTRAINT CK_Folha_KMS CHECK (KMS_Entrada IS NULL OR KMS_Entrada >= 0),
  CONSTRAINT CK_Folha_Taxa_IVA CHECK (Taxa_IVA BETWEEN 0 AND 100)
);
GO

CREATE INDEX IX_Folha_Oficina_Estado ON Folha_Obra (ID_Oficina, Estado, Data_Entrada);
CREATE INDEX IX_Folha_Veiculo ON Folha_Obra (ID_Oficina, ID_Veiculo, Data_Entrada);
CREATE INDEX IX_Folha_Oficina_Entrega ON Folha_Obra (ID_Oficina, Data_Entrega) WHERE Data_Entrega IS NOT NULL;
GO

-- 6. Linhas de reparação (peças, mão de obra e outros custos de cada folha)
CREATE TABLE Linha_Reparacao (
  ID_Linha            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Linha_Reparacao PRIMARY KEY,
  ID_Folha            INT               NOT NULL,
  -- quem registou a linha (pode não ser quem abriu a folha)
  ID_Colaborador      INT               NOT NULL,
  Designacao          NVARCHAR(150)     NOT NULL,
  Categoria           VARCHAR(20)       NOT NULL,
  -- nas linhas de mão de obra, a quantidade são horas
  Quantidade          DECIMAL(10,2)     NOT NULL,
  -- preço sem IVA
  Valor_Unitario      DECIMAL(10,2)     NOT NULL,
  Criado_Em           DATETIME2(0)      NOT NULL CONSTRAINT DF_Linha_Criado_Em DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT FK_Linha_Folha FOREIGN KEY (ID_Folha) REFERENCES Folha_Obra (ID_Folha),
  CONSTRAINT FK_Linha_Colaborador FOREIGN KEY (ID_Colaborador) REFERENCES Colaborador (ID_Colaborador),
  CONSTRAINT CK_Linha_Categoria CHECK (Categoria IN ('peca', 'mao_de_obra', 'outro')),
  CONSTRAINT CK_Linha_Quantidade CHECK (Quantidade > 0),
  CONSTRAINT CK_Linha_Valor CHECK (Valor_Unitario >= 0)
);
GO

CREATE INDEX IX_Linha_Folha ON Linha_Reparacao (ID_Folha) INCLUDE (Categoria, Quantidade, Valor_Unitario);
GO
