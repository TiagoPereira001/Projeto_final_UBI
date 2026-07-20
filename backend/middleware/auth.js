const jwt = require('jsonwebtoken');

// mesma lógica do db.js: sem segredo escondido no código.
// o JWT_SECRET antigo esteve exposto num repositório público, por isso
// tem de ser um valor novo, só guardado no .env
if (!process.env.JWT_SECRET) {
    throw new Error(
        'Falta a variável JWT_SECRET no .env. Ve o .env.example para saberes o que definir.'
    );
}

const JWT_SECRET = process.env.JWT_SECRET;

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

// diferente do verificarToken (que só confirma QUEM está logado), este
// middleware confirma que o colaborador logado tem um dos Cargos
// permitidos para aquela ação. usa-se depois do verificarToken:
// router.post('/', verificarToken, autorizar('Gestor'), ...)
function autorizar(...cargosPermitidos) {
    return (req, res, next) => {
        if (!req.colaborador || !cargosPermitidos.includes(req.colaborador.cargo)) {
            return res.status(403).json({ error: 'Não tens permissão para esta ação.' });
        }
        next();
    };
}

module.exports = { verificarToken, autorizar, JWT_SECRET };