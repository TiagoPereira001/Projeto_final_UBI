const express = require('express');
const { sql, getPool, emTransacao } = require('../db');
const { ErroHttp, naoEncontrado, idDoUrl } = require('../lib/erros');
const { Validador, escaparLike, normalizarMatricula, paginacao } = require('../lib/validar');
const { exigirSessao, exigirCargo } = require('../middleware/auth');

const ESTADOS = ['aberta', 'em_curso', 'aguarda_pecas', 'concluida', 'entregue'];
const ESTADOS_ATIVOS = ESTADOS.filter((e) => e !== 'entregue');
const CATEGORIAS = ['peca', 'mao_de_obra', 'outro'];
const MAX_LINHAS_NA_CRIACAO = 50;

const router = express.Router();
router.use(exigirSessao);

// ---------------------------------------------------------------------------
// totais: calculados no SQL Server com DECIMAL, que é exato. Em JavaScript,
// 3 x 19.99 dá 59.970000000000006, e isso não pode aparecer numa conta.
// Cada linha é arredondada ao cêntimo, e o IVA é calculado sobre o subtotal.
// ---------------------------------------------------------------------------
const SQL_TOTAIS = `
    SELECT t.subtotal, t.pecas, t.maoDeObra, t.outros, f.Taxa_IVA AS taxaIva,
           ROUND(t.subtotal * f.Taxa_IVA / 100, 2) AS iva,
           t.subtotal + ROUND(t.subtotal * f.Taxa_IVA / 100, 2) AS total
    FROM Folha_Obra f
    CROSS APPLY (
        SELECT ISNULL(SUM(ROUND(l.Quantidade * l.Valor_Unitario, 2)), 0) AS subtotal,
               ISNULL(SUM(CASE WHEN l.Categoria = 'peca' THEN ROUND(l.Quantidade * l.Valor_Unitario, 2) END), 0) AS pecas,
               ISNULL(SUM(CASE WHEN l.Categoria = 'mao_de_obra' THEN ROUND(l.Quantidade * l.Valor_Unitario, 2) END), 0) AS maoDeObra,
               ISNULL(SUM(CASE WHEN l.Categoria = 'outro' THEN ROUND(l.Quantidade * l.Valor_Unitario, 2) END), 0) AS outros
        FROM Linha_Reparacao l WHERE l.ID_Folha = f.ID_Folha
    ) t
    WHERE f.ID_Folha = @id AND f.ID_Oficina = @oficina
`;

async function totaisDaFolha(pool, oficinaId, folhaId) {
    const resultado = await pool.request()
        .input('id', sql.Int, folhaId)
        .input('oficina', sql.Int, oficinaId)
        .query(SQL_TOTAIS);
    return resultado.recordset[0];
}

// folha completa: dados, veículo, cliente, linhas e totais, tudo numa só
// ida à base de dados (três consultas no mesmo pedido)
async function carregarFolha(pool, oficinaId, folhaId) {
    const resultado = await pool.request()
        .input('id', sql.Int, folhaId)
        .input('oficina', sql.Int, oficinaId)
        .query(`
            SELECT f.ID_Folha AS id, f.Numero AS numero, f.Estado AS estado,
                   f.Data_Entrada AS dataEntrada, f.KMS_Entrada AS kmsEntrada,
                   f.Observacoes AS observacoes, f.Conselhos AS conselhos,
                   f.Data_Conclusao AS dataConclusao, f.Data_Entrega AS dataEntrega,
                   v.ID_Veiculo AS veiculoId, v.Matricula AS matricula, v.Tipo AS tipo,
                   v.Marca AS marca, v.Modelo AS modelo, v.Ano AS ano, v.Marca_Celula AS marcaCelula,
                   c.ID_Cliente AS clienteId, c.Nome AS clienteNome, c.Telefone AS clienteTelefone,
                   c.NIF AS clienteNif, c.Email AS clienteEmail,
                   col.ID_Colaborador AS colaboradorId, col.Nome AS colaboradorNome
            FROM Folha_Obra f
            JOIN Veiculo v ON v.ID_Oficina = f.ID_Oficina AND v.ID_Veiculo = f.ID_Veiculo
            JOIN Cliente c ON c.ID_Oficina = f.ID_Oficina AND c.ID_Cliente = f.ID_Cliente
            JOIN Colaborador col ON col.ID_Oficina = f.ID_Oficina AND col.ID_Colaborador = f.ID_Colaborador
            WHERE f.ID_Folha = @id AND f.ID_Oficina = @oficina;

            SELECT l.ID_Linha AS id, l.Designacao AS designacao, l.Categoria AS categoria,
                   l.Quantidade AS quantidade, l.Valor_Unitario AS valorUnitario,
                   ROUND(l.Quantidade * l.Valor_Unitario, 2) AS total, l.Criado_Em AS criadoEm,
                   col.ID_Colaborador AS colaboradorId, col.Nome AS colaboradorNome
            FROM Linha_Reparacao l
            JOIN Folha_Obra f ON f.ID_Folha = l.ID_Folha
            JOIN Colaborador col ON col.ID_Colaborador = l.ID_Colaborador
            WHERE l.ID_Folha = @id AND f.ID_Oficina = @oficina
            ORDER BY l.ID_Linha;

            ${SQL_TOTAIS};
        `);

    const f = resultado.recordsets[0][0];
    if (!f) return null;

    return {
        id: f.id,
        numero: f.numero,
        estado: f.estado,
        dataEntrada: f.dataEntrada,
        kmsEntrada: f.kmsEntrada,
        observacoes: f.observacoes,
        conselhos: f.conselhos,
        dataConclusao: f.dataConclusao,
        dataEntrega: f.dataEntrega,
        veiculo: {
            id: f.veiculoId, matricula: f.matricula, tipo: f.tipo, marca: f.marca,
            modelo: f.modelo, ano: f.ano, marcaCelula: f.marcaCelula,
        },
        cliente: {
            id: f.clienteId, nome: f.clienteNome, telefone: f.clienteTelefone,
            nif: f.clienteNif, email: f.clienteEmail,
        },
        colaborador: { id: f.colaboradorId, nome: f.colaboradorNome },
        linhas: resultado.recordsets[1].map(({ colaboradorId, colaboradorNome, ...linha }) => ({
            ...linha,
            colaborador: { id: colaboradorId, nome: colaboradorNome },
        })),
        totais: resultado.recordsets[2][0],
    };
}

function lerLinha(v) {
    return {
        designacao: v.texto('designacao', { max: 150 }),
        categoria: v.opcao('categoria', CATEGORIAS),
        quantidade: v.decimal('quantidade', { min: 0, minExclusivo: true, max: 99999 }),
        valorUnitario: v.decimal('valorUnitario', { min: 0, max: 9999999 }),
    };
}

function pedidoLinha(request, linha) {
    return request
        .input('designacao', sql.NVarChar(150), linha.designacao)
        .input('categoria', sql.VarChar(20), linha.categoria)
        .input('quantidade', sql.Decimal(10, 2), linha.quantidade)
        .input('valorUnitario', sql.Decimal(10, 2), linha.valorUnitario);
}

// ---------------------------------------------------------------------------
// GET /api/folhas-obra?estado=ativas|aberta,em_curso&veiculo=3&q=AA00&ordem=antigas
// o quadro da oficina pede estado=ativas (tudo menos as entregues)
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
    const { pagina, porPagina, salto } = paginacao(req.query, { omissao: 100, maximo: 200 });

    let estados = null;
    if (typeof req.query.estado === 'string' && req.query.estado) {
        estados = req.query.estado === 'ativas' ? ESTADOS_ATIVOS : req.query.estado.split(',');
        if (estados.some((e) => !ESTADOS.includes(e))) {
            throw new ErroHttp(400, 'Estado desconhecido.');
        }
    }
    const veiculoId = Number.parseInt(req.query.veiculo, 10) || null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const matriculaQ = normalizarMatricula(q);
    const ordem = req.query.ordem === 'antigas' ? 'ASC' : 'DESC';

    const pool = await getPool();
    const resultado = await pool.request()
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        // lista de estados validada acima contra a lista fixa; vai como JSON
        .input('estados', sql.NVarChar(200), estados ? JSON.stringify(estados) : null)
        .input('veiculo', sql.Int, veiculoId)
        .input('q', sql.NVarChar(100), q || null)
        .input('padrao', sql.NVarChar(210), `%${escaparLike(q)}%`)
        .input('padraoMatricula', sql.VarChar(30), matriculaQ ? `%${matriculaQ}%` : null)
        .input('salto', sql.Int, salto)
        .input('porPagina', sql.Int, porPagina)
        .query(`
            SELECT COUNT(*) OVER () AS total,
                   f.ID_Folha AS id, f.Numero AS numero, f.Estado AS estado,
                   f.Data_Entrada AS dataEntrada, f.KMS_Entrada AS kmsEntrada,
                   LEFT(f.Observacoes, 160) AS observacoes,
                   v.ID_Veiculo AS veiculoId, v.Matricula AS matricula, v.Tipo AS tipo,
                   v.Marca AS marca, v.Modelo AS modelo, v.Marca_Celula AS marcaCelula,
                   c.ID_Cliente AS clienteId, c.Nome AS clienteNome, c.Telefone AS clienteTelefone,
                   col.ID_Colaborador AS colaboradorId, col.Nome AS colaboradorNome,
                   t.linhas, t.subtotal
            FROM Folha_Obra f
            JOIN Veiculo v ON v.ID_Oficina = f.ID_Oficina AND v.ID_Veiculo = f.ID_Veiculo
            JOIN Cliente c ON c.ID_Oficina = f.ID_Oficina AND c.ID_Cliente = f.ID_Cliente
            JOIN Colaborador col ON col.ID_Oficina = f.ID_Oficina AND col.ID_Colaborador = f.ID_Colaborador
            OUTER APPLY (
                SELECT COUNT(*) AS linhas,
                       ISNULL(SUM(ROUND(l.Quantidade * l.Valor_Unitario, 2)), 0) AS subtotal
                FROM Linha_Reparacao l WHERE l.ID_Folha = f.ID_Folha
            ) t
            WHERE f.ID_Oficina = @oficina
              AND (@estados IS NULL OR f.Estado IN (SELECT value FROM OPENJSON(@estados)))
              AND (@veiculo IS NULL OR f.ID_Veiculo = @veiculo)
              AND (@q IS NULL
                   OR v.Matricula LIKE @padraoMatricula
                   OR c.Nome LIKE @padrao ESCAPE '\\'
                   OR CAST(f.Numero AS VARCHAR(12)) = @q)
            ORDER BY f.Data_Entrada ${ordem}, f.ID_Folha ${ordem}
            OFFSET @salto ROWS FETCH NEXT @porPagina ROWS ONLY
        `);

    const linhas = resultado.recordset;
    res.json({
        itens: linhas.map((f) => ({
            id: f.id,
            numero: f.numero,
            estado: f.estado,
            dataEntrada: f.dataEntrada,
            kmsEntrada: f.kmsEntrada,
            observacoes: f.observacoes,
            veiculo: {
                id: f.veiculoId, matricula: f.matricula, tipo: f.tipo,
                marca: f.marca, modelo: f.modelo, marcaCelula: f.marcaCelula,
            },
            cliente: { id: f.clienteId, nome: f.clienteNome, telefone: f.clienteTelefone },
            colaborador: { id: f.colaboradorId, nome: f.colaboradorNome },
            linhas: f.linhas,
            subtotal: f.subtotal,
        })),
        total: linhas[0]?.total ?? 0,
        pagina,
        porPagina,
    });
});

// GET /api/folhas-obra/resumo?desde=2026-09-01T00:00:00.000Z (só gestores)
// quantas folhas há em cada estado, o valor do trabalho em curso e o que foi
// entregue desde uma data (o frontend manda o início do mês na hora local)
router.get('/resumo', exigirCargo('gestor'), async (req, res) => {
    const v = new Validador(req.query);
    const desde = v.dataHora('desde') ||
        new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    v.verificar();

    const pool = await getPool();
    const resultado = await pool.request()
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .input('desde', sql.DateTime2(0), desde)
        .query(`
            SELECT Estado AS estado, COUNT(*) AS folhas
            FROM Folha_Obra
            WHERE ID_Oficina = @oficina AND Estado <> 'entregue'
            GROUP BY Estado;

            SELECT ISNULL(SUM(t.subtotal), 0) AS subtotal
            FROM Folha_Obra f
            CROSS APPLY (
                SELECT ISNULL(SUM(ROUND(l.Quantidade * l.Valor_Unitario, 2)), 0) AS subtotal
                FROM Linha_Reparacao l WHERE l.ID_Folha = f.ID_Folha
            ) t
            WHERE f.ID_Oficina = @oficina AND f.Estado <> 'entregue';

            SELECT COUNT(*) AS folhas,
                   ISNULL(SUM(t.subtotal), 0) AS subtotal,
                   ISNULL(SUM(t.subtotal + ROUND(t.subtotal * f.Taxa_IVA / 100, 2)), 0) AS total
            FROM Folha_Obra f
            CROSS APPLY (
                SELECT ISNULL(SUM(ROUND(l.Quantidade * l.Valor_Unitario, 2)), 0) AS subtotal
                FROM Linha_Reparacao l WHERE l.ID_Folha = f.ID_Folha
            ) t
            WHERE f.ID_Oficina = @oficina AND f.Estado = 'entregue' AND f.Data_Entrega >= @desde;
        `);

    const porEstado = Object.fromEntries(ESTADOS_ATIVOS.map((e) => [e, 0]));
    for (const { estado, folhas } of resultado.recordsets[0]) porEstado[estado] = folhas;

    res.json({
        porEstado,
        emCurso: { subtotal: resultado.recordsets[1][0].subtotal },
        entregues: { desde, ...resultado.recordsets[2][0] },
    });
});

// GET /api/folhas-obra/:id
router.get('/:id', async (req, res) => {
    const id = idDoUrl(req.params.id, 'Folha de obra');
    const pool = await getPool();
    const folha = await carregarFolha(pool, req.colaborador.oficinaId, id);
    if (!folha) throw naoEncontrado('Folha de obra');
    res.json(folha);
});

// ---------------------------------------------------------------------------
// POST /api/folhas-obra { veiculoId, kmsEntrada?, observacoes?, dataEntrada?, linhas? }
// entrada rápida: basta o veículo. As linhas podem vir já aqui ou ser
// adicionadas depois, à medida que o mecânico trabalha (POST /:id/linhas).
// O colaborador responsável é sempre quem tem a sessão aberta: antes vinha
// no corpo do pedido, e qualquer pessoa podia registar obra em nome de outra.
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
    const v = new Validador(req.body);
    const veiculoId = v.id('veiculoId');
    const kmsEntrada = v.inteiro('kmsEntrada', { obrigatorio: false, min: 0, max: 9999999 });
    const observacoes = v.texto('observacoes', { obrigatorio: false, max: 2000, multilinha: true });
    const dataEntrada = v.dataHora('dataEntrada');

    let linhas = [];
    if (req.body?.linhas !== undefined) {
        if (!Array.isArray(req.body.linhas) || req.body.linhas.length > MAX_LINHAS_NA_CRIACAO) {
            v.erro('linhas', `Tem de ser uma lista com no máximo ${MAX_LINHAS_NA_CRIACAO} linhas.`);
        } else {
            linhas = req.body.linhas.map((linha, i) => lerLinha(new Validador(linha, `linhas.${i}.`, v.erros)));
        }
    }
    v.verificar();

    const oficinaId = req.colaborador.oficinaId;

    // tudo numa transação: ou a folha e todas as linhas ficam gravadas, ou nada
    const criada = await emTransacao(async (transacao) => {
        // 1) reserva o próximo número de folha desta oficina. O UPDATE bloqueia
        //    a linha da oficina até ao fim da transação, por isso duas entradas
        //    ao mesmo tempo nunca recebem o mesmo número
        const contador = await new sql.Request(transacao)
            .input('oficina', sql.Int, oficinaId)
            .query(`
                UPDATE Oficina SET Ultimo_Numero_Folha = Ultimo_Numero_Folha + 1
                OUTPUT INSERTED.Ultimo_Numero_Folha AS numero, INSERTED.Taxa_IVA AS taxaIva
                WHERE ID_Oficina = @oficina
            `);
        const { numero, taxaIva } = contador.recordset[0];

        // 2) o veículo tem de ser desta oficina e não pode já estar cá dentro
        const verificacao = await new sql.Request(transacao)
            .input('oficina', sql.Int, oficinaId)
            .input('veiculo', sql.Int, veiculoId)
            .query(`
                SELECT ID_Cliente AS clienteId FROM Veiculo
                WHERE ID_Veiculo = @veiculo AND ID_Oficina = @oficina AND Ativo = 1;

                SELECT TOP 1 Numero AS numero FROM Folha_Obra
                WHERE ID_Oficina = @oficina AND ID_Veiculo = @veiculo AND Estado <> 'entregue';
            `);
        const veiculo = verificacao.recordsets[0][0];
        if (!veiculo) {
            throw new ErroHttp(400, 'Esse veículo não existe.', { veiculoId: 'Escolhe um veículo válido.' });
        }
        const aberta = verificacao.recordsets[1][0];
        if (aberta) {
            throw new ErroHttp(409, `Este veículo já está na oficina (folha nº ${aberta.numero}).`);
        }

        // 3) a folha, com o cliente atual do veículo e a taxa de IVA de hoje
        const folha = await new sql.Request(transacao)
            .input('oficina', sql.Int, oficinaId)
            .input('numero', sql.Int, numero)
            .input('veiculo', sql.Int, veiculoId)
            .input('cliente', sql.Int, veiculo.clienteId)
            .input('colaborador', sql.Int, req.colaborador.id)
            .input('dataEntrada', sql.DateTime2(0), dataEntrada || new Date())
            .input('kms', sql.Int, kmsEntrada)
            .input('observacoes', sql.NVarChar(2000), observacoes)
            .input('taxaIva', sql.Decimal(5, 2), taxaIva)
            .query(`
                INSERT INTO Folha_Obra (ID_Oficina, Numero, ID_Veiculo, ID_Cliente, ID_Colaborador,
                                        Data_Entrada, KMS_Entrada, Observacoes, Taxa_IVA)
                OUTPUT INSERTED.ID_Folha AS id, INSERTED.Numero AS numero
                VALUES (@oficina, @numero, @veiculo, @cliente, @colaborador,
                        @dataEntrada, @kms, @observacoes, @taxaIva)
            `);
        const nova = folha.recordset[0];

        // 4) as linhas que já vieram no pedido (se vieram)
        for (const linha of linhas) {
            await pedidoLinha(new sql.Request(transacao), linha)
                .input('folha', sql.Int, nova.id)
                .input('colaborador', sql.Int, req.colaborador.id)
                .query(`
                    INSERT INTO Linha_Reparacao (ID_Folha, ID_Colaborador, Designacao, Categoria, Quantidade, Valor_Unitario)
                    VALUES (@folha, @colaborador, @designacao, @categoria, @quantidade, @valorUnitario)
                `);
        }
        return nova;
    });

    const pool = await getPool();
    res.status(201).json(await carregarFolha(pool, oficinaId, criada.id));
});

// ---------------------------------------------------------------------------
// PATCH /api/folhas-obra/:id { estado?, kmsEntrada?, observacoes?, conselhos? }
// só muda o que vier no pedido. Uma folha entregue fica fechada: só um
// gestor a pode reabrir (mudando o estado), e mais nada se altera nela
// ---------------------------------------------------------------------------
router.patch('/:id', async (req, res) => {
    const id = idDoUrl(req.params.id, 'Folha de obra');
    const v = new Validador(req.body);

    const campos = {};
    if (v.presente('estado')) campos.estado = v.opcao('estado', ESTADOS);
    if (v.presente('kmsEntrada')) campos.kmsEntrada = v.inteiro('kmsEntrada', { obrigatorio: false, min: 0, max: 9999999 });
    if (v.presente('observacoes')) campos.observacoes = v.texto('observacoes', { obrigatorio: false, max: 2000, multilinha: true });
    if (v.presente('conselhos')) campos.conselhos = v.texto('conselhos', { obrigatorio: false, max: 2000, multilinha: true });
    if (Object.keys(campos).length === 0) {
        v.erro('estado', 'Não há nada para alterar.');
    }
    v.verificar();

    const pool = await getPool();
    const atual = (await pool.request()
        .input('id', sql.Int, id)
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .query('SELECT Estado AS estado FROM Folha_Obra WHERE ID_Folha = @id AND ID_Oficina = @oficina'))
        .recordset[0];
    if (!atual) throw naoEncontrado('Folha de obra');

    if (atual.estado === 'entregue') {
        const soReabrir = Object.keys(campos).length === 1 && campos.estado && campos.estado !== 'entregue';
        if (!soReabrir || req.colaborador.cargo !== 'gestor') {
            throw new ErroHttp(409, 'Esta folha já foi entregue. Só um gestor a pode reabrir.');
        }
    }

    // os nomes das colunas vêm desta lista fixa, nunca do pedido
    const sets = [];
    const pedido = pool.request()
        .input('id', sql.Int, id)
        .input('oficina', sql.Int, req.colaborador.oficinaId);

    if ('estado' in campos) {
        pedido.input('estado', sql.VarChar(20), campos.estado);
        sets.push(
            'Estado = @estado',
            // a data de conclusão marca quando ficou pronta; se voltar atrás, apaga-se
            `Data_Conclusao = CASE
                WHEN @estado IN ('concluida', 'entregue') THEN COALESCE(Data_Conclusao, SYSUTCDATETIME())
                ELSE NULL END`,
            `Data_Entrega = CASE WHEN @estado = 'entregue' THEN COALESCE(Data_Entrega, SYSUTCDATETIME()) ELSE NULL END`
        );
    }
    if ('kmsEntrada' in campos) {
        pedido.input('kms', sql.Int, campos.kmsEntrada);
        sets.push('KMS_Entrada = @kms');
    }
    if ('observacoes' in campos) {
        pedido.input('observacoes', sql.NVarChar(2000), campos.observacoes);
        sets.push('Observacoes = @observacoes');
    }
    if ('conselhos' in campos) {
        pedido.input('conselhos', sql.NVarChar(2000), campos.conselhos);
        sets.push('Conselhos = @conselhos');
    }

    await pedido.query(`
        UPDATE Folha_Obra SET ${sets.join(', ')}
        WHERE ID_Folha = @id AND ID_Oficina = @oficina
    `);

    res.json(await carregarFolha(pool, req.colaborador.oficinaId, id));
});

// POST /api/folhas-obra/:id/linhas { designacao, categoria, quantidade, valorUnitario }
// é isto que o mecânico usa no dia a dia, à medida que aplica peças ou regista horas
router.post('/:id/linhas', async (req, res) => {
    const id = idDoUrl(req.params.id, 'Folha de obra');
    const v = new Validador(req.body);
    const linha = lerLinha(v);
    v.verificar();

    const pool = await getPool();
    // o INSERT só acontece se a folha for desta oficina e não estiver
    // entregue, tudo na mesma instrução (sem janela para mudar entretanto)
    const resultado = await pedidoLinha(pool.request(), linha)
        .input('folha', sql.Int, id)
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .input('colaborador', sql.Int, req.colaborador.id)
        .query(`
            INSERT INTO Linha_Reparacao (ID_Folha, ID_Colaborador, Designacao, Categoria, Quantidade, Valor_Unitario)
            OUTPUT INSERTED.ID_Linha AS id, INSERTED.Designacao AS designacao, INSERTED.Categoria AS categoria,
                   INSERTED.Quantidade AS quantidade, INSERTED.Valor_Unitario AS valorUnitario,
                   ROUND(INSERTED.Quantidade * INSERTED.Valor_Unitario, 2) AS total, INSERTED.Criado_Em AS criadoEm
            SELECT @folha, @colaborador, @designacao, @categoria, @quantidade, @valorUnitario
            WHERE EXISTS (
                SELECT 1 FROM Folha_Obra
                WHERE ID_Folha = @folha AND ID_Oficina = @oficina AND Estado <> 'entregue'
            )
        `);

    if (resultado.recordset.length === 0) {
        await explicarFolhaIndisponivel(pool, req.colaborador.oficinaId, id);
    }

    res.status(201).json({
        linha: { ...resultado.recordset[0], colaborador: { id: req.colaborador.id, nome: req.colaborador.nome } },
        totais: await totaisDaFolha(pool, req.colaborador.oficinaId, id),
    });
});

// DELETE /api/folhas-obra/:id/linhas/:linhaId
// remove uma linha registada por engano. Aqui o DELETE é a sério (a tabela
// não tem Ativo), mas só enquanto a folha não foi entregue
router.delete('/:id/linhas/:linhaId', async (req, res) => {
    const id = idDoUrl(req.params.id, 'Folha de obra');
    const linhaId = idDoUrl(req.params.linhaId, 'Linha de reparação');

    const pool = await getPool();
    const resultado = await pool.request()
        .input('folha', sql.Int, id)
        .input('linha', sql.Int, linhaId)
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .query(`
            DELETE l
            OUTPUT DELETED.ID_Linha AS id
            FROM Linha_Reparacao l
            JOIN Folha_Obra f ON f.ID_Folha = l.ID_Folha
            WHERE l.ID_Linha = @linha AND l.ID_Folha = @folha
              AND f.ID_Oficina = @oficina AND f.Estado <> 'entregue'
        `);

    if (resultado.recordset.length === 0) {
        await explicarFolhaIndisponivel(pool, req.colaborador.oficinaId, id);
        throw naoEncontrado('Linha de reparação');
    }
    res.json({ totais: await totaisDaFolha(pool, req.colaborador.oficinaId, id) });
});

// quando uma alteração não acontece, diz porquê: ou a folha não existe
// (para esta oficina), ou já foi entregue
async function explicarFolhaIndisponivel(pool, oficinaId, folhaId) {
    const resultado = await pool.request()
        .input('id', sql.Int, folhaId)
        .input('oficina', sql.Int, oficinaId)
        .query('SELECT Estado AS estado FROM Folha_Obra WHERE ID_Folha = @id AND ID_Oficina = @oficina');
    const folha = resultado.recordset[0];
    if (!folha) throw naoEncontrado('Folha de obra');
    if (folha.estado === 'entregue') {
        throw new ErroHttp(409, 'Esta folha já foi entregue: as linhas já não se podem alterar.');
    }
}

module.exports = router;
