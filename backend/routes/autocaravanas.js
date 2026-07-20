const express = require('express');
const { sql, getPool } = require('../db');
const { verificarToken } = require('../middleware/auth');

const router = express.Router();

// a partir daqui, todas as rotas deste ficheiro exigem login
router.use(verificarToken);

// lista as autocaravanas ativas, já com o nome do cliente (join simples)
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`
                SELECT a.Matricula, a.Marca_chassis, a.Modelo_chassis, a.marca_celula,
                       a.Ano, a.ID_cliente, c.nome AS Nome_cliente, a.Ativo
                FROM Autocaravana a
                JOIN Cliente c ON c.ID_cliente = a.ID_cliente
                WHERE a.Ativo = 1
            `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar autocaravanas. Tenta novamente mais tarde.' });
    }
});

// aqui o :matricula é a própria PK, não um id numérico
router.get('/:matricula', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('matricula', sql.VarChar(20), req.params.matricula)
            .query(`
                SELECT a.Matricula, a.Marca_chassis, a.Modelo_chassis, a.marca_celula,
                       a.Ano, a.ID_cliente, c.nome AS Nome_cliente, a.Ativo
                FROM Autocaravana a
                JOIN Cliente c ON c.ID_cliente = a.ID_cliente
                WHERE a.Matricula = @matricula
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Autocaravana não encontrada.' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao obter autocaravana. Tenta novamente mais tarde.' });
    }
});

// cria uma autocaravana nova. antes de inserir confirma que o cliente existe
// e está ativo, senão dava um erro de FK menos claro lá mais para a frente
router.post('/', async (req, res) => {
    const { matricula, marca_chassis, modelo_chassis, marca_celula, ano, id_cliente } = req.body;

    if (!matricula || !marca_chassis || !modelo_chassis || !marca_celula || !ano || !id_cliente) {
        return res.status(400).json({
            error: 'Campos obrigatórios em falta: matricula, marca_chassis, modelo_chassis, marca_celula, ano, id_cliente.'
        });
    }

    try {
        const pool = await getPool();

        const cliente = await pool.request()
            .input('id_cliente', sql.Int, id_cliente)
            .query('SELECT ID_cliente FROM Cliente WHERE ID_cliente = @id_cliente AND Ativo = 1');

        if (cliente.recordset.length === 0) {
            return res.status(400).json({ error: 'Não existe nenhum cliente ativo com esse ID.' });
        }

        const result = await pool.request()
            .input('matricula', sql.VarChar(20), matricula)
            .input('marca_chassis', sql.VarChar(50), marca_chassis)
            .input('modelo_chassis', sql.VarChar(50), modelo_chassis)
            .input('marca_celula', sql.VarChar(50), marca_celula)
            .input('ano', sql.Int, ano)
            .input('id_cliente', sql.Int, id_cliente)
            .query(`
                INSERT INTO Autocaravana (Matricula, Marca_chassis, Modelo_chassis, marca_celula, Ano, ID_cliente, Ativo)
                OUTPUT INSERTED.*
                VALUES (@matricula, @marca_chassis, @modelo_chassis, @marca_celula, @ano, @id_cliente, 1)
            `);

        res.status(201).json(result.recordset[0]);
    } catch (err) {
        // a matricula é PK, já vem com a validação de duplicado feita pela própria BD
        if (err.number === 2627 || err.number === 2601) {
            return res.status(409).json({ error: 'Já existe uma autocaravana com essa matrícula.' });
        }
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar autocaravana. Tenta novamente mais tarde.' });
    }
});

// atualiza os dados da autocaravana. a matricula não se muda aqui, é a PK
router.put('/:matricula', async (req, res) => {
    const { marca_chassis, modelo_chassis, marca_celula, ano, id_cliente } = req.body;

    if (!marca_chassis || !modelo_chassis || !marca_celula || !ano || !id_cliente) {
        return res.status(400).json({
            error: 'Campos obrigatórios em falta: marca_chassis, modelo_chassis, marca_celula, ano, id_cliente.'
        });
    }

    try {
        const pool = await getPool();

        const cliente = await pool.request()
            .input('id_cliente', sql.Int, id_cliente)
            .query('SELECT ID_cliente FROM Cliente WHERE ID_cliente = @id_cliente AND Ativo = 1');

        if (cliente.recordset.length === 0) {
            return res.status(400).json({ error: 'Não existe nenhum cliente ativo com esse ID.' });
        }

        const result = await pool.request()
            .input('matricula', sql.VarChar(20), req.params.matricula)
            .input('marca_chassis', sql.VarChar(50), marca_chassis)
            .input('modelo_chassis', sql.VarChar(50), modelo_chassis)
            .input('marca_celula', sql.VarChar(50), marca_celula)
            .input('ano', sql.Int, ano)
            .input('id_cliente', sql.Int, id_cliente)
            .query(`
                UPDATE Autocaravana
                SET Marca_chassis = @marca_chassis, Modelo_chassis = @modelo_chassis,
                    marca_celula = @marca_celula, Ano = @ano, ID_cliente = @id_cliente
                OUTPUT INSERTED.*
                WHERE Matricula = @matricula AND Ativo = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Autocaravana não encontrada.' });
        }
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar autocaravana. Tenta novamente mais tarde.' });
    }
});

// soft delete de novo, pela mesma razão do colaboradores: as folhas de
// obra apontam para a matricula, não pode desaparecer da BD
router.delete('/:matricula', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('matricula', sql.VarChar(20), req.params.matricula)
            .query(`
                UPDATE Autocaravana
                SET Ativo = 0
                OUTPUT INSERTED.Matricula
                WHERE Matricula = @matricula AND Ativo = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Autocaravana não encontrada ou já inativa.' });
        }
        res.status(200).json({ message: 'Autocaravana desativada com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao desativar autocaravana. Tenta novamente mais tarde.' });
    }
});

module.exports = router;