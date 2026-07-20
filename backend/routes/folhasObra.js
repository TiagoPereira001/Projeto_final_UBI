const express = require('express');
const { sql, getPool } = require('../db');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

// a partir daqui, todas as rotas deste ficheiro exigem login
router.use(verificarToken);

// lista as folhas de obra, já com a matricula, o nome do colaborador e o
// valor total calculado a partir das linhas de reparação associadas
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`
                SELECT f.ID_folha, f.Data_entrada, f.KMS_entrada, f.Estado_reparacao,
                       f.Observacoes, f.Conselhos, f.Matricula, f.ID_Colaborador,
                       c.Nome AS Nome_colaborador,
                       ISNULL((
                           SELECT SUM(l.Quantidade * l.valor_unitario)
                           FROM Linha_reparacao l
                           WHERE l.ID_folha = f.ID_folha
                       ), 0) AS Valor_total
                FROM Folha_Obra f
                JOIN Colaboradores c ON c.ID_Colaborador = f.ID_Colaborador
                ORDER BY f.ID_folha DESC
            `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar folhas de obra. Tenta novamente mais tarde.' });
    }
});

// obtém uma folha de obra específica, já com as linhas de reparação dentro
router.get('/:id', async (req, res) => {
    try {
        const pool = await getPool();

        const folha = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT f.ID_folha, f.Data_entrada, f.KMS_entrada, f.Estado_reparacao,
                       f.Observacoes, f.Conselhos, f.Matricula, f.ID_Colaborador,
                       c.Nome AS Nome_colaborador
                FROM Folha_Obra f
                JOIN Colaboradores c ON c.ID_Colaborador = f.ID_Colaborador
                WHERE f.ID_folha = @id
            `);

        if (folha.recordset.length === 0) {
            return res.status(404).json({ error: 'Folha de obra não encontrada.' });
        }

        const linhas = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT ID_linha, Designacao, Quantidade, valor_unitario, Categoria
                FROM Linha_reparacao
                WHERE ID_folha = @id
            `);

        const resultado = folha.recordset[0];
        resultado.Linhas = linhas.recordset;
        resultado.Valor_total = linhas.recordset.reduce(
            (soma, l) => soma + (l.Quantidade * l.valor_unitario), 0
        );

        res.status(200).json(resultado);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao obter folha de obra. Tenta novamente mais tarde.' });
    }
});

// cria uma folha de obra. as linhas são opcionais aqui — o mecânico pode
// só querer dar entrada rápida do carro e ir adicionando peças depois
// (ver POST /:id/linhas). se vierem linhas já no pedido, tudo é gravado
// numa única transação: ou a folha e todas as linhas ficam gravadas, ou nada fica
router.post('/', async (req, res) => {
    const {
        data_entrada, kms_entrada, estado_reparacao,
        observacoes, conselhos, matricula, id_colaborador, linhas
    } = req.body;

    if (!data_entrada || kms_entrada == null || !estado_reparacao || !matricula || !id_colaborador) {
        return res.status(400).json({
            error: 'Campos obrigatórios em falta: data_entrada, kms_entrada, estado_reparacao, matricula, id_colaborador.'
        });
    }

    const pool = await getPool();

    // confirma que a autocaravana e o colaborador existem antes de sequer
    // começar a transação, para dar um erro claro em vez de um rollback
    const autocaravana = await pool.request()
        .input('matricula', sql.VarChar(20), matricula)
        .query('SELECT Matricula FROM Autocaravana WHERE Matricula = @matricula AND Ativo = 1');
    if (autocaravana.recordset.length === 0) {
        return res.status(400).json({ error: 'Não existe nenhuma autocaravana ativa com essa matrícula.' });
    }

    const colaborador = await pool.request()
        .input('id_colaborador', sql.Int, id_colaborador)
        .query('SELECT ID_Colaborador FROM Colaboradores WHERE ID_Colaborador = @id_colaborador AND Ativo = 1');
    if (colaborador.recordset.length === 0) {
        return res.status(400).json({ error: 'Não existe nenhum colaborador ativo com esse ID.' });
    }

    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();

        const folhaResult = await new sql.Request(transaction)
            .input('data_entrada', sql.Date, data_entrada)
            .input('kms_entrada', sql.Int, kms_entrada)
            .input('estado_reparacao', sql.VarChar(50), estado_reparacao)
            .input('observacoes', sql.Text, observacoes || null)
            .input('conselhos', sql.Text, conselhos || null)
            .input('matricula', sql.VarChar(20), matricula)
            .input('id_colaborador', sql.Int, id_colaborador)
            .query(`
                INSERT INTO Folha_Obra (Data_entrada, KMS_entrada, Estado_reparacao, Observacoes, Conselhos, Matricula, ID_Colaborador)
                OUTPUT INSERTED.*
                VALUES (@data_entrada, @kms_entrada, @estado_reparacao, @observacoes, @conselhos, @matricula, @id_colaborador)
            `);

        const novaFolha = folhaResult.recordset[0];

        // se vieram linhas no pedido, insere-as todas dentro da mesma transação
        const linhasInseridas = [];
        if (Array.isArray(linhas) && linhas.length > 0) {
            for (const linha of linhas) {
                if (!linha.designacao || linha.quantidade == null || linha.valor_unitario == null || !linha.categoria) {
                    throw new Error('Cada linha precisa de designacao, quantidade, valor_unitario e categoria.');
                }

                const linhaResult = await new sql.Request(transaction)
                    .input('designacao', sql.VarChar(100), linha.designacao)
                    .input('quantidade', sql.Decimal(10, 2), linha.quantidade)
                    .input('valor_unitario', sql.Decimal(10, 2), linha.valor_unitario)
                    .input('categoria', sql.VarChar(50), linha.categoria)
                    .input('id_folha', sql.Int, novaFolha.ID_folha)
                    .query(`
                        INSERT INTO Linha_reparacao (Designacao, Quantidade, valor_unitario, Categoria, ID_folha)
                        OUTPUT INSERTED.*
                        VALUES (@designacao, @quantidade, @valor_unitario, @categoria, @id_folha)
                    `);

                linhasInseridas.push(linhaResult.recordset[0]);
            }
        }

        await transaction.commit();

        novaFolha.Linhas = linhasInseridas;
        res.status(201).json(novaFolha);
    } catch (err) {
        await transaction.rollback();
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar folha de obra. Tenta novamente mais tarde.' });
    }
});

// adiciona uma linha de reparação a uma folha já existente — é isto que o
// mecânico usa no dia a dia, à medida que vai aplicando peças/serviços
router.post('/:id/linhas', async (req, res) => {
    const { designacao, quantidade, valor_unitario, categoria } = req.body;

    if (!designacao || quantidade == null || valor_unitario == null || !categoria) {
        return res.status(400).json({
            error: 'Campos obrigatórios em falta: designacao, quantidade, valor_unitario, categoria.'
        });
    }

    try {
        const pool = await getPool();

        const folha = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT ID_folha FROM Folha_Obra WHERE ID_folha = @id');
        if (folha.recordset.length === 0) {
            return res.status(404).json({ error: 'Folha de obra não encontrada.' });
        }

        const result = await pool.request()
            .input('designacao', sql.VarChar(100), designacao)
            .input('quantidade', sql.Decimal(10, 2), quantidade)
            .input('valor_unitario', sql.Decimal(10, 2), valor_unitario)
            .input('categoria', sql.VarChar(50), categoria)
            .input('id_folha', sql.Int, req.params.id)
            .query(`
                INSERT INTO Linha_reparacao (Designacao, Quantidade, valor_unitario, Categoria, ID_folha)
                OUTPUT INSERTED.*
                VALUES (@designacao, @quantidade, @valor_unitario, @categoria, @id_folha)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao adicionar linha de reparação. Tenta novamente mais tarde.' });
    }
});

// atualiza os dados gerais da folha (tipicamente o estado da reparação,
// observações ou conselhos — não mexe nas linhas)
router.put('/:id', async (req, res) => {
    const { kms_entrada, estado_reparacao, observacoes, conselhos } = req.body;

    if (kms_entrada == null || !estado_reparacao) {
        return res.status(400).json({
            error: 'Campos obrigatórios em falta: kms_entrada, estado_reparacao.'
        });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('kms_entrada', sql.Int, kms_entrada)
            .input('estado_reparacao', sql.VarChar(50), estado_reparacao)
            .input('observacoes', sql.Text, observacoes || null)
            .input('conselhos', sql.Text, conselhos || null)
            .query(`
                UPDATE Folha_Obra
                SET KMS_entrada = @kms_entrada, Estado_reparacao = @estado_reparacao,
                    Observacoes = @observacoes, Conselhos = @conselhos
                OUTPUT INSERTED.*
                WHERE ID_folha = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Folha de obra não encontrada.' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar folha de obra. Tenta novamente mais tarde.' });
    }
});

// remove uma linha de reparação isolada (ex: o mecânico enganou-se a
// registar uma peça). isto é um delete a sério, não soft delete — a
// tabela nem tem coluna Ativo, e uma linha de reparação não tem histórico
// próprio a preservar fora da folha a que pertence
router.delete('/linhas/:idLinha', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('idLinha', sql.Int, req.params.idLinha)
            .query(`
                DELETE FROM Linha_reparacao
                OUTPUT DELETED.ID_linha
                WHERE ID_linha = @idLinha
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Linha de reparação não encontrada.' });
        }
        res.status(200).json({ message: 'Linha de reparação removida com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao remover linha de reparação. Tenta novamente mais tarde.' });
    }
});

module.exports = router;