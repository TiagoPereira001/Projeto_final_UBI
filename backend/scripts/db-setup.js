// prepara a base de dados da Bancada:
//  1. cria a base de dados e as tabelas (database/schema.sql), se ainda não existirem
//  2. cria o login que a API usa (DB_USER), só com permissão para ler e escrever
//     dados, e sem permissão para apagar clientes, veículos, colaboradores,
//     oficinas ou folhas (o soft delete fica garantido pela própria BD)
//
// uso:
//   npm run db:setup   não mexe em nada que já exista
//   npm run db:reset   APAGA a base de dados e cria tudo de novo (só em desenvolvimento!)
//
// liga-se como administrador (DB_ADMIN_USER / DB_ADMIN_PASSWORD). A API nunca
// usa estas credenciais: só este script, uma vez.

require('../lib/ambiente');
const fs = require('node:fs');
const path = require('node:path');
const sql = require('mssql');

function obrigatoria(nome) {
    if (!process.env[nome]) {
        console.error(`Falta a variável ${nome}. Copia o .env.example para .env e preenche-a.`);
        process.exit(1);
    }
    return process.env[nome];
}

// estes nomes entram em comandos SQL de administração (CREATE DATABASE,
// CREATE LOGIN), que não aceitam parâmetros: por isso só letras, números e _
function identificador(nome, valor) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(valor)) {
        console.error(`${nome} só pode ter letras, números e _ (recebido: "${valor}").`);
        process.exit(1);
    }
    return valor;
}

const nomeBd = identificador('DB_NAME', process.env.DB_NAME || 'Bancada');
const utilizadorApp = identificador('DB_USER', process.env.DB_USER || 'bancada_app');
const passwordApp = obrigatoria('DB_PASSWORD');
const reset = process.argv.includes('--reset');

const ligacao = {
    server: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 1433,
    user: process.env.DB_ADMIN_USER || 'sa',
    password: obrigatoria('DB_ADMIN_PASSWORD'),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    },
    pool: { max: 1 },
};

// o schema.sql está dividido em lotes com GO (como no SSMS / sqlcmd)
function lotes(texto) {
    return texto.split(/^\s*GO\s*$/gim).map((l) => l.trim()).filter(Boolean);
}

// o SQL Server demora uns segundos a arrancar no Docker: tenta algumas vezes
async function ligar(config, tentativas = 20) {
    for (let i = 1; ; i++) {
        try {
            return await new sql.ConnectionPool(config).connect();
        } catch (err) {
            if (i >= tentativas) throw err;
            console.log(`À espera do SQL Server (${i}/${tentativas})...`);
            await new Promise((r) => setTimeout(r, 3000));
        }
    }
}

async function main() {
    const master = await ligar({ ...ligacao, database: 'master' });

    if (reset) {
        console.log(`A apagar a base de dados ${nomeBd}...`);
        await master.request().batch(`
            IF DB_ID(N'${nomeBd}') IS NOT NULL
            BEGIN
                ALTER DATABASE [${nomeBd}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                DROP DATABASE [${nomeBd}];
            END
        `);
    }

    const existe = (await master.request()
        .input('nome', sql.NVarChar(128), nomeBd)
        .query('SELECT DB_ID(@nome) AS id')).recordset[0].id !== null;

    if (!existe) {
        console.log(`A criar a base de dados ${nomeBd}...`);
        await master.request().batch(`CREATE DATABASE [${nomeBd}]`);
        // uma base nova sai em FULL (herda da "model"). Em FULL, depois da
        // primeira cópia completa, o registo de transações só se liberta com
        // cópias do registo: sem elas o ficheiro cresce sem parar. Com cópias
        // completas frequentes (docs/infraestrutura.md) o certo é SIMPLE. Só
        // se aplica a uma base nova: quem já escolheu FULL não é desfeito
        await master.request().batch(`ALTER DATABASE [${nomeBd}] SET RECOVERY SIMPLE`);
    }

    // login da API. A password não pode ir como parâmetro num CREATE LOGIN,
    // por isso as plicas são escapadas (' passa a '')
    const passwordSql = passwordApp.replace(/'/g, "''");
    await master.request().batch(`
        IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'${utilizadorApp}')
            CREATE LOGIN [${utilizadorApp}] WITH PASSWORD = N'${passwordSql}', CHECK_POLICY = ON;
        ELSE
            ALTER LOGIN [${utilizadorApp}] WITH PASSWORD = N'${passwordSql}';
    `);
    await master.close();

    const bd = await ligar({ ...ligacao, database: nomeBd });

    if (!existe) {
        console.log('A criar as tabelas (database/schema.sql)...');
        const schema = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
        for (const lote of lotes(schema)) {
            await bd.request().batch(lote);
        }
    }

    await bd.request().batch(`
        IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'${utilizadorApp}')
            CREATE USER [${utilizadorApp}] FOR LOGIN [${utilizadorApp}];
        ELSE
            -- uma cópia de segurança restaurada noutro servidor traz o utilizador
            -- ligado ao login do servidor antigo ("órfão"), e a API deixava de
            -- conseguir entrar. Isto volta a ligá-lo ao login deste servidor
            ALTER USER [${utilizadorApp}] WITH LOGIN = [${utilizadorApp}];

        ALTER ROLE db_datareader ADD MEMBER [${utilizadorApp}];
        ALTER ROLE db_datawriter ADD MEMBER [${utilizadorApp}];

        -- a API nunca apaga estes registos (soft delete); assim nem que queira
        DENY DELETE ON dbo.Oficina TO [${utilizadorApp}];
        DENY DELETE ON dbo.Colaborador TO [${utilizadorApp}];
        DENY DELETE ON dbo.Cliente TO [${utilizadorApp}];
        DENY DELETE ON dbo.Veiculo TO [${utilizadorApp}];
        DENY DELETE ON dbo.Folha_Obra TO [${utilizadorApp}];
    `);
    await bd.close();

    console.log(existe
        ? `A base de dados ${nomeBd} já existia: só atualizei o login ${utilizadorApp}.`
        : `Base de dados ${nomeBd} pronta. A API entra como ${utilizadorApp}.`);
}

main().catch((err) => {
    console.error('Não foi possível preparar a base de dados:', err.message);
    process.exit(1);
});
