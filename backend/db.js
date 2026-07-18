const sql = require('mssql');

// Configuração da conexão ao SQL Server no Docker
const dbConfig = {
    user: 'SA',
    password: process.env.DB_PASSWORD || 'DuarteRaposo2026!',
    server: 'localhost',
    port: 1433,
    database: 'OficinaDR',
    options: {
        encrypt: false, // Necessário para desenvolvimento local
        trustServerCertificate: true
    }
};

// Pool único e partilhado por toda a aplicação.
// Em vez de sql.connect(dbConfig) em cada rota (que abre uma ligação nova
// de cada vez e pode esgotar as ligações disponíveis), criamos o pool
// uma única vez aqui e todas as rotas pedem-no através de getPool().
let poolPromise = null;

function getPool() {
    if (!poolPromise) {
        poolPromise = sql.connect(dbConfig)
            .then(pool => {
                console.log('Ligado ao SQL Server (OficinaDR).');
                return pool;
            })
            .catch(err => {
                poolPromise = null; // permite tentar de novo no próximo pedido
                throw err;
            });
    }
    return poolPromise;
}

module.exports = { sql, getPool };