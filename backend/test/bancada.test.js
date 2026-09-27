// modo bancada: o tablet partilhado da oficina, onde cada mecânico entra
// com o seu nome e PIN, e o trabalho fica registado em nome de quem o fez
const test = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, fecharBaseDados, novaOficina, novaFolha } = require('./ajuda');

let servidor;
let oficina;
let paulo; // mecânico só com PIN (sem email)

test.before(async () => {
    servidor = await arrancar();
    oficina = await novaOficina(servidor, 'Bancada');
    const res = await oficina.gestor.post('/colaboradores', { nome: 'Paulo Serra', cargo: 'mecanico', pin: '2580' });
    assert.equal(res.status, 201);
    paulo = res.dados;
});
test.after(async () => { await servidor.parar(); await fecharBaseDados(); });

// liga um "tablet" novo: o gestor entra nele com password e ativa a bancada
async function novoTablet() {
    const tablet = servidor.cliente();
    await tablet.post('/auth/entrar', { email: oficina.email, password: oficina.password });
    const res = await tablet.post('/auth/bancada');
    assert.equal(res.status, 204);
    return tablet;
}

test('um mecânico pode existir só com PIN, sem email', () => {
    assert.equal(paulo.email, null);
    assert.equal(paulo.temPin, true);
});

test('ativar a bancada termina a sessão do gestor e mostra só nomes', async () => {
    const tablet = await novoTablet();
    assert.equal((await tablet.get('/clientes')).status, 401);

    const sessao = await tablet.get('/auth/sessao');
    assert.equal(sessao.dados.colaborador, null);
    assert.equal(sessao.dados.bancada.oficina.id, oficina.oficina.id);

    const quem = await tablet.get('/auth/bancada');
    assert.equal(quem.status, 200);
    assert.deepEqual(Object.keys(quem.dados.colaboradores[0]).sort(), ['cargo', 'id', 'nome']);
    assert.ok(quem.dados.colaboradores.some((c) => c.id === paulo.id));
});

test('entrar com PIN: o trabalho fica em nome de quem entrou', async () => {
    const tablet = await novoTablet();
    const entrar = await tablet.post('/auth/bancada/entrar', { colaboradorId: paulo.id, pin: '2580' });
    assert.equal(entrar.status, 200);
    assert.equal(entrar.dados.colaborador.via, 'pin');

    const { folha } = await novaFolha(tablet);
    assert.equal(folha.colaborador.id, paulo.id);

    // terminar volta ao ecrã "quem está a trabalhar?" (a bancada continua ligada)
    await tablet.post('/auth/sair');
    assert.equal((await tablet.get('/clientes')).status, 401);
    assert.equal((await tablet.get('/auth/bancada')).status, 200);
});

test('PIN errado 5 vezes bloqueia o PIN durante uns minutos', async () => {
    const criado = await oficina.gestor.post('/colaboradores', { nome: 'Bruno Alves', cargo: 'mecanico', pin: '7391' });
    const tablet = await novoTablet();

    for (let i = 1; i <= 4; i++) {
        const res = await tablet.post('/auth/bancada/entrar', { colaboradorId: criado.dados.id, pin: '0101' });
        assert.equal(res.status, 401);
        assert.match(res.dados.erro, new RegExp(`${5 - i}`));
    }
    const quinta = await tablet.post('/auth/bancada/entrar', { colaboradorId: criado.dados.id, pin: '0101' });
    assert.equal(quinta.status, 429);

    // bloqueado: nem o PIN certo entra
    const certo = await tablet.post('/auth/bancada/entrar', { colaboradorId: criado.dados.id, pin: '7391' });
    assert.equal(certo.status, 429);
});

test('sem o tablet ligado como bancada, o PIN não serve para nada', async () => {
    const qualquer = servidor.cliente();
    assert.equal((await qualquer.get('/auth/bancada')).status, 401);
    assert.equal((await qualquer.post('/auth/bancada/entrar', { colaboradorId: paulo.id, pin: '2580' })).status, 401);
});

test('o tablet de uma oficina não deixa entrar colaboradores de outra', async () => {
    const outra = await novaOficina(servidor, 'Outra');
    const intruso = await outra.gestor.post('/colaboradores', { nome: 'Intruso', cargo: 'mecanico', pin: '8642' });
    const tablet = await novoTablet();
    const res = await tablet.post('/auth/bancada/entrar', { colaboradorId: intruso.dados.id, pin: '8642' });
    assert.equal(res.status, 401);
});

test('com PIN, nem um gestor mexe em contas ou definições', async () => {
    const dados = (await oficina.gestor.get('/colaboradores')).dados.itens.find((c) => c.cargo === 'gestor');
    await oficina.gestor.put(`/colaboradores/${dados.id}`, { nome: dados.nome, cargo: 'gestor', email: oficina.email, pin: '9173' });
    oficina.gestor.cookies.clear();
    await oficina.gestor.post('/auth/entrar', { email: oficina.email, password: oficina.password });

    const tablet = await novoTablet();
    const entrar = await tablet.post('/auth/bancada/entrar', { colaboradorId: dados.id, pin: '9173' });
    assert.equal(entrar.status, 200);

    assert.equal((await tablet.get('/colaboradores')).status, 403);
    assert.equal((await tablet.post('/oficinas/atual/desligar-tablets')).status, 403);
    // mas o trabalho normal e o resumo continuam disponíveis
    assert.equal((await tablet.get('/folhas-obra/resumo')).status, 200);
});

test('desligar os tablets invalida todas as bancadas de uma vez', async () => {
    const tablet = await novoTablet();
    assert.equal((await tablet.get('/auth/bancada')).status, 200);

    const res = await oficina.gestor.post('/oficinas/atual/desligar-tablets');
    assert.equal(res.status, 204);

    assert.equal((await tablet.get('/auth/bancada')).status, 401);
    assert.equal((await tablet.post('/auth/bancada/entrar', { colaboradorId: paulo.id, pin: '2580' })).status, 401);
});

test('a API da base de dados não tem permissão para apagar registos protegidos', async () => {
    // mesmo que houvesse um erro no código, o login da API (bancada_app)
    // não consegue fazer DELETE nas tabelas com soft delete
    const { getPool } = require('../db');
    const pool = await getPool();
    for (const tabela of ['Oficina', 'Colaborador', 'Cliente', 'Veiculo', 'Folha_Obra']) {
        await assert.rejects(
            pool.request().query(`DELETE FROM ${tabela} WHERE 1 = 0`),
            (err) => err.number === 229,
            `DELETE em ${tabela} devia ser recusado`
        );
    }
});
