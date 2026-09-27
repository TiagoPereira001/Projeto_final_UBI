const jwt = require('jsonwebtoken');
const config = require('../config');

// sessões guardadas em cookies httpOnly.
//
// antes o token ia no localStorage do browser, onde qualquer script da
// página o consegue ler (se alguma vez houvesse uma falha de XSS, a sessão
// era roubada). Um cookie httpOnly não é acessível ao JavaScript, e com
// SameSite=Strict o browser nem o envia em pedidos vindos de outros sites.
//
// há dois cookies:
//  - sessão: quem está a trabalhar agora (colaborador + oficina)
//  - dispositivo: marca este tablet como "bancada" da oficina, para os
//    mecânicos entrarem só com o nome e o PIN

const COOKIE_SESSAO = 'bancada_sessao';
const COOKIE_DISPOSITIVO = 'bancada_dispositivo';

const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000; // um turno longo
const DURACAO_DISPOSITIVO_MS = 180 * 24 * 60 * 60 * 1000; // ~6 meses

const EMISSOR = 'bancada';

function opcoesCookie(maxAge) {
    return {
        httpOnly: true,
        secure: config.cookieSegura,
        sameSite: 'strict',
        path: '/api',
        maxAge,
    };
}

function assinar(dados, audiencia, duracaoMs) {
    return jwt.sign(dados, config.jwtSegredo, {
        algorithm: 'HS256',
        expiresIn: Math.floor(duracaoMs / 1000),
        audience: audiencia,
        issuer: EMISSOR,
    });
}

// devolve o conteúdo do token, ou null se faltar, estiver adulterado ou
// expirado. O algoritmo fica fixo em HS256 (nunca se aceita o que o token
// diz sobre si próprio) e a audiência impede que um token de dispositivo
// sirva como sessão, e vice-versa
function verificar(token, audiencia) {
    if (!token || typeof token !== 'string') return null;
    try {
        return jwt.verify(token, config.jwtSegredo, {
            algorithms: ['HS256'],
            audience: audiencia,
            issuer: EMISSOR,
        });
    } catch {
        return null;
    }
}

// via: 'password' (entrou com email e password) ou 'pin' (entrou no tablet)
function iniciarSessao(res, colaborador, via) {
    const token = assinar(
        { sub: String(colaborador.id), ofi: colaborador.oficinaId, v: colaborador.versaoSessao, via },
        'sessao',
        DURACAO_SESSAO_MS
    );
    res.cookie(COOKIE_SESSAO, token, opcoesCookie(DURACAO_SESSAO_MS));
}

function lerSessao(req) {
    const dados = verificar(req.cookies?.[COOKIE_SESSAO], 'sessao');
    if (!dados) return null;
    const id = Number(dados.sub);
    if (!Number.isInteger(id)) return null;
    return { colaboradorId: id, oficinaId: dados.ofi, versao: dados.v, via: dados.via };
}

function terminarSessao(res) {
    res.clearCookie(COOKIE_SESSAO, opcoesCookie(undefined));
}

function ativarDispositivo(res, oficinaId, versaoBancada) {
    const token = assinar({ ofi: oficinaId, v: versaoBancada }, 'dispositivo', DURACAO_DISPOSITIVO_MS);
    res.cookie(COOKIE_DISPOSITIVO, token, opcoesCookie(DURACAO_DISPOSITIVO_MS));
}

function lerDispositivo(req) {
    const dados = verificar(req.cookies?.[COOKIE_DISPOSITIVO], 'dispositivo');
    if (!dados) return null;
    return { oficinaId: dados.ofi, versao: dados.v };
}

function desligarDispositivo(res) {
    res.clearCookie(COOKIE_DISPOSITIVO, opcoesCookie(undefined));
}

module.exports = {
    iniciarSessao,
    lerSessao,
    terminarSessao,
    ativarDispositivo,
    lerDispositivo,
    desligarDispositivo,
};
