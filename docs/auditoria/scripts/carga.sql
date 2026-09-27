-- dados fictícios de volume para a auditoria de desempenho (oficina de carga)
SET NOCOUNT ON; SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON; SET XACT_ABORT ON;
-- sqlcmd -v OFICINA=<id> GESTOR=<id> (ids da oficina de carga, ver registar-carga.mjs)
DECLARE @o INT = $(OFICINA), @g INT = $(GESTOR);
BEGIN TRAN;
;WITH n AS (SELECT TOP (3000) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS i FROM sys.all_objects a CROSS JOIN sys.all_objects b)
INSERT INTO Cliente (ID_Oficina, Nome, Telefone)
SELECT @o, CONCAT(CASE WHEN i % 50 = 0 THEN N'Silva ' ELSE N'' END, N'Cliente de Carga ', i, N' (fictício)'), CONCAT('91', RIGHT(CONCAT('0000000', i), 7)) FROM n;

SELECT ID_Cliente, ROW_NUMBER() OVER (ORDER BY ID_Cliente) AS rn INTO #cli FROM Cliente WHERE ID_Oficina = @o;

;WITH n AS (SELECT TOP (4000) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS i FROM sys.all_objects a CROSS JOIN sys.all_objects b)
INSERT INTO Veiculo (ID_Oficina, ID_Cliente, Matricula, Tipo, Marca, Modelo, Ano, Marca_Celula)
SELECT @o, c.ID_Cliente, CONCAT('CG', RIGHT(CONCAT('000000', n.i), 6)),
       CASE WHEN n.i % 4 = 0 THEN 'autocaravana' ELSE 'ligeiro' END, N'Marca Fictícia', N'Modelo', 2010 + n.i % 15,
       CASE WHEN n.i % 4 = 0 THEN N'Célula Fictícia' END
FROM n JOIN #cli c ON c.rn = (n.i % 3000) + 1;

SELECT ID_Veiculo, ID_Cliente, ROW_NUMBER() OVER (ORDER BY ID_Veiculo) AS rn INTO #vei FROM Veiculo WHERE ID_Oficina = @o;

;WITH n AS (SELECT TOP (12000) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS i FROM sys.all_objects a CROSS JOIN sys.all_objects b)
INSERT INTO Folha_Obra (ID_Oficina, Numero, ID_Veiculo, ID_Cliente, ID_Colaborador, Data_Entrada, KMS_Entrada, Observacoes,
                        Taxa_IVA, Estado, Data_Conclusao, Data_Entrega)
SELECT @o, 12001 - n.i, v.ID_Veiculo, v.ID_Cliente, @g,
       DATEADD(MINUTE, -n.i * 216, SYSUTCDATETIME()), 50000 + n.i, N'Revisão e diagnóstico (fictício)', 23.00,
       CASE WHEN n.i <= 60 THEN CASE n.i % 4 WHEN 0 THEN 'aberta' WHEN 1 THEN 'em_curso' WHEN 2 THEN 'aguarda_pecas' ELSE 'concluida' END ELSE 'entregue' END,
       CASE WHEN n.i > 60 OR n.i % 4 = 3 THEN DATEADD(MINUTE, -n.i * 216 + 2880, SYSUTCDATETIME()) END,
       CASE WHEN n.i > 60 THEN DATEADD(MINUTE, -n.i * 216 + 2880, SYSUTCDATETIME()) END
FROM n JOIN #vei v ON v.rn = CASE WHEN n.i <= 60 THEN n.i ELSE 60 + (n.i % 3940) + 1 END;

;WITH k AS (SELECT 1 AS j UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6)
INSERT INTO Linha_Reparacao (ID_Folha, ID_Colaborador, Designacao, Categoria, Quantidade, Valor_Unitario)
SELECT f.ID_Folha, @g, CONCAT(N'Peça ou serviço ', k.j, N' (fictício)'),
       CASE k.j % 3 WHEN 0 THEN 'mao_de_obra' WHEN 1 THEN 'peca' ELSE 'outro' END,
       1 + k.j % 3, 9.99 + (f.ID_Folha % 50) + k.j
FROM Folha_Obra f CROSS JOIN k WHERE f.ID_Oficina = @o;

UPDATE Oficina SET Ultimo_Numero_Folha = 12000 WHERE ID_Oficina = @o;
COMMIT;
SELECT (SELECT COUNT(*) FROM Cliente WHERE ID_Oficina = @o) AS clientes, (SELECT COUNT(*) FROM Veiculo WHERE ID_Oficina = @o) AS veiculos,
       (SELECT COUNT(*) FROM Folha_Obra WHERE ID_Oficina = @o) AS folhas,
       (SELECT COUNT(*) FROM Linha_Reparacao l JOIN Folha_Obra f ON f.ID_Folha = l.ID_Folha WHERE f.ID_Oficina = @o) AS linhas,
       (SELECT COUNT(*) FROM Folha_Obra WHERE ID_Oficina = @o AND Estado <> 'entregue') AS ativas;
