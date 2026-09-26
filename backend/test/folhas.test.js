// folhas de obra: contas, estados, auditoria e regras de negócio
const test = require('node:test');
const assert = require('node:assert/strict');
const { arrancar, fecharBaseDados, novaOficina, novaFolha, unico } = require('./ajuda');

let servidor;
let oficina;
test.before(async () => {
    servidor = await arrancar();
    oficina = await novaOficina(servidor, 'Folhas');
});
test.after(async () => { await servidor.parar(); await fecharBaseDados(); });

test('totais e IVA ao cêntimo (sem erros de vírgula flutuante)', async () => {
    const { folha } = await novaFolha(oficina.gestor, {
        linhas: [
            { designacao: 'Lâmpada H7', categoria: 'peca', quantidade: 3, valorUnitario: 19.99 },
            { designacao: 'Mão de obra', categoria: 'mao_de_obra', quantidade: '0,5', valorUnitario: '38,50' },
        ],
    });
    // 3 x 19.99 = 59.97 (em JavaScript daria 59.970000000000006)
    assert.equal(folha.linhas[0].total, 59.97);
    assert.equal(folha.totais.pecas, 59.97);
    assert.equal(folha.totais.maoDeObra, 19.25);
    assert.equal(folha.totais.subtotal, 79.22);
    assert.equal(folha.totais.taxaIva, 23);
    assert.equal(folha.totais.iva, 18.22); // 79.22 x 0.23 = 18.2206
    assert.equal(folha.totais.total, 97.44);
});

test('quem abre a folha e regista linhas é sempre quem tem a sessão', async () => {
    const cliente = await oficina.gestor.post('/clientes', { nome: 'Rui Pinto', telefone: '934000111' });
    const veiculo = await oficina.gestor.post('/veiculos', {
        matricula: `AU${unico()}`.slice(0, 8), tipo: 'comercial', marca: 'Ford', clienteId: cliente.dados.id,
    });
    const folha = await oficina.gestor.post('/folhas-obra', {
        veiculoId: veiculo.dados.id,
        colaboradorId: 999999, // tentativa de registar em nome de outro: é ignorada
        id_colaborador: 999999,
    });
    assert.equal(folha.status, 201);
    assert.equal(folha.dados.colaborador.id, oficina.colaborador.id);

    const linha = await oficina.gestor.post(`/folhas-obra/${folha.dados.id}/linhas`, {
        designacao: 'Diagnóstico', categoria: 'mao_de_obra', quantidade: 1, valorUnitario: 25, colaboradorId: 999999,
    });
    assert.equal(linha.status, 201);
    assert.equal(linha.dados.linha.colaborador.id, oficina.colaborador.id);
    assert.equal(linha.dados.totais.subtotal, 25);
});

test('um veículo não pode ter duas folhas abertas ao mesmo tempo', async () => {
    const { veiculo, folha } = await novaFolha(oficina.gestor);
    const outra = await oficina.gestor.post('/folhas-obra', { veiculoId: veiculo.id });
    assert.equal(outra.status, 409);
    assert.match(outra.dados.erro, new RegExp(`nº ${folha.numero}`));
});

test('estados: datas de conclusão e entrega, e folha entregue fica fechada', async () => {
    const { folha } = await novaFolha(oficina.gestor, {
        linhas: [{ designacao: 'Óleo 5W30', categoria: 'peca', quantidade: 5, valorUnitario: 9.5 }],
    });

    const concluida = await oficina.gestor.patch(`/folhas-obra/${folha.id}`, {
        estado: 'concluida', conselhos: 'Trocar pastilhas de travão na próxima revisão.',
    });
    assert.equal(concluida.status, 200);
    assert.ok(concluida.dados.dataConclusao);
    assert.equal(concluida.dados.conselhos, 'Trocar pastilhas de travão na próxima revisão.');

    const entregue = await oficina.gestor.patch(`/folhas-obra/${folha.id}`, { estado: 'entregue' });
    assert.ok(entregue.dados.dataEntrega);

    // entregue: não se mexe nas linhas nem nos dados
    const novaLinha = await oficina.gestor.post(`/folhas-obra/${folha.id}/linhas`, {
        designacao: 'Esquecida', categoria: 'peca', quantidade: 1, valorUnitario: 1,
    });
    assert.equal(novaLinha.status, 409);
    assert.equal((await oficina.gestor.delete(`/folhas-obra/${folha.id}/linhas/${folha.linhas[0].id}`)).status, 409);
    assert.equal((await oficina.gestor.patch(`/folhas-obra/${folha.id}`, { observacoes: 'x' })).status, 409);

    // um gestor pode reabrir
    const reaberta = await oficina.gestor.patch(`/folhas-obra/${folha.id}`, { estado: 'em_curso' });
    assert.equal(reaberta.status, 200);
    assert.equal(reaberta.dados.dataEntrega, null);
    assert.equal(reaberta.dados.dataConclusao, null);
});

test('um mecânico não reabre uma folha entregue', async () => {
    const email = `mec-${unico()}@teste.test`;
    await oficina.gestor.post('/colaboradores', { nome: 'Mec', cargo: 'mecanico', email, password: 'Password-Do-Mecanico' });
    const mecanico = servidor.cliente();
    await mecanico.post('/auth/entrar', { email, password: 'Password-Do-Mecanico' });

    const { folha } = await novaFolha(oficina.gestor);
    await oficina.gestor.patch(`/folhas-obra/${folha.id}`, { estado: 'entregue' });
    assert.equal((await mecanico.patch(`/folhas-obra/${folha.id}`, { estado: 'em_curso' })).status, 409);
});

test('mudar a taxa de IVA da oficina não altera folhas já abertas', async () => {
    const { folha } = await novaFolha(oficina.gestor, {
        linhas: [{ designacao: 'Peça', categoria: 'peca', quantidade: 1, valorUnitario: 100 }],
    });
    const dados = (await oficina.gestor.get('/oficinas/atual')).dados;
    const mudou = await oficina.gestor.put('/oficinas/atual', { ...dados, taxaIva: 22 });
    assert.equal(mudou.status, 200);

    assert.equal((await oficina.gestor.get(`/folhas-obra/${folha.id}`)).dados.totais.taxaIva, 23);
    const nova = await novaFolha(oficina.gestor, {
        linhas: [{ designacao: 'Peça', categoria: 'peca', quantidade: 1, valorUnitario: 100 }],
    });
    assert.equal(nova.folha.totais.taxaIva, 22);
    assert.equal(nova.folha.totais.total, 122);
    await oficina.gestor.put('/oficinas/atual', { ...dados, taxaIva: 23 });
});

test('validação das linhas', async () => {
    const { folha } = await novaFolha(oficina.gestor);
    const casos = [
        { designacao: '', categoria: 'peca', quantidade: 1, valorUnitario: 1 },
        { designacao: 'X', categoria: 'bebidas', quantidade: 1, valorUnitario: 1 },
        { designacao: 'X', categoria: 'peca', quantidade: 0, valorUnitario: 1 },
        { designacao: 'X', categoria: 'peca', quantidade: 1, valorUnitario: -5 },
        { designacao: 'X', categoria: 'peca', quantidade: 1, valorUnitario: '12,345' },
    ];
    for (const caso of casos) {
        const res = await oficina.gestor.post(`/folhas-obra/${folha.id}/linhas`, caso);
        assert.equal(res.status, 400, JSON.stringify(caso));
        assert.ok(res.dados.campos);
    }
});

test('criar a folha com linhas é tudo ou nada', async () => {
    const cliente = await oficina.gestor.post('/clientes', { nome: 'Teste Transação', telefone: '912345000' });
    const veiculo = await oficina.gestor.post('/veiculos', {
        matricula: `TR${unico()}`.slice(0, 8), tipo: 'ligeiro', marca: 'Kia', clienteId: cliente.dados.id,
    });
    // a segunda linha é inválida: nada pode ficar gravado
    const res = await oficina.gestor.post('/folhas-obra', {
        veiculoId: veiculo.dados.id,
        linhas: [
            { designacao: 'Boa', categoria: 'peca', quantidade: 1, valorUnitario: 1 },
            { designacao: 'Má', categoria: 'peca', quantidade: -1, valorUnitario: 1 },
        ],
    });
    assert.equal(res.status, 400);
    assert.ok(res.dados.campos['linhas.1.quantidade']);
    const folhas = await oficina.gestor.get(`/folhas-obra?veiculo=${veiculo.dados.id}`);
    assert.equal(folhas.dados.total, 0);
});

test('uma entrada recusada dentro da transação não gasta número de folha (rollback)', async () => {
    const primeira = await novaFolha(oficina.gestor);
    // recusada a meio da transação, depois de o contador ter avançado
    const repetida = await oficina.gestor.post('/folhas-obra', { veiculoId: primeira.veiculo.id });
    assert.equal(repetida.status, 409);

    const seguinte = await novaFolha(oficina.gestor);
    assert.equal(seguinte.folha.numero, primeira.folha.numero + 1);
});

test('quadro: filtro por estado ativo, pesquisa por matrícula e resumo', async () => {
    const { veiculo, folha } = await novaFolha(oficina.gestor);
    await oficina.gestor.patch(`/folhas-obra/${folha.id}`, { estado: 'aguarda_pecas' });

    const ativas = await oficina.gestor.get('/folhas-obra?estado=ativas&ordem=antigas');
    assert.ok(ativas.dados.itens.every((f) => f.estado !== 'entregue'));
    assert.ok(ativas.dados.itens.some((f) => f.id === folha.id));

    const pesquisa = await oficina.gestor.get(`/folhas-obra?q=${encodeURIComponent(veiculo.matricula.toLowerCase())}`);
    assert.equal(pesquisa.dados.itens[0].id, folha.id);

    assert.equal((await oficina.gestor.get('/folhas-obra?estado=inventado')).status, 400);

    const resumo = await oficina.gestor.get('/folhas-obra/resumo');
    assert.equal(resumo.status, 200);
    assert.ok(resumo.dados.porEstado.aguarda_pecas >= 1);
    assert.ok('subtotal' in resumo.dados.emCurso);
    assert.ok('total' in resumo.dados.entregues);
});

test('arquivar: cliente com veículos e veículo na oficina não se arquivam', async () => {
    const { cliente, veiculo, folha } = await novaFolha(oficina.gestor);
    assert.equal((await oficina.gestor.delete(`/clientes/${cliente.id}`)).status, 409);
    assert.equal((await oficina.gestor.delete(`/veiculos/${veiculo.id}`)).status, 409);

    await oficina.gestor.patch(`/folhas-obra/${folha.id}`, { estado: 'entregue' });
    assert.equal((await oficina.gestor.delete(`/veiculos/${veiculo.id}`)).status, 204);
    assert.equal((await oficina.gestor.delete(`/clientes/${cliente.id}`)).status, 204);

    // arquivado não aparece nas listas, mas o histórico continua acessível
    const clientes = await oficina.gestor.get(`/clientes?q=${encodeURIComponent(cliente.nome)}`);
    assert.equal(clientes.dados.total, 0);
    assert.equal((await oficina.gestor.get(`/folhas-obra/${folha.id}`)).status, 200);
});
