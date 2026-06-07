require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configuração da conexão ao SQL Server no Docker
const dbConfig = {
    user: 'SA',
    password: 'DuarteRaposo2026!', // Password que definimos no docker-compose
    server: 'localhost',
    port: 1433,
    database: 'OficinaDR',
    options: {
        encrypt: false, // Necessário para desenvolvimento local
        trustServerCertificate: true
    }
};

// Rota de teste: Verifica se a API está online e ligada à base de dados
app.get('/api/test-db', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        res.status(200).json({ message: "Sucesso! A API está ligada ao SQL Server do Docker." });
    } catch (err) {
        res.status(500).json({ error: "Falha na conexão: " + err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`API a correr em http://localhost:${PORT}`);
});