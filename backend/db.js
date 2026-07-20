const sql = require('mssql');

// a password nunca fica escrita aqui -- tem de vir sempre do .env.
// se faltar, a app para logo no arranque com um erro claro, em vez de
// usar uma password escondida no código (foi essa a falha de segurança
// corrigida: a password antiga esteve exposta no docker-compose.yml
// e aqui, num repositório público)
if (!process.env.DB_PASSWORD) {
    throw new Error(
        'Falta a variável DB_PASSWORD no .env. Ve o .env.example para saberes o que definir.'
    );
}

const dbConfig = {
    user: 'SA',
    password: process.env.DB_PASSWORD,
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