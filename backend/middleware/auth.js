const { sql, getPool } = require('../db');
const { ErroHttp } = require('../lib/erros');
const { lerSessao, terminarSessao } = require('../lib/sessao');

// vai buscar à BD o colaborador da sessão. Isto corre em cada pedido de
// propósito: se o gestor desativar alguém, mudar o cargo ou a password, a
// mudança conta logo, em vez de esperar até o token expirar (até 12h).
// É uma consulta pela chave primária, custa menos de um milissegundo.
async function carregarColaborador(sessao) {
    const pool = await getPool();
    const resultado = await pool.request()
        .input('id', sql.Int, sessao.colaboradorId)
        .query(`
            SELECT c.ID_Colaborador AS id, c.Nome AS nome, c.Cargo AS cargo,
                   c.Versao_Sessao AS versaoSessao, c.ID_Oficina AS oficinaId,
                   o.Nome AS oficinaNome
            FROM Colaborador c
            JOIN Oficina o ON o.ID_Oficina = c.ID_Oficina
            WHERE c.ID_Colaborador = @id AND c.Ativo = 1 AND o.Ativo = 1
        `);

    const colaborador = resultado.recordset[0];
    if (!colaborador ||
        colaborador.versaoSessao !== sessao.versao ||
        colaborador.oficinaId !== sessao.oficinaId) {
        return null;
    }
    return { ...colaborador, via: sessao.via };
}

// exige uma sessão válida. Se estiver tudo bem, deixa em req.colaborador:
// { id, nome, cargo, oficinaId, oficinaNome, via }
// e todas as consultas seguintes filtram por req.colaborador.oficinaId
async function exigirSessao(req, res, next) {
    const sessao = lerSessao(req);
    if (!sessao) {
        throw new ErroHttp(401, 'A tua sessão terminou. Entra outra vez.');
    }

    const colaborador = await carregarColaborador(sessao);
    if (!colaborador) {
        terminarSessao(res);
        throw new ErroHttp(401, 'A tua sessão terminou. Entra outra vez.');
    }

    req.colaborador = colaborador;
    next();
}

// depois do exigirSessao: confirma que o colaborador tem um dos cargos
// permitidos. Ex.: router.post('/', exigirCargo('gestor'), ...)
function exigirCargo(...cargos) {
    return (req, res, next) => {
        if (!req.colaborador || !cargos.includes(req.colaborador.cargo)) {
            throw new ErroHttp(403, 'Só um gestor da oficina pode fazer isto.');
        }
        next();
    };
}

// o PIN do tablet partilhado é fácil de ver por cima do ombro. Por isso dá
// acesso ao trabalho do dia a dia, mas mexer em contas e nas definições da
// oficina exige ter entrado com email e password
function exigirEntradaComPassword(req, res, next) {
    if (req.colaborador?.via !== 'password') {
        throw new ErroHttp(403, 'Para isto tens de entrar com o teu email e password (o PIN não chega).');
    }
    next();
}

module.exports = { exigirSessao, exigirCargo, exigirEntradaComPassword, carregarColaborador };
