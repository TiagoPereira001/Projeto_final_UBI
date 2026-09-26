const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const config = require('./config');
const { getPool } = require('./db');
const { verificarOrigem, criarLimitadores } = require('./middleware/seguranca');
const { rotaInexistente, tratarErros } = require('./middleware/erros');
const { criarRouterAuth } = require('./routes/auth');
const { criarRouterOficinas } = require('./routes/oficinas');
const colaboradoresRouter = require('./routes/colaboradores');
const clientesRouter = require('./routes/clientes');
const veiculosRouter = require('./routes/veiculos');
const folhasObraRouter = require('./routes/folhasObra');

// monta a aplicação Express. Está separado do server.js para os testes
// automáticos poderem criar a app sem ocupar a porta 3000
function criarApp({ limites } = {}) {
    const app = express();
    const limitadores = criarLimitadores(limites);

    if (config.trustProxy) app.set('trust proxy', config.trustProxy);

    // cabeçalhos de segurança. A Content-Security-Policy diz ao browser que
    // só pode carregar scripts, estilos, imagens e fontes do próprio site:
    // mesmo que alguém conseguisse injetar HTML, um <script> de fora não corria
    app.use(helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'"],
                imgSrc: ["'self'", 'data:'],
                fontSrc: ["'self'"],
                connectSrc: ["'self'"],
                manifestSrc: ["'self'"],
                workerSrc: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                ...(config.cookieSegura ? { upgradeInsecureRequests: [] } : {}),
            },
        },
    }));

    // comprime as respostas (JSON e ficheiros do frontend)
    app.use(compression());

    app.use('/api', limitadores.geral);
    app.use(express.json({ limit: '100kb' }));
    app.use(cookieParser());
    app.use('/api', verificarOrigem);

    // respostas da API têm dados pessoais: nunca ficam em cache
    app.use('/api', (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        next();
    });

    // GET /api/saude: a API está viva e consegue falar com a base de dados?
    app.get('/api/saude', async (req, res) => {
        try {
            const pool = await getPool();
            await pool.request().query('SELECT 1 AS ok');
            res.json({ estado: 'ok', baseDados: 'ok' });
        } catch (err) {
            console.error('Saúde: sem ligação à base de dados:', err.message);
            res.status(503).json({ estado: 'degradado', baseDados: 'sem ligação' });
        }
    });

    app.use('/api/auth', criarRouterAuth(limitadores));
    app.use('/api/oficinas', criarRouterOficinas(limitadores));
    app.use('/api/colaboradores', colaboradoresRouter);
    app.use('/api/clientes', clientesRouter);
    app.use('/api/veiculos', veiculosRouter);
    app.use('/api/folhas-obra', folhasObraRouter);
    app.use('/api', rotaInexistente);

    // em produção a API serve também o frontend compilado (npm run build)
    if (config.frontendDist && fs.existsSync(path.join(config.frontendDist, 'index.html'))) {
        servirFrontend(app, config.frontendDist);
    }

    app.use(tratarErros);
    return app;
}

function servirFrontend(app, pasta) {
    app.use(express.static(pasta, {
        index: false,
        setHeaders(res, ficheiro) {
            // os ficheiros em /assets têm um hash no nome (app-3f9a1c.js):
            // podem ficar em cache "para sempre". O resto (index.html, sw.js,
            // manifesto) tem de ser sempre revalidado
            if (ficheiro.includes(`${path.sep}assets${path.sep}`)) {
                res.set('Cache-Control', 'public, max-age=31536000, immutable');
            } else {
                res.set('Cache-Control', 'no-cache');
            }
        },
    }));

    // qualquer outro GET é uma rota do React (ex.: /folhas/12): devolve o index.html
    const indexHtml = path.join(pasta, 'index.html');
    app.get(/^(?!\/api\/).*/, (req, res) => {
        res.set('Cache-Control', 'no-cache');
        res.sendFile(indexHtml);
    });
}

module.exports = { criarApp };
