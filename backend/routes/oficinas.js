const express = require('express');
const { sql, getPool, emTransacao } = require('../db');
const { ErroHttp, violouRestricao } = require('../lib/erros');
const { Validador } = require('../lib/validar');
const { gerarHash } = require('../lib/credenciais');
const sessao = require('../lib/sessao');
const { exigirSessao, exigirCargo, exigirEntradaComPassword } = require('../middleware/auth');

function criarRouterOficinas(limitadores) {
    const router = express.Router();

    // POST /api/oficinas: registo público. Qualquer oficina cria a sua conta
    // sozinha: a oficina e o primeiro gestor são criados na mesma transação
    // (ou fica tudo gravado, ou nada), e o gestor fica logo com a sessão aberta
    router.post('/', limitadores.registo, async (req, res) => {
        const v = new Validador(req.body);

        const vOficina = v.sub('oficina');
        const oficina = {
            nome: vOficina.texto('nome', { max: 120 }),
            nif: vOficina.nifPortugues('nif'),
            telefone: vOficina.telefone('telefone', { obrigatorio: false }),
            morada: vOficina.texto('morada', { obrigatorio: false, max: 255 }),
        };

        const vGestor = v.sub('gestor');
        const gestor = {
            nome: vGestor.texto('nome', { max: 100 }),
            email: vGestor.email('email'),
        };
        gestor.password = vGestor.password('password', { email: gestor.email });
        v.verificar();

        const passwordHash = await gerarHash(gestor.password);

        let criado;
        try {
            criado = await emTransacao(async (transacao) => {
                const novaOficina = await new sql.Request(transacao)
                    .input('nome', sql.NVarChar(120), oficina.nome)
                    .input('nif', sql.Char(9), oficina.nif)
                    .input('telefone', sql.VarChar(20), oficina.telefone)
                    .input('morada', sql.NVarChar(255), oficina.morada)
                    .input('email', sql.NVarChar(254), gestor.email)
                    .query(`
                        INSERT INTO Oficina (Nome, NIF, Telefone, Morada, Email)
                        OUTPUT INSERTED.ID_Oficina AS id, INSERTED.Nome AS nome
                        VALUES (@nome, @nif, @telefone, @morada, @email)
                    `);

                const oficinaId = novaOficina.recordset[0].id;
                const novoGestor = await new sql.Request(transacao)
                    .input('oficina', sql.Int, oficinaId)
                    .input('nome', sql.NVarChar(100), gestor.nome)
                    .input('email', sql.NVarChar(254), gestor.email)
                    .input('hash', sql.Char(60), passwordHash)
                    .query(`
                        INSERT INTO Colaborador (ID_Oficina, Nome, Cargo, Email, Password_Hash)
                        OUTPUT INSERTED.ID_Colaborador AS id, INSERTED.Nome AS nome, INSERTED.Cargo AS cargo,
                               INSERTED.Versao_Sessao AS versaoSessao, INSERTED.ID_Oficina AS oficinaId
                        VALUES (@oficina, @nome, 'gestor', @email, @hash)
                    `);

                return {
                    ...novoGestor.recordset[0],
                    oficinaNome: novaOficina.recordset[0].nome,
                };
            });
        } catch (err) {
            if (violouRestricao(err, 'UQ_Oficina_NIF')) {
                throw new ErroHttp(409, 'Já existe uma oficina registada com esse NIF.', {
                    'oficina.nif': 'Este NIF já está registado.',
                });
            }
            if (violouRestricao(err, 'UX_Colaborador_Email')) {
                throw new ErroHttp(409, 'Já existe uma conta com esse email.', {
                    'gestor.email': 'Este email já tem conta.',
                });
            }
            throw err;
        }

        sessao.iniciarSessao(res, criado, 'password');
        res.status(201).json({
            colaborador: { id: criado.id, nome: criado.nome, cargo: criado.cargo, via: 'password' },
            oficina: { id: criado.oficinaId, nome: criado.oficinaNome },
        });
    });

    // daqui para baixo: a oficina de quem tem sessão iniciada
    router.use('/atual', exigirSessao);

    // GET /api/oficinas/atual
    router.get('/atual', async (req, res) => {
        const pool = await getPool();
        const resultado = await pool.request()
            .input('oficina', sql.Int, req.colaborador.oficinaId)
            .query(`
                SELECT ID_Oficina AS id, Nome AS nome, NIF AS nif, Morada AS morada,
                       Telefone AS telefone, Email AS email, Taxa_IVA AS taxaIva, Criado_Em AS criadoEm
                FROM Oficina WHERE ID_Oficina = @oficina
            `);
        res.json(resultado.recordset[0]);
    });

    // PUT /api/oficinas/atual: dados da oficina e taxa de IVA por omissão.
    // mudar a taxa só afeta as folhas abertas daqui para a frente
    router.put('/atual', exigirCargo('gestor'), exigirEntradaComPassword, async (req, res) => {
        const v = new Validador(req.body);
        const nome = v.texto('nome', { max: 120 });
        const nif = v.nifPortugues('nif');
        const morada = v.texto('morada', { obrigatorio: false, max: 255 });
        const telefone = v.telefone('telefone', { obrigatorio: false });
        const email = v.email('email', { obrigatorio: false });
        const taxaIva = v.decimal('taxaIva', { min: 0, max: 100 });
        v.verificar();

        const pool = await getPool();
        try {
            const resultado = await pool.request()
                .input('oficina', sql.Int, req.colaborador.oficinaId)
                .input('nome', sql.NVarChar(120), nome)
                .input('nif', sql.Char(9), nif)
                .input('morada', sql.NVarChar(255), morada)
                .input('telefone', sql.VarChar(20), telefone)
                .input('email', sql.NVarChar(254), email)
                .input('taxaIva', sql.Decimal(5, 2), taxaIva)
                .query(`
                    UPDATE Oficina
                    SET Nome = @nome, NIF = @nif, Morada = @morada, Telefone = @telefone,
                        Email = @email, Taxa_IVA = @taxaIva
                    OUTPUT INSERTED.ID_Oficina AS id, INSERTED.Nome AS nome, INSERTED.NIF AS nif,
                           INSERTED.Morada AS morada, INSERTED.Telefone AS telefone,
                           INSERTED.Email AS email, INSERTED.Taxa_IVA AS taxaIva, INSERTED.Criado_Em AS criadoEm
                    WHERE ID_Oficina = @oficina
                `);
            res.json(resultado.recordset[0]);
        } catch (err) {
            if (violouRestricao(err, 'UQ_Oficina_NIF')) {
                throw new ErroHttp(409, 'Já existe outra oficina com esse NIF.', { nif: 'Este NIF já está registado.' });
            }
            throw err;
        }
    });

    // POST /api/oficinas/atual/desligar-tablets: todos os tablets em modo
    // bancada deixam de funcionar (por exemplo, se um tablet for roubado)
    router.post('/atual/desligar-tablets', exigirCargo('gestor'), exigirEntradaComPassword, async (req, res) => {
        const pool = await getPool();
        await pool.request()
            .input('oficina', sql.Int, req.colaborador.oficinaId)
            .query('UPDATE Oficina SET Versao_Bancada = Versao_Bancada + 1 WHERE ID_Oficina = @oficina');
        sessao.desligarDispositivo(res);
        res.status(204).end();
    });

    return router;
}

module.exports = { criarRouterOficinas };
