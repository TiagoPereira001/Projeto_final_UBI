const express = require('express');
const { sql, getPool } = require('../db');
const { ErroHttp, naoEncontrado, idDoUrl, violouRestricao } = require('../lib/erros');
const { Validador } = require('../lib/validar');
const { gerarHash } = require('../lib/credenciais');
const sessao = require('../lib/sessao');
const { exigirSessao, exigirCargo, exigirEntradaComPassword } = require('../middleware/auth');

const CARGOS = ['gestor', 'mecanico'];

// cada colaborador pode entrar de duas formas:
//  - email + password: no seu próprio telemóvel ou computador
//  - PIN: no tablet partilhado da oficina (modo bancada)
// um mecânico pode ter só PIN (não precisa de email). O gestor tem sempre
// email e password, porque é ele que administra a oficina.

const router = express.Router();

// tudo aqui é gestão de contas: só gestores, e só com password
router.use(exigirSessao, exigirCargo('gestor'), exigirEntradaComPassword);

const CAMPOS = `
    ID_Colaborador AS id, Nome AS nome, Cargo AS cargo, Email AS email,
    CAST(CASE WHEN PIN_Hash IS NULL THEN 0 ELSE 1 END AS BIT) AS temPin
`;

function erroEmailRepetido(err) {
    if (violouRestricao(err, 'UX_Colaborador_Email')) {
        return new ErroHttp(409, 'Já existe uma conta com esse email.', { email: 'Este email já tem conta.' });
    }
    return err;
}

// GET /api/colaboradores (nunca devolve hashes de passwords ou PINs)
router.get('/', async (req, res) => {
    const pool = await getPool();
    const resultado = await pool.request()
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .query(`
            SELECT ${CAMPOS}
            FROM Colaborador
            WHERE ID_Oficina = @oficina AND Ativo = 1
            ORDER BY Nome
        `);
    res.json({ itens: resultado.recordset, total: resultado.recordset.length });
});

// POST /api/colaboradores { nome, cargo, email?, password?, pin? }
router.post('/', async (req, res) => {
    const v = new Validador(req.body);
    const nome = v.texto('nome', { max: 100 });
    const cargo = v.opcao('cargo', CARGOS);
    const email = v.email('email', { obrigatorio: cargo === 'gestor' });
    const password = email ? v.password('password', { email }) : null;
    // sem email, o PIN é a única forma de entrar
    const pin = v.pin('pin', { obrigatorio: !email });
    v.verificar();

    const [passwordHash, pinHash] = await Promise.all([
        password ? gerarHash(password) : null,
        pin ? gerarHash(pin) : null,
    ]);

    const pool = await getPool();
    try {
        const resultado = await pool.request()
            .input('oficina', sql.Int, req.colaborador.oficinaId)
            .input('nome', sql.NVarChar(100), nome)
            .input('cargo', sql.VarChar(20), cargo)
            .input('email', sql.NVarChar(254), email)
            .input('passwordHash', sql.Char(60), passwordHash)
            .input('pinHash', sql.Char(60), pinHash)
            .query(`
                INSERT INTO Colaborador (ID_Oficina, Nome, Cargo, Email, Password_Hash, PIN_Hash)
                OUTPUT INSERTED.ID_Colaborador AS id, INSERTED.Nome AS nome, INSERTED.Cargo AS cargo,
                       INSERTED.Email AS email,
                       CAST(CASE WHEN INSERTED.PIN_Hash IS NULL THEN 0 ELSE 1 END AS BIT) AS temPin
                VALUES (@oficina, @nome, @cargo, @email, @passwordHash, @pinHash)
            `);
        res.status(201).json(resultado.recordset[0]);
    } catch (err) {
        throw erroEmailRepetido(err);
    }
});

// PUT /api/colaboradores/:id { nome, cargo, email?, password?, pin?, removerPin? }
// - email vazio: deixa de poder entrar com email (fica só com o PIN)
// - password / pin: só mudam se vierem preenchidos
router.put('/:id', async (req, res) => {
    const id = idDoUrl(req.params.id, 'Colaborador');
    const pool = await getPool();

    const atual = (await pool.request()
        .input('id', sql.Int, id)
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .query(`
            SELECT Email AS email, Cargo AS cargo,
                   CAST(CASE WHEN Password_Hash IS NULL THEN 0 ELSE 1 END AS BIT) AS temPassword,
                   CAST(CASE WHEN PIN_Hash IS NULL THEN 0 ELSE 1 END AS BIT) AS temPin
            FROM Colaborador
            WHERE ID_Colaborador = @id AND ID_Oficina = @oficina AND Ativo = 1
        `)).recordset[0];
    if (!atual) throw naoEncontrado('Colaborador');

    const v = new Validador(req.body);
    const nome = v.texto('nome', { max: 100 });
    const cargo = v.opcao('cargo', CARGOS);
    const email = v.email('email', { obrigatorio: cargo === 'gestor' });
    // passar a ter email pela primeira vez (ou mudar de email) obriga a definir password
    const precisaPassword = email && (!atual.temPassword || email !== atual.email);
    const password = email ? v.password('password', { obrigatorio: Boolean(precisaPassword), email }) : null;
    const removerPin = req.body?.removerPin === true;
    const pin = removerPin ? null : v.pin('pin', { obrigatorio: false });

    if (id === req.colaborador.id && cargo !== 'gestor') {
        v.erro('cargo', 'Não podes retirar o teu próprio cargo de gestor.');
    }
    if (!email && (removerPin || !atual.temPin) && !pin) {
        v.erro('pin', 'Sem email, o colaborador precisa de um PIN para conseguir entrar.');
    }
    v.verificar();

    const [passwordHash, pinHash] = await Promise.all([
        password ? gerarHash(password) : null,
        pin ? gerarHash(pin) : null,
    ]);

    // mudar credenciais termina as sessões abertas desse colaborador
    const credenciaisMudaram = Boolean(passwordHash || pinHash || removerPin || (!email && atual.email));

    let resultado;
    try {
        resultado = await pool.request()
            .input('id', sql.Int, id)
            .input('oficina', sql.Int, req.colaborador.oficinaId)
            .input('nome', sql.NVarChar(100), nome)
            .input('cargo', sql.VarChar(20), cargo)
            .input('email', sql.NVarChar(254), email)
            .input('passwordHash', sql.Char(60), passwordHash)
            .input('pinHash', sql.Char(60), pinHash)
            .input('removerPin', sql.Bit, removerPin)
            .input('versaoSobe', sql.Bit, credenciaisMudaram)
            .query(`
                UPDATE Colaborador
                SET Nome = @nome,
                    Cargo = @cargo,
                    Email = @email,
                    Password_Hash = CASE WHEN @email IS NULL THEN NULL
                                         ELSE COALESCE(@passwordHash, Password_Hash) END,
                    PIN_Hash = CASE WHEN @removerPin = 1 THEN NULL ELSE COALESCE(@pinHash, PIN_Hash) END,
                    PIN_Falhas = CASE WHEN @pinHash IS NULL THEN PIN_Falhas ELSE 0 END,
                    PIN_Bloqueado_Ate = CASE WHEN @pinHash IS NULL THEN PIN_Bloqueado_Ate ELSE NULL END,
                    Versao_Sessao = Versao_Sessao + CASE WHEN @versaoSobe = 1 THEN 1 ELSE 0 END
                OUTPUT INSERTED.ID_Colaborador AS id, INSERTED.Nome AS nome, INSERTED.Cargo AS cargo,
                       INSERTED.Email AS email, INSERTED.Versao_Sessao AS versaoSessao,
                       CAST(CASE WHEN INSERTED.PIN_Hash IS NULL THEN 0 ELSE 1 END AS BIT) AS temPin
                WHERE ID_Colaborador = @id AND ID_Oficina = @oficina AND Ativo = 1
            `);
    } catch (err) {
        if (err.number === 547) {
            throw new ErroHttp(400, 'Esta combinação de acessos não é possível: o colaborador ficava sem forma de entrar.');
        }
        throw erroEmailRepetido(err);
    }

    const { versaoSessao, ...colaborador } = resultado.recordset[0];

    // se o gestor mudou a sua própria password, renova-lhe a sessão para
    // não ser posto fora a meio do que está a fazer
    if (id === req.colaborador.id && credenciaisMudaram) {
        sessao.iniciarSessao(res, { id, oficinaId: req.colaborador.oficinaId, versaoSessao }, req.colaborador.via);
    }
    res.json(colaborador);
});

// DELETE /api/colaboradores/:id: soft delete (Ativo = 0). As folhas de obra
// continuam a apontar para este colaborador, por isso nunca se apaga a linha
router.delete('/:id', async (req, res) => {
    const id = idDoUrl(req.params.id, 'Colaborador');
    if (id === req.colaborador.id) {
        throw new ErroHttp(400, 'Não podes desativar a tua própria conta.');
    }

    const pool = await getPool();
    const resultado = await pool.request()
        .input('id', sql.Int, id)
        .input('oficina', sql.Int, req.colaborador.oficinaId)
        .query(`
            UPDATE Colaborador
            SET Ativo = 0, Versao_Sessao = Versao_Sessao + 1
            OUTPUT INSERTED.ID_Colaborador AS id
            WHERE ID_Colaborador = @id AND ID_Oficina = @oficina AND Ativo = 1
        `);

    if (resultado.recordset.length === 0) throw naoEncontrado('Colaborador');
    res.status(204).end();
});

module.exports = router;
