const path = require('node:path');
require('./lib/ambiente');

// configuração central da API. Lê as variáveis de ambiente uma única vez,
// valida-as e pára logo no arranque se faltar alguma coisa importante, com
// uma mensagem clara. Antes cada ficheiro lia o process.env à sua maneira.

function obrigatoria(nome) {
    const valor = process.env[nome];
    if (!valor) {
        throw new Error(
            `Falta a variável ${nome}. Copia o .env.example para .env e preenche-a.`
        );
    }
    return valor;
}

// o JWT_SECRET antigo esteve exposto num repositório público, por isso aqui
// recusa-se qualquer segredo curto ou copiado de um exemplo
function segredoJwt() {
    const segredo = obrigatoria('JWT_SECRET');
    const exemplos = ['segredo_temporario_trocar_em_producao', 'troca-isto', 'changeme', 'secret'];
    if (segredo.length < 32 || exemplos.some((e) => segredo.toLowerCase().includes(e))) {
        throw new Error(
            'O JWT_SECRET tem de ter pelo menos 32 caracteres aleatórios. Gera um com: ' +
            'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"'
        );
    }
    return segredo;
}

const producao = process.env.NODE_ENV === 'production';

function lista(valor, omissao) {
    return (valor || omissao).split(',').map((s) => s.trim()).filter(Boolean);
}

const config = {
    producao,
    porta: Number(process.env.PORT) || 3000,

    db: {
        servidor: process.env.DB_HOST || 'localhost',
        porta: Number(process.env.DB_PORT) || 1433,
        nome: process.env.DB_NAME || 'Bancada',
        utilizador: process.env.DB_USER || 'bancada_app',
        password: obrigatoria('DB_PASSWORD'),
        // em produção a ligação à BD deve ir encriptada (DB_ENCRYPT=true)
        encriptar: process.env.DB_ENCRYPT === 'true',
        confiarCertificado: process.env.DB_TRUST_CERT !== 'false',
    },

    jwtSegredo: segredoJwt(),

    // cookies "Secure" só viajam por HTTPS. Em desenvolvimento (http://localhost)
    // ficam desligadas, em produção ligadas
    cookieSegura: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : producao,

    // de onde o browser pode fazer pedidos que alteram dados (proteção CSRF)
    origensPermitidas: lista(process.env.APP_ORIGINS, 'http://localhost:5173,http://localhost:3000'),

    // atrás de um proxy (nginx, Caddy...) o IP real vem no X-Forwarded-For.
    // sem isto, o rate limiting via toda a gente como o mesmo IP
    trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : false,

    // em produção a API também serve o frontend já compilado (mesma origem:
    // sem CORS e com cookies SameSite=Strict a funcionar)
    frontendDist: process.env.FRONTEND_DIST ||
        (producao ? path.join(__dirname, '..', 'frontend', 'dist') : null),
};

module.exports = config;
