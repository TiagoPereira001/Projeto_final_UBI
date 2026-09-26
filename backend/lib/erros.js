// um erro que já sabe que resposta HTTP deve dar. As rotas fazem
// `throw new ErroHttp(404, 'Cliente não encontrado.')` e o middleware de erros
// (middleware/erros.js) transforma isso na resposta JSON certa.
class ErroHttp extends Error {
    constructor(status, mensagem, campos) {
        super(mensagem);
        this.status = status;
        // erros por campo, para o frontend os mostrar ao lado de cada input
        this.campos = campos;
    }
}

function naoEncontrado(oQue) {
    return new ErroHttp(404, `${oQue} não encontrado.`);
}

// os ids chegam no URL como texto. Um id que não é um número inteiro positivo
// não pode existir, por isso responde-se 404 (e não 500 do SQL Server)
function idDoUrl(valor, oQue) {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
        throw naoEncontrado(oQue);
    }
    return id;
}

// o SQL Server identifica a restrição violada pelo nome na mensagem de erro
function violouRestricao(err, nome) {
    return (err.number === 2627 || err.number === 2601 || err.number === 547) &&
        String(err.message).includes(nome);
}

module.exports = { ErroHttp, naoEncontrado, idDoUrl, violouRestricao };
