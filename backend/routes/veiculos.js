const express = require('express');
const { sql, getPool } = require('../db');
const { ErroHttp, naoEncontrado, idDoUrl, violouRestricao } = require('../lib/erros');
const { Validador, escaparLike, normalizarMatricula, paginacao } = require('../lib/validar');
const { exigirSessao, exigirCargo } = require('../middleware/auth');

// antes só existiam autocaravanas. Agora qualquer oficina regista qualquer
// veículo; as autocaravanas continuam a guardar à parte a marca da célula
// habitacional (a marca/modelo "normais" são os do chassis)
const TIPOS = ['ligeiro', 'comercial', 'autocaravana', 'motociclo', 'pesado', 'outro'];

const router = express.Router();
router.use(exigirSessao);

function lerVeiculo(v) {
    const tipo = v.opcao('tipo', TIPOS);
    const veiculo = {
        matricula: v.matricula('matricula'),
        tipo,
        marca: v.texto('marca', { max: 50 }),
        modelo: v.texto('modelo', { obrigatorio: false, max: 60 }),
        ano: v.inteiro('ano', { obrigatorio: false, min: 1900, max: new Date().getFullYear() + 1 }),
        // só as autocaravanas têm célula; nos outros tipos o campo é ignorado
        marcaCelula: tipo === 'autocaravana' ? v.texto('marcaCelula', { obrigatorio: false, max: 50 }) : null,
        clienteId: v.id('clienteId'),
    };
    v.verificar();
    return veiculo;
}

function erroMatriculaRepetida(err) {
    if (violouRestricao(err, 'UX_Veiculo_Oficina_Matricula')) {
        return new ErroHttp(409, 'Já existe um veículo com essa matrícula.', {
            matricula: 'Já existe um veículo com esta matrícula.',
        });
    }
    return err;
}

async function confirmarCliente(pool, oficinaId, clienteId) {
    const resultado = await pool.request()
        .input('id', sql.Int, clienteId)
        .input('oficina', sql.Int, oficinaId)
        .query('SELECT 1 AS existe FROM Cliente WHERE ID_Cliente = @id AND ID_Oficina = @oficina AND Ativo = 1');
    if (resultado.recordset.length === 0) {
        throw new ErroHttp(400, 'Esse cliente não existe.', { clienteId: 'Escolhe um cliente válido.' });
    }
}

function paraJson(linha) {
    return {
        id: linha.id,
        matricula: linha.matricula,
        tipo: linha.tipo,
        marca: linha.marca,
        modelo: linha.modelo,
        ano: linha.ano,
        marcaCelula: linha.marcaCelula,
        cliente: { id: linha.clienteId, nome: linha.clienteNome, telefone: linha.clienteTelefone },
        folhaAtiva: linha.folhaAtivaId
            ? { id: linha.folhaAtivaId, numero: linha.folhaAtivaNumero, estado: linha.folhaAtivaEstado }
            : null,
    };
}

function selectVeiculo({ comTotal = false } = {}) {
    return `
    SELECT ${comTotal ? 'COUNT(*) OVER () AS total,' : ''} v.ID_Veiculo AS id, v.Matricula AS matricula, v.Tipo AS tipo, v.Marca AS marca,
           v.Modelo AS modelo, v.Ano AS ano, v.Marca_Celula AS marcaCelula,
           c.ID_Cliente AS clienteId, c.Nome AS clienteNome, c.Telefone AS clienteTelefone,
           fa.ID_Folha AS folhaAtivaId, fa.Numero AS folhaAtivaNumero, fa.Estado AS folhaAtivaEstado
    FROM Veiculo v
    JOIN Cliente c ON c.ID_Oficina = v.ID_Oficina AND c.ID_Cliente = v.ID_Cliente
    OUTER APPLY (
        -- a folha que ainda está aberta para este veículo (se estiver na oficina)
        SELECT TOP 1 f.ID_Folha, f.Numero, f.Estado
        FROM Folha_Obra f
        WHERE f.ID_Oficina = v.ID_Oficina AND f.ID_Veiculo = v.ID_Veiculo AND f.Estado <> 'entregue'
        ORDER BY f.Data_Entrada DESC
    ) fa
`;
}

// GET /api/veiculos?q=texto&cliente=12&pagina=1
// a pesquisa procura na matrícula (com ou sem traços), marca, modelo e cliente
router.get('/', async (req, res) => {
    const { pagina, porPagina, salto } = paginacao(req.query);
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const clienteId = Number.parseInt(req.query.cliente, 10) || null;
    const matriculaQ = normalizarMatricula(q);

    const pool = await getPool();
    const resultado = await pool.request()
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .input('cliente', sql.Int, clienteId)
        .input('q', sql.NVarChar(100), q || null)
        .input('padrao', sql.NVarChar(210), `%${escaparLike(q)}%`)
        .input('padraoMatricula', sql.VarChar(30), matriculaQ ? `%${matriculaQ}%` : null)
        .input('matriculaExata', sql.VarChar(30), matriculaQ || null)
        .input('salto', sql.Int, salto)
        .input('porPagina', sql.Int, porPagina)
        .query(`
            ${selectVeiculo({ comTotal: true })}
            WHERE v.ID_Oficina = @oficina AND v.Ativo = 1
              AND (@cliente IS NULL OR v.ID_Cliente = @cliente)
              AND (@q IS NULL
                   OR v.Matricula LIKE @padraoMatricula
                   OR v.Marca LIKE @padrao ESCAPE '\\'
                   OR v.Modelo LIKE @padrao ESCAPE '\\'
                   OR v.Marca_Celula LIKE @padrao ESCAPE '\\'
                   OR c.Nome LIKE @padrao ESCAPE '\\')
            -- matrícula exatamente igual ao que se escreveu aparece primeiro
            ORDER BY CASE WHEN v.Matricula = @matriculaExata THEN 0 ELSE 1 END, v.Matricula
            OFFSET @salto ROWS FETCH NEXT @porPagina ROWS ONLY
        `);

    const linhas = resultado.recordset;
    res.json({ itens: linhas.map(paraJson), total: linhas[0]?.total ?? 0, pagina, porPagina });
});

// GET /api/veiculos/:id (com o histórico de folhas de obra)
router.get('/:id', async (req, res) => {
    const id = idDoUrl(req.params.id, 'Veículo');
    const pool = await getPool();
    const resultado = await pool.request()
        .input('id', sql.Int, id)
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .query(`
            ${selectVeiculo()}
            WHERE v.ID_Veiculo = @id AND v.ID_Oficina = @oficina;

            SELECT f.ID_Folha AS id, f.Numero AS numero, f.Estado AS estado,
                   f.Data_Entrada AS dataEntrada, f.KMS_Entrada AS kmsEntrada,
                   f.Conselhos AS conselhos, t.subtotal
            FROM Folha_Obra f
            OUTER APPLY (
                SELECT ISNULL(SUM(ROUND(l.Quantidade * l.Valor_Unitario, 2)), 0) AS subtotal
                FROM Linha_Reparacao l WHERE l.ID_Folha = f.ID_Folha
            ) t
            WHERE f.ID_Veiculo = @id AND f.ID_Oficina = @oficina
            ORDER BY f.Data_Entrada DESC;
        `);

    const veiculo = resultado.recordsets[0][0];
    if (!veiculo) throw naoEncontrado('Veículo');
    res.json({ ...paraJson(veiculo), historico: resultado.recordsets[1] });
});

// POST /api/veiculos { matricula, tipo, marca, modelo?, ano?, marcaCelula?, clienteId }
router.post('/', async (req, res) => {
    const veiculo = lerVeiculo(new Validador(req.body));
    const pool = await getPool();
    await confirmarCliente(pool, req.colaborador.oficinaId, veiculo.clienteId);

    try {
        const resultado = await pool.request()
            .input('oficina', sql.Int, req.colaborador.oficinaId)
            .input('cliente', sql.Int, veiculo.clienteId)
            .input('matricula', sql.VarChar(12), veiculo.matricula)
            .input('tipo', sql.VarChar(20), veiculo.tipo)
            .input('marca', sql.NVarChar(50), veiculo.marca)
            .input('modelo', sql.NVarChar(60), veiculo.modelo)
            .input('ano', sql.SmallInt, veiculo.ano)
            .input('marcaCelula', sql.NVarChar(50), veiculo.marcaCelula)
            .query(`
                INSERT INTO Veiculo (ID_Oficina, ID_Cliente, Matricula, Tipo, Marca, Modelo, Ano, Marca_Celula)
                OUTPUT INSERTED.ID_Veiculo AS id
                VALUES (@oficina, @cliente, @matricula, @tipo, @marca, @modelo, @ano, @marcaCelula)
            `);
        res.status(201).json({ id: resultado.recordset[0].id, ...veiculo });
    } catch (err) {
        throw erroMatriculaRepetida(err);
    }
});

// PUT /api/veiculos/:id. A matrícula também se pode corrigir: deixou de ser
// a chave primária (agora é o ID_Veiculo), por isso um engano já não obriga
// a apagar e voltar a criar o veículo
router.put('/:id', async (req, res) => {
    const id = idDoUrl(req.params.id, 'Veículo');
    const veiculo = lerVeiculo(new Validador(req.body));
    const pool = await getPool();
    await confirmarCliente(pool, req.colaborador.oficinaId, veiculo.clienteId);

    let resultado;
    try {
        resultado = await pool.request()
            .input('id', sql.Int, id)
            .input('oficina', sql.Int, req.colaborador.oficinaId)
            .input('cliente', sql.Int, veiculo.clienteId)
            .input('matricula', sql.VarChar(12), veiculo.matricula)
            .input('tipo', sql.VarChar(20), veiculo.tipo)
            .input('marca', sql.NVarChar(50), veiculo.marca)
            .input('modelo', sql.NVarChar(60), veiculo.modelo)
            .input('ano', sql.SmallInt, veiculo.ano)
            .input('marcaCelula', sql.NVarChar(50), veiculo.marcaCelula)
            .query(`
                UPDATE Veiculo
                SET ID_Cliente = @cliente, Matricula = @matricula, Tipo = @tipo, Marca = @marca,
                    Modelo = @modelo, Ano = @ano, Marca_Celula = @marcaCelula
                OUTPUT INSERTED.ID_Veiculo AS id
                WHERE ID_Veiculo = @id AND ID_Oficina = @oficina AND Ativo = 1
            `);
    } catch (err) {
        throw erroMatriculaRepetida(err);
    }

    if (resultado.recordset.length === 0) throw naoEncontrado('Veículo');
    res.json({ id, ...veiculo });
});

// DELETE /api/veiculos/:id: arquiva (soft delete), mas só se o veículo não
// estiver neste momento na oficina (sem folhas por entregar)
router.delete('/:id', exigirCargo('gestor'), async (req, res) => {
    const id = idDoUrl(req.params.id, 'Veículo');
    const pool = await getPool();
    const resultado = await pool.request()
        .input('id', sql.Int, id)
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .query(`
            UPDATE Veiculo SET Ativo = 0
            OUTPUT INSERTED.ID_Veiculo AS id
            WHERE ID_Veiculo = @id AND ID_Oficina = @oficina AND Ativo = 1
              AND NOT EXISTS (
                  SELECT 1 FROM Folha_Obra f
                  WHERE f.ID_Oficina = @oficina AND f.ID_Veiculo = @id AND f.Estado <> 'entregue'
              );

            SELECT COUNT(*) AS abertas FROM Folha_Obra
            WHERE ID_Oficina = @oficina AND ID_Veiculo = @id AND Estado <> 'entregue';
        `);

    if (resultado.recordsets[0].length === 0) {
        if (resultado.recordsets[1][0].abertas > 0) {
            throw new ErroHttp(409, 'Este veículo ainda está na oficina. Entrega primeiro a folha de obra.');
        }
        throw naoEncontrado('Veículo');
    }
    res.status(204).end();
});

module.exports = router;
