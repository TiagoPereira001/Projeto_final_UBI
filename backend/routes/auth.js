const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { sql, getPool } = require('../db');
const { JWT_SECRET, verificarToken } = require('../middleware/auth');

const router = express.Router();

// no máximo 8 tentativas de login por IP a cada 15 minutos -- sem isto,
// alguém podia tentar milhares de passwords por segundo (força bruta)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: { error: 'Demasiadas tentativas de login. Tenta novamente dentro de 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// POST /api/auth/login
// recebe { email, password }, confirma a password contra o hash guardado,
// e devolve um token que o frontend vai enviar nos pedidos seguintes
router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e password são obrigatórios.' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('email', sql.VarChar(100), email)
            .query(`
                SELECT ID_Colaborador, Nome, Cargo, Email, Password_Hash
                FROM Colaboradores
                WHERE Email = @email AND Ativo = 1
            `);

        if (result.recordset.length === 0) {
            // mensagem genérica de propósito, não dizemos se foi o email ou a
            // password que falhou, para não facilitar a vida a quem tenta adivinhar
            return res.status(401).json({ error: 'Email ou password incorretos.' });
        }

        const colaborador = result.recordset[0];
        const passwordCorreta = await bcrypt.compare(password, colaborador.Password_Hash);

        if (!passwordCorreta) {
            return res.status(401).json({ error: 'Email ou password incorretos.' });
        }

        const token = jwt.sign(
            {
                id: colaborador.ID_Colaborador,
                nome: colaborador.Nome,
                cargo: colaborador.Cargo,
                email: colaborador.Email
            },
            JWT_SECRET,
            { expiresIn: '8h' } // um turno de trabalho, mais ou menos
        );

        res.status(200).json({
            token,
            colaborador: {
                id: colaborador.ID_Colaborador,
                nome: colaborador.Nome,
                cargo: colaborador.Cargo,
                email: colaborador.Email
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao fazer login. Tenta novamente mais tarde.' });
    }
});

// GET /api/auth/me
// rota protegida de exemplo: só responde se vier um token válido.
// o frontend pode usar isto para confirmar quem está logado ao abrir a app
router.get('/me', verificarToken, (req, res) => {
    res.status(200).json({ colaborador: req.colaborador });
});

module.exports = router;