CREATE DATABASE OficinaDR;
GO
USE OficinaDR;
GO

-- 1. Tabela de Utilizadores/Colaboradores 
CREATE TABLE Colaboradores (
  ID_Colaborador INT IDENTITY(1,1) PRIMARY KEY,
  Nome VARCHAR(100) NOT NULL,
  Cargo VARCHAR(50) NOT NULL, -- Ex: 'Mecanico', 'Gestor'
  Email VARCHAR(100) UNIQUE NOT NULL,
  Password_Hash VARCHAR(255) NOT NULL, -- Senhas encriptadas!
  Ativo BIT DEFAULT 1 -- 1 = Sim, 0 = Não (Soft Delete)
);

-- 2. Clientes (Agora com Soft Delete)
CREATE TABLE Cliente (
  ID_cliente INT IDENTITY(1,1) PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  Contribuinte_NIF VARCHAR(20) NOT NULL,
  Telefone VARCHAR(20) NOT NULL,
  Morada VARCHAR(255) NOT NULL,
  Ativo BIT DEFAULT 1
);

-- 3. Autocaravanas
CREATE TABLE Autocaravana (
  Matricula VARCHAR(20) PRIMARY KEY,
  Marca_chassis VARCHAR(50) NOT NULL,
  Modelo_chassis VARCHAR(50) NOT NULL,
  marca_celula VARCHAR(50) NOT NULL,
  Ano INT NOT NULL,
  ID_cliente INT NOT NULL,
  Ativo BIT DEFAULT 1,
  FOREIGN KEY (ID_cliente) REFERENCES Cliente(ID_cliente)
);

-- 4. Folhas de Obra (Agora sabemos QUEM registou a obra)
CREATE TABLE Folha_Obra (
  ID_folha INT IDENTITY(1,1) PRIMARY KEY,
  Data_entrada DATE NOT NULL,
  KMS_entrada INT NOT NULL,
  Estado_reparacao VARCHAR(50) NOT NULL,
  Observacoes TEXT,
  Conselhos TEXT,
  Matricula VARCHAR(20) NOT NULL,
  ID_Colaborador INT NOT NULL, -- Rastreabilidade!
  FOREIGN KEY (Matricula) REFERENCES Autocaravana(Matricula),
  FOREIGN KEY (ID_Colaborador) REFERENCES Colaboradores(ID_Colaborador)
);

-- 5. Linhas de Reparação
CREATE TABLE Linha_reparacao (
  ID_linha INT IDENTITY(1,1) PRIMARY KEY,
  Designacao VARCHAR(100) NOT NULL,
  Quantidade DECIMAL(10,2) NOT NULL,
  valor_unitario DECIMAL(10,2) NOT NULL,
  Categoria VARCHAR(50) NOT NULL,
  ID_folha INT NOT NULL,
  FOREIGN KEY (ID_folha) REFERENCES Folha_Obra(ID_folha)
);