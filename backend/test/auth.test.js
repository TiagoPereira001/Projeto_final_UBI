// sessões, registo, login e proteções (CSRF, rate limiting, tokens)
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { arrancar, fecharBaseDados, gerarNif, unico, novaOficina } = require('./ajuda');

let servidor;
test.before(async () => { servidor = await arrancar(); });
test.after(async () => { await servidor.parar(); await fecharBaseDados(); });

test('registo cria a oficina e o gestor, e deixa a sessão aberta', async () => {
    const { gestor, oficina, colaborador } = await novaOficina(servidor, 'Registo');
    assert.equal(colaborador.cargo, 'gestor');

    const sessao = await gestor.get('/auth/sessao');
    assert.equal(sessao.status, 200);
    assert.equal(sessao.dados.colaborador.id, colaborador.id);
    assert.equal(sessao.dados.oficina.id, oficina.id);

    // o cookie é httpOnly e SameSite=Strict (o JavaScript da página não o lê)
    const res = await servidor.cliente().post('/oficinas', {
        oficina: { nome: 'Outra', nif: gerarNif() },
        gestor: { nome: 'G', email: `g-${unico()}@teste.test`, password: 'Password-Segura-2026' },
    });
    const cookie = res.headers.getSetCookie().join(';');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
});

test('registo recusa NIF inválido, NIF repetido e email repetido', async () => {
    const c = servidor.cliente();
    const invalido = await c.post('/oficinas', {
        oficina: { nome: 'X', nif: '123456780' }, // 123456789 é válido!
        gestor: { nome: 'G', email: `a-${unico()}@teste.test`, password: 'Password-Segura-2026' },
    });
    assert.equal(invalido.status, 400);
    assert.ok(invalido.dados.campos['oficina.nif']);

    const nif = gerarNif();
    const email = `rep-${unico()}@teste.test`;
    const primeiro = await c.post('/oficinas', {
        oficina: { nome: 'Primeira', nif }, gestor: { nome: 'G', email, password: 'Password-Segura-2026' },
    });
    assert.equal(primeiro.status, 201);

    const nifRepetido = await servidor.cliente().post('/oficinas', {
        oficina: { nome: 'Segunda', nif }, gestor: { nome: 'G', email: `x-${unico()}@teste.test`, password: 'Password-Segura-2026' },
    });
    assert.equal(nifRepetido.status, 409);

    const emailRepetido = await servidor.cliente().post('/oficinas', {
        oficina: { nome: 'Terceira', nif: gerarNif() }, gestor: { nome: 'G', email, password: 'Password-Segura-2026' },
    });
    assert.equal(emailRepetido.status, 409);
});

test('registo recusa passwords fracas', async () => {
    const res = await servidor.cliente().post('/oficinas', {
        oficina: { nome: 'X', nif: gerarNif() },
        gestor: { nome: 'G', email: `f-${unico()}@teste.test`, password: '1234567890' },
    });
    assert.equal(res.status, 400);
    assert.ok(res.dados.campos['gestor.password']);
});

test('login: mesma mensagem para email inexistente e password errada', async () => {
    const { email, password } = await novaOficina(servidor, 'Login');
    const c = servidor.cliente();

    const errada = await c.post('/auth/entrar', { email, password: 'nao-e-esta-a-password' });
    const inexistente = await c.post('/auth/entrar', { email: `ninguem-${unico()}@teste.test`, password });
    assert.equal(errada.status, 401);
    assert.equal(inexistente.status, 401);
    assert.equal(errada.dados.erro, inexistente.dados.erro);

    const certa = await c.post('/auth/entrar', { email: email.toUpperCase(), password });
    assert.equal(certa.status, 200);
    assert.equal((await c.get('/clientes')).status, 200);
});

test('sair termina a sessão', async () => {
    const { gestor } = await novaOficina(servidor, 'Sair');
    assert.equal((await gestor.post('/auth/sair')).status, 204);
    assert.equal((await gestor.get('/clientes')).status, 401);
    const sessao = await gestor.get('/auth/sessao');
    assert.equal(sessao.dados.colaborador, null);
});

test('rotas protegidas sem sessão, ou com token adulterado, dão 401', async () => {
    const c = servidor.cliente();
    assert.equal((await c.get('/folhas-obra')).status, 401);

    // token assinado com outro segredo
    c.cookies.set('bancada_sessao', jwt.sign({ sub: '1', ofi: 1, v: 0 }, 'outro-segredo-qualquer-com-32-caracteres', {
        audience: 'sessao', issuer: 'bancada',
    }));
    assert.equal((await c.get('/folhas-obra')).status, 401);

    // token sem assinatura (algoritmo "none")
    c.cookies.set('bancada_sessao', jwt.sign({ sub: '1', ofi: 1, v: 0, aud: 'sessao', iss: 'bancada' }, null, { algorithm: 'none' }));
    assert.equal((await c.get('/folhas-obra')).status, 401);
});

test('um cookie de dispositivo (bancada) não serve como sessão', async () => {
    const { gestor } = await novaOficina(servidor, 'Audiencia');
    await gestor.post('/auth/bancada');
    const dispositivo = gestor.cookies.get('bancada_dispositivo');
    assert.ok(dispositivo);

    const c = servidor.cliente();
    c.cookies.set('bancada_sessao', dispositivo);
    assert.equal((await c.get('/clientes')).status, 401);
});

test('CSRF: pedidos que alteram dados vindos de outro site são recusados', async () => {
    const { gestor } = await novaOficina(servidor, 'Csrf');

    const origemMa = await gestor.post('/clientes', { nome: 'X', telefone: '912000000' }, { origem: 'https://site-malicioso.example' });
    assert.equal(origemMa.status, 403);

    const crossSite = await gestor.post('/clientes', { nome: 'X', telefone: '912000000' }, {
        origem: null, cabecalhos: { 'sec-fetch-site': 'cross-site' },
    });
    assert.equal(crossSite.status, 403);

    // leituras não são afetadas
    assert.equal((await gestor.get('/clientes', { origem: 'https://site-malicioso.example' })).status, 200);
});

test('desativar um colaborador corta-lhe a sessão logo, sem esperar que expire', async () => {
    const { gestor } = await novaOficina(servidor, 'Desativar');
    const email = `mec-${unico()}@teste.test`;
    const criado = await gestor.post('/colaboradores', {
        nome: 'Mecânico', cargo: 'mecanico', email, password: 'Outra-Password-Segura',
    });
    assert.equal(criado.status, 201);

    const mecanico = servidor.cliente();
    assert.equal((await mecanico.post('/auth/entrar', { email, password: 'Outra-Password-Segura' })).status, 200);
    assert.equal((await mecanico.get('/clientes')).status, 200);

    assert.equal((await gestor.delete(`/colaboradores/${criado.dados.id}`)).status, 204);
    assert.equal((await mecanico.get('/clientes')).status, 401);
});

test('mudar a password termina as outras sessões, mas não a de quem mudou', async () => {
    const { gestor, email, password, colaborador } = await novaOficina(servidor, 'Password');
    const outroDispositivo = servidor.cliente();
    await outroDispositivo.post('/auth/entrar', { email, password });

    const res = await gestor.put(`/colaboradores/${colaborador.id}`, {
        nome: colaborador.nome, cargo: 'gestor', email, password: 'Nova-Password-Segura-2026',
    });
    assert.equal(res.status, 200);
    assert.equal((await outroDispositivo.get('/clientes')).status, 401);
    assert.equal((await gestor.get('/clientes')).status, 200);
});

test('um mecânico não gere colaboradores nem vê o resumo financeiro', async () => {
    const { gestor } = await novaOficina(servidor, 'Permissoes');
    const email = `m-${unico()}@teste.test`;
    await gestor.post('/colaboradores', { nome: 'M', cargo: 'mecanico', email, password: 'Password-Do-Mecanico' });

    const mecanico = servidor.cliente();
    await mecanico.post('/auth/entrar', { email, password: 'Password-Do-Mecanico' });
    assert.equal((await mecanico.get('/colaboradores')).status, 403);
    assert.equal((await mecanico.post('/colaboradores', { nome: 'X', cargo: 'gestor' })).status, 403);
    assert.equal((await mecanico.get('/folhas-obra/resumo')).status, 403);
    assert.equal((await mecanico.put('/oficinas/atual', { nome: 'X' })).status, 403);
});

test('o gestor não pode retirar o próprio cargo nem desativar-se', async () => {
    const { gestor, email, colaborador } = await novaOficina(servidor, 'Proprio');
    const res = await gestor.put(`/colaboradores/${colaborador.id}`, { nome: 'G', cargo: 'mecanico', email });
    assert.equal(res.status, 400);
    assert.equal((await gestor.delete(`/colaboradores/${colaborador.id}`)).status, 400);
});

test('rate limiting: o login bloqueia depois de várias tentativas na mesma conta', async () => {
    const pequeno = await arrancar({ limites: { loginPorConta: 3 } });
    try {
        const c = pequeno.cliente();
        const email = `alvo-${unico()}@teste.test`;
        for (let i = 0; i < 3; i++) {
            assert.equal((await c.post('/auth/entrar', { email, password: 'tentativa-errada' })).status, 401);
        }
        assert.equal((await c.post('/auth/entrar', { email, password: 'tentativa-errada' })).status, 429);
        // outra conta, a partir do mesmo IP (a mesma oficina), não fica bloqueada
        assert.equal((await c.post('/auth/entrar', { email: `outro-${unico()}@teste.test`, password: 'x' })).status, 401);
    } finally {
        await pequeno.parar();
    }
});

test('JSON mal formado e rotas inexistentes respondem em JSON', async () => {
    const res = await fetch(`${servidor.base}/auth/entrar`, {
        method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' }, body: '{nao e json',
    });
    assert.equal(res.status, 400);
    assert.ok((await res.json()).erro);

    const inexistente = await servidor.cliente().get('/nao-existe');
    assert.equal(inexistente.status, 404);
    assert.equal(inexistente.dados.erro, 'Rota não encontrada.');
});

test('cabeçalhos de segurança e sem cache nas respostas da API', async () => {
    const res = await servidor.cliente().get('/saude');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.equal(res.headers.get('x-powered-by'), null);
});
