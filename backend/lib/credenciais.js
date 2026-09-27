const bcrypt = require('bcrypt');

// custo do bcrypt: cada +1 duplica o tempo de cálculo. 12 dá ~250 ms por
// hash, o suficiente para tornar ataques de força bruta muito lentos sem
// se notar num login. As passwords antigas (custo 10) continuam a funcionar,
// porque o custo fica guardado dentro do próprio hash.
const CUSTO_BCRYPT = 12;

// hash de uma password que não existe. Quando alguém tenta entrar com um email
// que não está registado, compara-se na mesma contra este hash: assim a
// resposta demora o mesmo tempo com ou sem conta, e não dá para descobrir que
// emails existem pelo tempo que o servidor demora a responder
const HASH_FICTICIO = bcrypt.hashSync('esta-password-nao-pertence-a-ninguem', CUSTO_BCRYPT);

function gerarHash(segredo) {
    return bcrypt.hash(segredo, CUSTO_BCRYPT);
}

async function confere(segredo, hash) {
    if (typeof segredo !== 'string' || segredo.length === 0) {
        await bcrypt.compare('x', HASH_FICTICIO);
        return false;
    }
    return bcrypt.compare(segredo, hash || HASH_FICTICIO).then((certo) => certo && Boolean(hash));
}

module.exports = { gerarHash, confere };
