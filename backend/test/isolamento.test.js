// multi-oficina: uma oficina nunca vê nem altera os dados de outra.
// é a propriedade de segurança mais importante de todo o sistema
const test = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, fecharBaseDados, novaOficina, novaFolha, gerarNif } = require('./ajuda');

let servidor;
let a; // oficina A (dona dos dados)
let b; // oficina B (a tentar espreitar)
let dadosA;

test.before(async () => {
    servidor = await arrancar();
    a = await novaOficina(servidor, 'A');
    b = await novaOficina(servidor, 'B');
    dadosA = await novaFolha(a.gestor, {
        linhas: [{ designacao: 'Filtro de óleo', categoria: 'peca', quantidade: 1, valorUnitario: 12 }],
    });
});
test.after(async () => { await servidor.parar(); await fecharBaseDados(); });

test('B não lê os clientes, veículos e folhas de A', async () => {
    const { cliente, veiculo, folha } = dadosA;
    assert.equal((await b.gestor.get(`/clientes/${cliente.id}`)).status, 404);
    assert.equal((await b.gestor.get(`/veiculos/${veiculo.id}`)).status, 404);
    assert.equal((await b.gestor.get(`/folhas-obra/${folha.id}`)).status, 404);

    const listas = await Promise.all([
        b.gestor.get('/clientes'), b.gestor.get('/veiculos'), b.gestor.get('/folhas-obra'),
    ]);
    for (const lista of listas) {
        assert.equal(lista.status, 200);
        assert.equal(lista.dados.total, 0);
    }
});

test('B não altera nem arquiva os dados de A', async () => {
    const { cliente, veiculo, folha } = dadosA;
    const alterarCliente = await b.gestor.put(`/clientes/${cliente.id}`, { nome: 'Roubado', telefone: '912000000' });
    assert.equal(alterarCliente.status, 404);
    assert.equal((await b.gestor.delete(`/clientes/${cliente.id}`)).status, 404);

    const alterarVeiculo = await b.gestor.put(`/veiculos/${veiculo.id}`, {
        matricula: 'XX00XX', tipo: 'ligeiro', marca: 'X', clienteId: cliente.id,
    });
    assert.ok([400, 404].includes(alterarVeiculo.status));
    assert.equal((await b.gestor.delete(`/veiculos/${veiculo.id}`)).status, 404);

    assert.equal((await b.gestor.patch(`/folhas-obra/${folha.id}`, { estado: 'entregue' })).status, 404);
    const linha = await b.gestor.post(`/folhas-obra/${folha.id}/linhas`, {
        designacao: 'Intrusa', categoria: 'outro', quantidade: 1, valorUnitario: 1,
    });
    assert.equal(linha.status, 404);
    const idLinha = folha.linhas[0].id;
    assert.equal((await b.gestor.delete(`/folhas-obra/${folha.id}/linhas/${idLinha}`)).status, 404);

    // e os dados de A ficaram exatamente como estavam
    const aindaLa = await a.gestor.get(`/folhas-obra/${folha.id}`);
    assert.equal(aindaLa.dados.estado, 'aberta');
    assert.equal(aindaLa.dados.linhas.length, 1);
    assert.equal((await a.gestor.get(`/clientes/${cliente.id}`)).dados.nome, cliente.nome);
});

test('B não usa um cliente ou veículo de A nos seus próprios registos', async () => {
    const veiculo = await b.gestor.post('/veiculos', {
        matricula: 'BB11BB', tipo: 'ligeiro', marca: 'Opel', clienteId: dadosA.cliente.id,
    });
    assert.equal(veiculo.status, 400);

    const folha = await b.gestor.post('/folhas-obra', { veiculoId: dadosA.veiculo.id });
    assert.equal(folha.status, 400);
});

test('B não vê os colaboradores de A nem os altera', async () => {
    assert.equal((await b.gestor.put(`/colaboradores/${a.colaborador.id}`, { nome: 'X', cargo: 'gestor', email: a.email })).status, 404);
    assert.equal((await b.gestor.delete(`/colaboradores/${a.colaborador.id}`)).status, 404);
    const lista = await b.gestor.get('/colaboradores');
    assert.ok(lista.dados.itens.every((c) => c.id !== a.colaborador.id));
});

test('a mesma matrícula e o mesmo NIF podem existir em oficinas diferentes', async () => {
    const nif = gerarNif(2);
    const clienteA = await a.gestor.post('/clientes', { nome: 'Maria Lopes', telefone: '961234567', nif });
    const clienteB = await b.gestor.post('/clientes', { nome: 'Maria Lopes', telefone: '961234567', nif });
    assert.equal(clienteA.status, 201);
    assert.equal(clienteB.status, 201);

    // dentro da mesma oficina, o NIF repetido é recusado
    assert.equal((await a.gestor.post('/clientes', { nome: 'Outra', telefone: '961234567', nif })).status, 409);

    const vA = await a.gestor.post('/veiculos', { matricula: 'AA-12-BC', tipo: 'ligeiro', marca: 'Seat', clienteId: clienteA.dados.id });
    const vB = await b.gestor.post('/veiculos', { matricula: 'aa 12 bc', tipo: 'ligeiro', marca: 'Seat', clienteId: clienteB.dados.id });
    assert.equal(vA.status, 201);
    assert.equal(vB.status, 201);
    assert.equal((await a.gestor.post('/veiculos', {
        matricula: 'AA12BC', tipo: 'ligeiro', marca: 'Seat', clienteId: clienteA.dados.id,
    })).status, 409);
});

test('as folhas são numeradas por oficina', async () => {
    const segundaA = await novaFolha(a.gestor);
    const primeiraB = await novaFolha(b.gestor);
    assert.equal(segundaA.folha.numero, dadosA.folha.numero + 1);
    assert.equal(primeiraB.folha.numero, 1);
});

test('ids mal formados dão 404 (e não erro 500)', async () => {
    assert.equal((await a.gestor.get('/clientes/abc')).status, 404);
    assert.equal((await a.gestor.get('/folhas-obra/-1')).status, 404);
    assert.equal((await a.gestor.get('/veiculos/99999999999')).status, 404);
});
