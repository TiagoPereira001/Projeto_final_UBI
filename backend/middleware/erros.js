const { ErroHttp } = require('../lib/erros');

// qualquer rota /api que não existe: responde em JSON (e não com a página
// HTML por omissão do Express)
function rotaInexistente(req, res) {
    res.status(404).json({ erro: 'Rota não encontrada.' });
}

// apanhador de erros global. Tudo o que é lançado nas rotas (incluindo
// promessas rejeitadas, que o Express 5 já encaminha sozinho) acaba aqui.
// O cliente recebe sempre uma mensagem curta em português; os detalhes
// técnicos (stack trace, mensagem do SQL Server) ficam só nos logs.
// eslint-disable-next-line no-unused-vars
function tratarErros(err, req, res, next) {
    if (err instanceof ErroHttp) {
        const corpo = { erro: err.message };
        if (err.campos) corpo.campos = err.campos;
        return res.status(err.status).json(corpo);
    }

    // JSON mal formado ou pedido demasiado grande (erros do express.json)
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ erro: 'O pedido não é JSON válido.' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ erro: 'O pedido é demasiado grande.' });
    }

    // erros do SQL Server que escaparam às validações das rotas
    if (err.number === 2627 || err.number === 2601) {
        return res.status(409).json({ erro: 'Já existe um registo com esses dados.' });
    }
    if (err.number === 547) {
        return res.status(409).json({ erro: 'Operação recusada: os dados não são coerentes.' });
    }

    console.error(err);
    res.status(500).json({ erro: 'Erro interno do servidor. Tenta outra vez daqui a pouco.' });
}

module.exports = { rotaInexistente, tratarErros };
