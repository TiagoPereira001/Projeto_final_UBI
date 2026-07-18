const express = require('express');
const { sql, getPool } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`
                SELECT ID_cliente, nome, Contribuinte_NIF, Telefone, Morada, Ativo
                FROM Cliente
                WHERE Ativo = 1
            `);
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao listar clientes: ' + err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT ID_cliente, nome, Contribuinte_NIF, Telefone, Morada, Ativo
                FROM Cliente
                WHERE ID_cliente = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao obter cliente: ' + err.message });
    }
});

router.post('/', async (req, res) => {
    const { nome, contribuinte_nif, telefone, morada } = req.body;

    if (!nome || !contribuinte_nif || !telefone || !morada) {
        return res.status(400).json({
            error: 'Campos obrigatórios em falta: nome, contribuinte_nif, telefone, morada.'
        });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('nome', sql.VarChar(100), nome)
            .input('nif', sql.VarChar(20), contribuinte_nif)
            .input('telefone', sql.VarChar(20), telefone)
            .input('morada', sql.VarChar(255), morada)
            .query(`
                INSERT INTO Cliente (nome, Contribuinte_NIF, Telefone, Morada, Ativo)
                OUTPUT INSERTED.*
                VALUES (@nome, @nif, @telefone, @morada, 1)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao criar cliente: ' + err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { nome, contribuinte_nif, telefone, morada } = req.body;

    if (!nome || !contribuinte_nif || !telefone || !morada) {
        return res.status(400).json({
            error: 'Campos obrigatórios em falta: nome, contribuinte_nif, telefone, morada.'
        });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('nome', sql.VarChar(100), nome)
            .input('nif', sql.VarChar(20), contribuinte_nif)
            .input('telefone', sql.VarChar(20), telefone)
            .input('morada', sql.VarChar(255), morada)
            .query(`
                UPDATE Cliente
                SET nome = @nome, Contribuinte_NIF = @nif, Telefone = @telefone, Morada = @morada
                OUTPUT INSERTED.*
                WHERE ID_cliente = @id AND Ativo = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar cliente: ' + err.message });
    }
});

// soft delete outra vez. um cliente pode ter autocaravanas associadas
// (FK em Autocaravana), por isso nunca pode ser apagado a sério da BD
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                UPDATE Cliente
                SET Ativo = 0
                OUTPUT INSERTED.ID_cliente
                WHERE ID_cliente = @id AND Ativo = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado ou já inativo.' });
        }
        res.status(200).json({ message: 'Cliente desativado com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao desativar cliente: ' + err.message });
    }
});

module.exports = router;