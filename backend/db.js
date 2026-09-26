const sql = require('mssql');
const config = require('./config');

// a password nunca fica escrita no código: vem sempre do .env (ver config.js).
// a password antiga esteve exposta no docker-compose.yml e aqui, num
// repositório público, e a API ligava-se como 'sa' (administrador de todo o
// servidor). Agora usa o login 'bancada_app', que só lê e escreve dados.
const dbConfig = {
    user: config.db.utilizador,
    password: config.db.password,
    server: config.db.servidor,
    port: config.db.porta,
    database: config.db.nome,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    options: {
        encrypt: config.db.encriptar,
        trustServerCertificate: config.db.confiarCertificado,
    },
};

// um único pool de ligações partilhado por toda a API. Antes havia um
// sql.connect() dentro de cada rota, o que abria uma ligação nova a cada pedido
let poolPromise = null;

function getPool() {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(dbConfig)
            .connect()
            .then((pool) => {
                pool.on('error', (err) => console.error('Erro no pool do SQL Server:', err.message));
                return pool;
            })
            .catch((err) => {
                poolPromise = null; // se falhar, deixa tentar outra vez no próximo pedido
                throw err;
            });
    }
    return poolPromise;
}

// corre `trabalho` dentro de uma transação: ou fica tudo gravado, ou nada.
// o commit/rollback fica aqui num sítio só, em vez de repetido em cada rota
async function emTransacao(trabalho) {
    const pool = await getPool();
    const transacao = new sql.Transaction(pool);
    await transacao.begin();
    try {
        const resultado = await trabalho(transacao);
        await transacao.commit();
        return resultado;
    } catch (err) {
        try {
            await transacao.rollback();
        } catch {
            // o SQL Server já pode ter desfeito a transação sozinho
        }
        throw err;
    }
}

async function fecharPool() {
    if (poolPromise) {
        const pool = await poolPromise.catch(() => null);
        poolPromise = null;
        if (pool) await pool.close();
    }
}

module.exports = { sql, getPool, emTransacao, fecharPool };
