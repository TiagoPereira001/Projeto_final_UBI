require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { getPool } = require('./db');

const colaboradoresRouter = require('./routes/colaboradores');
const autocaravanasRouter = require('./routes/autocaravanas');
const clientesRouter = require('./routes/clientes');
const folhasObraRouter = require('./routes/folhasObra');
const authRouter = require('./routes/auth');

const app = express();

// cabecalhos de seguranca basicos (protecao contra clickjacking,
// mime-sniffing, etc.) -- nao faz mal nenhum ter, mesmo num projeto pequeno
app.use(helmet());

// so aceita pedidos vindos do frontend (definido no .env). em dev, cai
// para o endereco do vite por omissao
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));

app.use(express.json());

// Rota de teste: Verifica se a API está online e ligada à base de dados
app.get('/api/test-db', async (req, res) => {
    try {
        await getPool();
        res.status(200).json({ message: "Sucesso! A API está ligada ao SQL Server do Docker." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Falha na conexão com a base de dados." });
    }
});

app.use('/api/colaboradores', colaboradoresRouter);
app.use('/api/autocaravanas', autocaravanasRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/folhas-obra', folhasObraRouter);
app.use('/api/auth', authRouter);

// apanhador de erros global: qualquer erro que escape das rotas acima
// (por exemplo, uma promessa rejeitada que ninguem apanhou) cai aqui,
// em vez de o Express devolver por omissao uma pagina com o stack trace
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`API a correr em http://localhost:${PORT}`);
});