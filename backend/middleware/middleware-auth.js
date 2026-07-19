const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_temporario_trocar_em_producao';

// vai no cabeçalho: Authorization: Bearer <token>
// se o token for válido, mete os dados do colaborador em req.colaborador
// e deixa o pedido seguir. senão, corta logo aqui com 401/403
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token em falta. Faz login primeiro.' });
    }

    jwt.verify(token, JWT_SECRET, (err, colaborador) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido ou expirado.' });
        }
        req.colaborador = colaborador;
        next();
    });
}

module.exports = { verificarToken, JWT_SECRET };