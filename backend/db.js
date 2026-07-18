const sql = require('mssql');

// dados de ligação ao SQL Server que corre no docker
const dbConfig = {
    user: 'SA',
    password: process.env.DB_PASSWORD || 'DuarteRaposo2026!',
    server: 'localhost',
    port: 1433,
    database: 'OficinaDR',
    options: {
        encrypt: false, // não precisamos disto em dev local
        trustServerCertificate: true
    }
};

// antes tínhamos um sql.connect() dentro de cada rota, o que abre uma
// ligação nova sempre que alguém faz um pedido. isto aqui guarda a
// ligação já feita (pool) e reutiliza-a em todo o lado
let poolPromise = null;

function getPool() {
    if (!poolPromise) {
        poolPromise = sql.connect(dbConfig)
            .then(pool => {
                console.log('Ligado ao SQL Server (OficinaDR).');
                return pool;
            })
            .catch(err => {
                poolPromise = null; // se falhar, deixa tentar outra vez no próximo pedido
                throw err;
            });
    }
    return poolPromise;
}

module.exports = { sql, getPool };