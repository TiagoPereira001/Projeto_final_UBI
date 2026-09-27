const express = require('express');
const { sql, getPool } = require('../db');
const { ErroHttp, naoEncontrado, idDoUrl, violouRestricao } = require('../lib/erros');
const { Validador, escaparLike, paginacao } = require('../lib/validar');
const { exigirSessao, exigirCargo } = require('../middleware/auth');

const router = express.Router();

// todas as rotas exigem sessão, e todas as consultas filtram pela oficina de
// quem está a trabalhar: uma oficina nunca vê os clientes de outra
router.use(exigirSessao);

function lerCliente(v) {
    const cliente = {
        nome: v.texto('nome', { max: 120 }),
        telefone: v.telefone('telefone'),
        nif: v.nifCliente('nif'),
        email: v.email('email', { obrigatorio: false }),
        morada: v.texto('morada', { obrigatorio: false, max: 255 }),
    };
    v.verificar();
    return cliente;
}

function erroNifRepetido(err) {
    if (violouRestricao(err, 'UX_Cliente_Oficina_NIF')) {
        return new ErroHttp(409, 'Já existe um cliente com esse NIF.', { nif: 'Já existe um cliente com este NIF.' });
    }
    return err;
}

const CAMPOS_INSERIDOS = `
    INSERTED.ID_Cliente AS id, INSERTED.Nome AS nome, INSERTED.NIF AS nif,
    INSERTED.Telefone AS telefone, INSERTED.Email AS email, INSERTED.Morada AS morada
`;

// GET /api/clientes?q=texto&pagina=1&porPagina=50
// a pesquisa procura no nome, no NIF e no telefone (ignorando espaços)
router.get('/', async (req, res) => {
    const { pagina, porPagina, salto } = paginacao(req.query);
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';

    const pool = await getPool();
    const resultado = await pool.request()
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .input('q', sql.NVarChar(100), q || null)
        .input('padrao', sql.NVarChar(210), `%${escaparLike(q)}%`)
        .input('padraoTelefone', sql.VarChar(210), `%${escaparLike(q.replace(/\s/g, ''))}%`)
        .input('salto', sql.Int, salto)
        .input('porPagina', sql.Int, porPagina)
        .query(`
            SELECT c.ID_Cliente AS id, c.Nome AS nome, c.NIF AS nif, c.Telefone AS telefone,
                   c.Email AS email, c.Morada AS morada, nv.veiculos,
                   COUNT(*) OVER () AS total
            FROM Cliente c
            OUTER APPLY (
                SELECT COUNT(*) AS veiculos FROM Veiculo v
                WHERE v.ID_Oficina = c.ID_Oficina AND v.ID_Cliente = c.ID_Cliente AND v.Ativo = 1
            ) nv
            WHERE c.ID_Oficina = @oficina AND c.Ativo = 1
              AND (@q IS NULL
                   OR c.Nome LIKE @padrao ESCAPE '\\'
                   OR c.NIF LIKE @padrao ESCAPE '\\'
                   OR REPLACE(c.Telefone, ' ', '') LIKE @padraoTelefone ESCAPE '\\')
            ORDER BY c.Nome
            OFFSET @salto ROWS FETCH NEXT @porPagina ROWS ONLY
        `);

    const linhas = resultado.recordset;
    res.json({
        itens: linhas.map(({ total, ...cliente }) => cliente),
        total: linhas[0]?.total ?? 0,
        pagina,
        porPagina,
    });
});

// GET /api/clientes/:id (com os veículos ativos do cliente)
router.get('/:id', async (req, res) => {
    const id = idDoUrl(req.params.id, 'Cliente');
    const pool = await getPool();
    const resultado = await pool.request()
        .input('id', sql.Int, id)
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .query(`
            SELECT ID_Cliente AS id, Nome AS nome, NIF AS nif, Telefone AS telefone,
                   Email AS email, Morada AS morada, Ativo AS ativo, Criado_Em AS criadoEm
            FROM Cliente
            WHERE ID_Cliente = @id AND ID_Oficina = @oficina;

            SELECT ID_Veiculo AS id, Matricula AS matricula, Tipo AS tipo, Marca AS marca,
                   Modelo AS modelo, Ano AS ano, Marca_Celula AS marcaCelula
            FROM Veiculo
            WHERE ID_Cliente = @id AND ID_Oficina = @oficina AND Ativo = 1
            ORDER BY Matricula;
        `);

    const cliente = resultado.recordsets[0][0];
    if (!cliente) throw naoEncontrado('Cliente');
    res.json({ ...cliente, veiculos: resultado.recordsets[1] });
});

// POST /api/clientes { nome, telefone, nif?, email?, morada? }
router.post('/', async (req, res) => {
    const cliente = lerCliente(new Validador(req.body));
    const pool = await getPool();
    try {
        const resultado = await pool.request()
            .input('oficina', sql.Int, req.colaborador.oficinaId)
            .input('nome', sql.NVarChar(120), cliente.nome)
            .input('nif', sql.VarChar(20), cliente.nif)
            .input('telefone', sql.VarChar(20), cliente.telefone)
            .input('email', sql.NVarChar(254), cliente.email)
            .input('morada', sql.NVarChar(255), cliente.morada)
            .query(`
                INSERT INTO Cliente (ID_Oficina, Nome, NIF, Telefone, Email, Morada)
                OUTPUT ${CAMPOS_INSERIDOS}
                VALUES (@oficina, @nome, @nif, @telefone, @email, @morada)
            `);
        res.status(201).json(resultado.recordset[0]);
    } catch (err) {
        throw erroNifRepetido(err);
    }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res) => {
    const id = idDoUrl(req.params.id, 'Cliente');
    const cliente = lerCliente(new Validador(req.body));
    const pool = await getPool();

    let resultado;
    try {
        resultado = await pool.request()
            .input('id', sql.Int, id)
            .input('oficina', sql.Int, req.colaborador.oficinaId)
            .input('nome', sql.NVarChar(120), cliente.nome)
            .input('nif', sql.VarChar(20), cliente.nif)
            .input('telefone', sql.VarChar(20), cliente.telefone)
            .input('email', sql.NVarChar(254), cliente.email)
            .input('morada', sql.NVarChar(255), cliente.morada)
            .query(`
                UPDATE Cliente
                SET Nome = @nome, NIF = @nif, Telefone = @telefone, Email = @email, Morada = @morada
                OUTPUT ${CAMPOS_INSERIDOS}
                WHERE ID_Cliente = @id AND ID_Oficina = @oficina AND Ativo = 1
            `);
    } catch (err) {
        throw erroNifRepetido(err);
    }

    if (resultado.recordset.length === 0) throw naoEncontrado('Cliente');
    res.json(resultado.recordset[0]);
});

// DELETE /api/clientes/:id: arquiva (soft delete). Os dados ficam na BD por
// causa do histórico das folhas de obra (e das obrigações fiscais)
router.delete('/:id', exigirCargo('gestor'), async (req, res) => {
    const id = idDoUrl(req.params.id, 'Cliente');
    const pool = await getPool();
    const resultado = await pool.request()
        .input('id', sql.Int, id)
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .query(`
            UPDATE Cliente SET Ativo = 0
            OUTPUT INSERTED.ID_Cliente AS id
            WHERE ID_Cliente = @id AND ID_Oficina = @oficina AND Ativo = 1
              AND NOT EXISTS (
                  SELECT 1 FROM Veiculo v
                  WHERE v.ID_Oficina = @oficina AND v.ID_Cliente = @id AND v.Ativo = 1
              );

            SELECT COUNT(*) AS veiculos FROM Veiculo
            WHERE ID_Oficina = @oficina AND ID_Cliente = @id AND Ativo = 1;
        `);

    if (resultado.recordsets[0].length === 0) {
        if (resultado.recordsets[1][0].veiculos > 0) {
            throw new ErroHttp(409, 'Este cliente ainda tem veículos ativos. Arquiva primeiro os veículos.');
        }
        throw naoEncontrado('Cliente');
    }
    res.status(204).end();
});

module.exports = router;
