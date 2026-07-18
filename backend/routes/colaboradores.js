const express = require('express');
const bcrypt = require('bcrypt');
const { sql, getPool } = require('../db');

const router = express.Router();
const SALT_ROUNDS = 10;

// lista os colaboradores ativos, sem mostrar a password (nem o hash)
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`
                SELECT ID_Colaborador, Nome, Cargo, Email, Ativo
                FROM Colaboradores
                WHERE Ativo = 1
            `);
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao listar colaboradores: ' + err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT ID_Colaborador, Nome, Cargo, Email, Ativo
                FROM Colaboradores
                WHERE ID_Colaborador = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Colaborador não encontrado.' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao obter colaborador: ' + err.message });
    }
});

// cria um colaborador novo. a password chega em texto normal (ex: "123456")
// e só é encriptada aqui, nunca vai texto simples para a BD
router.post('/', async (req, res) => {
    const { nome, cargo, email, password } = req.body;

    if (!nome || !cargo || !email || !password) {
        return res.status(400).json({
            error: 'Campos obrigatórios em falta: nome, cargo, email, password.'
        });
    }

    try {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const pool = await getPool();

        const result = await pool.request()
            .input('nome', sql.VarChar(100), nome)
            .input('cargo', sql.VarChar(50), cargo)
            .input('email', sql.VarChar(100), email)
            .input('passwordHash', sql.VarChar(255), passwordHash)
            .query(`
                INSERT INTO Colaboradores (Nome, Cargo, Email, Password_Hash, Ativo)
                OUTPUT INSERTED.ID_Colaborador, INSERTED.Nome, INSERTED.Cargo, INSERTED.Email, INSERTED.Ativo
                VALUES (@nome, @cargo, @email, @passwordHash, 1)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (err) {
        // 2627/2601 é o SQL Server a dizer que o UNIQUE do email já existe
        if (err.number === 2627 || err.number === 2601) {
            return res.status(409).json({ error: 'Já existe um colaborador com esse email.' });
        }
        res.status(500).json({ error: 'Erro ao criar colaborador: ' + err.message });
    }
});

// atualiza os dados do colaborador. a password só muda se vier no body,
// se não vier fica a mesma
router.put('/:id', async (req, res) => {
    const { nome, cargo, email, password } = req.body;

    if (!nome || !cargo || !email) {
        return res.status(400).json({
            error: 'Campos obrigatórios em falta: nome, cargo, email.'
        });
    }

    try {
        const pool = await getPool();
        const request = pool.request()
            .input('id', sql.Int, req.params.id)
            .input('nome', sql.VarChar(100), nome)
            .input('cargo', sql.VarChar(50), cargo)
            .input('email', sql.VarChar(100), email);

        let setPasswordClause = '';
        if (password) {
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            request.input('passwordHash', sql.VarChar(255), passwordHash);
            setPasswordClause = ', Password_Hash = @passwordHash';
        }

        const result = await request.query(`
            UPDATE Colaboradores
            SET Nome = @nome, Cargo = @cargo, Email = @email ${setPasswordClause}
            OUTPUT INSERTED.ID_Colaborador, INSERTED.Nome, INSERTED.Cargo, INSERTED.Email, INSERTED.Ativo
            WHERE ID_Colaborador = @id AND Ativo = 1
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Colaborador não encontrado.' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        if (err.number === 2627 || err.number === 2601) {
            return res.status(409).json({ error: 'Já existe um colaborador com esse email.' });
        }
        res.status(500).json({ error: 'Erro ao atualizar colaborador: ' + err.message });
    }
});

// soft delete: não apaga a linha, só marca Ativo = 0.
// tem de ser assim porque as Folhas de Obra continuam a apontar para este
// colaborador (ID_Colaborador), um DELETE normal ia partir essa referência
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                UPDATE Colaboradores
                SET Ativo = 0
                OUTPUT INSERTED.ID_Colaborador
                WHERE ID_Colaborador = @id AND Ativo = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Colaborador não encontrado ou já inativo.' });
        }
        res.status(200).json({ message: 'Colaborador desativado com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao desativar colaborador: ' + err.message });
    }
});

module.exports = router;