require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getPool } = require('./db');

const colaboradoresRouter = require('./routes/colaboradores');
const autocaravanasRouter = require('./routes/autocaravanas');

const app = express();
app.use(cors());
app.use(express.json());

// Rota de teste: Verifica se a API está online e ligada à base de dados
app.get('/api/test-db', async (req, res) => {
    try {
        await getPool();
        res.status(200).json({ message: "Sucesso! A API está ligada ao SQL Server do Docker." });
    } catch (err) {
        res.status(500).json({ error: "Falha na conexão: " + err.message });
    }
});

app.use('/api/colaboradores', colaboradoresRouter);
app.use('/api/autocaravanas', autocaravanasRouter);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`API a correr em http://localhost:${PORT}`);
});