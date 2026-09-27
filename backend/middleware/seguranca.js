const rateLimit = require('express-rate-limit');
const config = require('../config');
const { ErroHttp } = require('../lib/erros');

// proteção contra CSRF: um site malicioso não pode pôr o browser de um
// gestor a fazer pedidos que alteram dados na Bancada.
// 1) os cookies de sessão são SameSite=Strict (o browser não os envia em
//    pedidos vindos de outros sites);
// 2) e, por cima disso, pedidos que alteram dados (POST, PUT, PATCH, DELETE)
//    só são aceites se vierem da própria aplicação.
const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

function verificarOrigem(req, res, next) {
    if (METODOS_SEGUROS.has(req.method)) return next();

    // os browsers modernos dizem de onde vem o pedido neste cabeçalho
    const site = req.get('sec-fetch-site');
    if (site && site !== 'same-origin' && site !== 'none') {
        throw new ErroHttp(403, 'Pedido recusado: origem não permitida.');
    }

    const origem = req.get('origin');
    if (origem && !config.origensPermitidas.includes(origem)) {
        throw new ErroHttp(403, 'Pedido recusado: origem não permitida.');
    }
    next();
}

// limites de pedidos (rate limiting). Os valores podem ser ajustados nos
// testes; em produção ficam os de omissão
function criarLimitadores(limites = {}) {
    const mensagem = (texto) => ({ erro: texto });

    // limite geral generoso: um tablet a atualizar o quadro a cada 20 s faz
    // ~15 pedidos em 5 minutos
    const geral = rateLimit({
        windowMs: 5 * 60 * 1000,
        limit: limites.geral ?? 1000,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: mensagem('Demasiados pedidos. Espera um bocadinho e tenta outra vez.'),
    });

    // login: por IP *e* email. Numa oficina todos os tablets e PCs saem para
    // a internet com o mesmo IP; se o limite fosse só por IP, um mecânico a
    // enganar-se na password bloqueava a oficina inteira
    const loginPorConta = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: limites.loginPorConta ?? 8,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        keyGenerator: (req) =>
            `${rateLimit.ipKeyGenerator(req.ip)}|${String(req.body?.email || '').toLowerCase().slice(0, 254)}`,
        message: mensagem('Demasiadas tentativas de entrada. Tenta outra vez daqui a 15 minutos.'),
    });

    // e um teto por IP, para quem tenta muitas contas diferentes
    const loginPorIp = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: limites.loginPorIp ?? 60,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: mensagem('Demasiadas tentativas de entrada. Tenta outra vez daqui a 15 minutos.'),
    });

    const registo = rateLimit({
        windowMs: 60 * 60 * 1000,
        limit: limites.registo ?? 5,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: mensagem('Demasiados registos a partir desta ligação. Tenta outra vez daqui a uma hora.'),
    });

    // o PIN tem também um bloqueio por colaborador, guardado na BD (ver auth.js)
    const pin = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: limites.pin ?? 40,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: mensagem('Demasiadas tentativas de PIN. Tenta outra vez daqui a 15 minutos.'),
    });

    return { geral, loginPorConta, loginPorIp, registo, pin };
}

module.exports = { verificarOrigem, criarLimitadores };
