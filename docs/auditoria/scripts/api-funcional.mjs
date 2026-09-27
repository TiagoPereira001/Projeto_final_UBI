// auditoria funcional e de segurança da API (instância local, dados fictícios)
// autenticação, CSRF, papéis, modo bancada, isolamento entre oficinas,
// validação, casos-limite, concorrência e contas
import {
    Cliente, EMAIL_GESTOR, PASS_GESTOR, PINS, registar, guardar, sql, unico, mediana,
    nifValido, matriculaNova, credencialDeTeste, DIR,
} from './comum.mjs';

const R = registar;
const campos = (r) => Object.keys(r.dados?.campos || {}).join(',');

// ---------------------------------------------------------------- preparação
const gestor = new Cliente('gestor');
const tablet = new Cliente('tablet');

// ---------------------------------------------------------------- autenticação
{
    const r = await gestor.entrar();
    const c = r.setCookies.find((x) => x.startsWith('bancada_sessao=')) || '';
    const flags = ['HttpOnly', 'SameSite=Strict', 'Path=/api'].filter((f) => c.includes(f));
    R('A01', 'Autenticação', 'Login do gestor e opções do cookie de sessão', '200 + HttpOnly, SameSite=Strict, Path=/api',
        `${r.status} + ${flags.join(', ')}${c.includes('Secure') ? ', Secure' : ''}; Max-Age=${(c.match(/Max-Age=(\d+)/) || [])[1]}`,
        r.status === 200 && flags.length === 3, 'Secure ausente de propósito: a instância corre em http://localhost (COOKIE_SECURE=false)');

    // tempo de resposta: email existente com password errada vs email inexistente
    const t1 = [], t2 = [], msgs = new Set();
    const anon = new Cliente();
    for (let i = 0; i < 3; i++) {
        const a = await anon.post('/api/auth/entrar', { email: EMAIL_GESTOR, password: 'Errada-123456' });
        t1.push(a.ms); msgs.add(`${a.status}:${a.dados?.erro}`);
        const b = await anon.post('/api/auth/entrar', { email: `ninguem-${unico()}@exemplo.invalid`, password: 'Errada-123456' });
        t2.push(b.ms); msgs.add(`${b.status}:${b.dados?.erro}`);
    }
    R('A02', 'Autenticação', 'Password errada e email inexistente dão a mesma resposta', '1 resposta única (401)',
        [...msgs].join(' / '), msgs.size === 1);
    R('A03', 'Autenticação', 'Tempo de resposta: email existente vs inexistente (mediana de 3)', 'semelhante (bcrypt nos dois casos)',
        `${mediana(t1).toFixed(0)} ms vs ${mediana(t2).toFixed(0)} ms`, Math.abs(mediana(t1) - mediana(t2)) < 80);

    const s = await new Cliente().get('/api/clientes');
    R('A04', 'Autenticação', 'Pedido sem sessão', '401 JSON', `${s.status} ${JSON.stringify(s.dados)}`, s.status === 401 && Boolean(s.dados?.erro));

    // token adulterado e token sem assinatura (alg: none)
    const token = gestor.cookies.get('bancada_sessao');
    const [h, p] = token.split('.');
    const adulterado = new Cliente();
    adulterado.cookies.set('bancada_sessao', `${h}.${p}.${token.split('.')[2].slice(0, -2)}AA`);
    const ra = await adulterado.get('/api/clientes');
    const semAssinatura = new Cliente();
    const hNone = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    semAssinatura.cookies.set('bancada_sessao', `${hNone}.${p}.`);
    const rn = await semAssinatura.get('/api/clientes');
    R('A05', 'Autenticação', 'Token com assinatura adulterada / com alg "none"', '401 / 401', `${ra.status} / ${rn.status}`,
        ra.status === 401 && rn.status === 401);

    const dados = JSON.parse(Buffer.from(p, 'base64url').toString());
    R('A06', 'Autenticação', 'Duração da sessão (exp - iat)', '43200 s (12 h)', `${dados.exp - dados.iat} s; aud=${dados.aud}; iss=${dados.iss}`,
        dados.exp - dados.iat === 43200 && dados.aud === 'sessao');

    // sair: o cookie é apagado, mas o token copiado continua válido até expirar
    const outro = new Cliente();
    await outro.entrar();
    const copia = outro.cookies.get('bancada_sessao');
    const sair = await outro.post('/api/auth/sair');
    const reutilizado = new Cliente();
    reutilizado.cookies.set('bancada_sessao', copia);
    const rr = await reutilizado.get('/api/clientes');
    R('A07', 'Autenticação', 'Token copiado antes de "sair" ainda funciona depois', '401 (ideal) / 200 (JWT sem estado)',
        `sair=${sair.status}; reutilização=${rr.status}`, rr.status === 401 ? true : null,
        'o logout só apaga o cookie; o token vale até expirar (12 h) ou até mudar a Versao_Sessao');

    const sess = await new Cliente().get('/api/auth/sessao');
    R('A08', 'Autenticação', 'GET /auth/sessao sem cookie', '200 com colaborador null', `${sess.status} ${JSON.stringify(sess.dados)}`,
        sess.status === 200 && sess.dados?.colaborador === null);
}

// ---------------------------------------------------------------- CSRF
{
    const corpo = { nome: 'CSRF Teste (fictício)', telefone: '912345678' };
    const a = await gestor.post('/api/clientes', corpo, { origem: 'https://malicioso.example', fetchSite: 'cross-site' });
    const b = await gestor.post('/api/clientes', corpo, { origem: 'https://malicioso.example', fetchSite: null });
    const c = await gestor.post('/api/clientes', corpo, { origem: null, fetchSite: 'cross-site' });
    R('C01', 'Segurança', 'POST com Origin e Sec-Fetch-Site de outro site', '403 / 403 / 403', `${a.status} / ${b.status} / ${c.status}`,
        a.status === 403 && b.status === 403 && c.status === 403);
    const d = await gestor.post('/api/clientes', { ...corpo, nome: 'Sem cabeçalhos de origem (fictício)' }, { origem: null, fetchSite: null });
    R('C02', 'Segurança', 'POST sem Origin nem Sec-Fetch-Site (cliente que não é browser)', 'aceite: a defesa é o SameSite=Strict',
        d.status, d.status === 201 ? null : false, 'decisão de desenho: um browser envia sempre um dos dois cabeçalhos');
}

// ---------------------------------------------------------------- dados base
const clientes = (await gestor.get('/api/clientes?porPagina=200')).dados;
const veiculos = (await gestor.get('/api/veiculos?porPagina=200')).dados;
const folhas = (await gestor.get('/api/folhas-obra?porPagina=200')).dados;
const clienteA = clientes.itens[0];
const veiculoA = veiculos.itens[0];
const folhaA = folhas.itens.find((f) => f.estado !== 'entregue');
const folhaComLinhas = (await gestor.get(`/api/folhas-obra/${folhas.itens.find((f) => f.linhas > 0).id}`)).dados;

async function novoCliente(c = gestor, extra = {}) {
    const r = await c.post('/api/clientes', { nome: `Cliente Auditoria ${unico()} (fictício)`, telefone: '912345678', ...extra });
    if (r.status !== 201) throw new Error(`cliente: ${r.status} ${JSON.stringify(r.dados)}`);
    return r.dados;
}
async function novoVeiculo(c = gestor, clienteId) {
    const r = await c.post('/api/veiculos', { tipo: 'ligeiro', matricula: matriculaNova(), marca: 'Marca Fictícia', clienteId });
    if (r.status !== 201) throw new Error(`veículo: ${r.status} ${JSON.stringify(r.dados)}`);
    return r.dados;
}
async function novaFolha(c = gestor, veiculoId, extra = {}) {
    const r = await c.post('/api/folhas-obra', { veiculoId, observacoes: 'Auditoria (fictício)', ...extra });
    if (r.status !== 201) throw new Error(`folha: ${r.status} ${JSON.stringify(r.dados)}`);
    return r.dados;
}

// ---------------------------------------------------------------- modo bancada e papéis
{
    await tablet.entrar();
    const ativar = await tablet.post('/api/auth/bancada');
    R('B01', 'Funcional', 'Gestor transforma o dispositivo em bancada', '204, fica o cookie do dispositivo e sai a sessão',
        `${ativar.status}; dispositivo=${tablet.cookies.has('bancada_dispositivo')}; sessão=${tablet.cookies.has('bancada_sessao')}`,
        ativar.status === 204 && tablet.cookies.has('bancada_dispositivo') && !tablet.cookies.has('bancada_sessao'));

    const lista = await tablet.get('/api/auth/bancada');
    const nomes = lista.dados?.colaboradores?.map((c) => Object.keys(c).sort().join('+')) || [];
    R('B02', 'Segurança', 'Lista "quem está a trabalhar" só expõe id, nome e cargo', 'id+nome+cargo', [...new Set(nomes)].join(' '),
        nomes.every((k) => k === 'cargo+id+nome'));

    const id = (nome) => lista.dados.colaboradores.find((c) => c.nome === nome)?.id;
    const [nuno] = Object.keys(PINS);
    const entrar = await tablet.post('/api/auth/bancada/entrar', { colaboradorId: id(nuno), pin: PINS[nuno] });
    R('B03', 'Funcional', 'Mecânico entra com nome e PIN', '200 via pin', `${entrar.status} via ${entrar.dados?.colaborador?.via}`,
        entrar.status === 200 && entrar.dados?.colaborador?.via === 'pin');

    // o token de dispositivo não serve como sessão (audiência diferente)
    const falso = new Cliente();
    falso.cookies.set('bancada_sessao', tablet.cookies.get('bancada_dispositivo'));
    const rf = await falso.get('/api/clientes');
    R('A09', 'Autenticação', 'Token do dispositivo usado como cookie de sessão', '401', rf.status, rf.status === 401);

    const r1 = await tablet.get('/api/folhas-obra/resumo');
    const r2 = await tablet.get('/api/colaboradores');
    const r3 = await tablet.put('/api/oficinas/atual', { nome: 'x', nif: nifValido(12345678), taxaIva: 23 });
    const r4 = await tablet.del(`/api/clientes/${clienteA.id}`);
    R('R01', 'Autorização', 'Mecânico: resumo / equipa / definições / arquivar cliente', '403 / 403 / 403 / 403',
        `${r1.status} / ${r2.status} / ${r3.status} / ${r4.status}`, [r1, r2, r3, r4].every((x) => x.status === 403));

    // gestor com PIN: pode trabalhar no tablet, mas não gerir contas
    const eu = (await gestor.get('/api/auth/sessao')).dados.colaborador;
    const pinGestor = await gestor.put(`/api/colaboradores/${eu.id}`, { nome: eu.nome, cargo: 'gestor', email: EMAIL_GESTOR, pin: '2468' });
    await tablet.post('/api/auth/sair');
    const lista2 = await tablet.get('/api/auth/bancada');
    const eg = await tablet.post('/api/auth/bancada/entrar', { colaboradorId: lista2.dados.colaboradores.find((c) => c.id === eu.id)?.id, pin: '2468' });
    const eg2 = await tablet.get('/api/colaboradores');
    const eg3 = await tablet.get('/api/folhas-obra/resumo');
    R('R02', 'Autorização', 'Gestor que entrou com PIN: gerir equipa / ver resumo', '403 (só com password) / 200',
        `pin definido=${pinGestor.status}; entrar=${eg.status}; equipa=${eg2.status}; resumo=${eg3.status}`,
        eg.status === 200 && eg2.status === 403 && eg3.status === 200);
    const sessGestor = await gestor.get('/api/auth/sessao');
    R('A10', 'Autenticação', 'Gestor muda as próprias credenciais e continua com sessão', 'sessão renovada', sessGestor.dados?.colaborador ? 'sessão ativa' : 'sem sessão',
        Boolean(sessGestor.dados?.colaborador));
    await tablet.post('/api/auth/sair');

    // mudar o PIN de um mecânico termina as sessões abertas dele (colaborador
    // temporário, para o teste não depender do estado da base de dados)
    const temp = await gestor.post('/api/colaboradores', { nome: `Mecânico PIN ${unico()} (fictício)`, cargo: 'mecanico', pin: '8642' });
    await tablet.post('/api/auth/bancada/entrar', { colaboradorId: temp.dados.id, pin: '8642' });
    const antes = await tablet.get('/api/folhas-obra');
    const mudar = await gestor.put(`/api/colaboradores/${temp.dados.id}`, { nome: temp.dados.nome, cargo: 'mecanico', pin: '9753' });
    const depois = await tablet.get('/api/folhas-obra');
    R('A11', 'Autenticação', 'Gestor muda o PIN de um mecânico com sessão aberta', 'a sessão aberta passa a 401',
        `antes=${antes.status}; mudança=${mudar.status}; depois=${depois.status}`, antes.status === 200 && depois.status === 401);

    // desativar um colaborador corta-lhe a sessão
    const novo = await gestor.post('/api/colaboradores', { nome: `Mecânico Temporário ${unico()} (fictício)`, cargo: 'mecanico', pin: '1357' });
    const lista3 = await tablet.get('/api/auth/bancada');
    await tablet.post('/api/auth/bancada/entrar', { colaboradorId: novo.dados.id, pin: '1357' });
    const d1 = await tablet.get('/api/clientes');
    const desativar = await gestor.del(`/api/colaboradores/${novo.dados.id}`);
    const d2 = await tablet.get('/api/clientes');
    R('A12', 'Autenticação', 'Gestor desativa um colaborador com sessão aberta', '200 antes, 401 depois',
        `criar=${novo.status}; na lista=${lista3.dados.colaboradores.some((c) => c.id === novo.dados.id)}; antes=${d1.status}; desativar=${desativar.status}; depois=${d2.status}`,
        d1.status === 200 && desativar.status === 204 && d2.status === 401);

    // bloqueio do PIN: 5 falhas bloqueiam 5 minutos, mesmo com o PIN certo
    // (também num colaborador temporário, que fica bloqueado no fim)
    const alvo = await gestor.post('/api/colaboradores', { nome: `Mecânico Bloqueio ${unico()} (fictício)`, cargo: 'mecanico', pin: '3579' });
    const tentativas = [];
    for (let i = 0; i < 5; i++) {
        const t = await tablet.post('/api/auth/bancada/entrar', { colaboradorId: alvo.dados.id, pin: '0000' });
        tentativas.push(t.status);
    }
    const certo = await tablet.post('/api/auth/bancada/entrar', { colaboradorId: alvo.dados.id, pin: '3579' });
    R('P01', 'Segurança', 'PIN errado 5 vezes e depois o PIN certo', '401 x4, 429, 429 (bloqueado)',
        `${tentativas.join(', ')}, ${certo.status}: "${certo.dados?.erro}"`,
        tentativas.slice(0, 4).every((s) => s === 401) && tentativas[4] === 429 && certo.status === 429);
    const inexistente = await tablet.post('/api/auth/bancada/entrar', { colaboradorId: 999999, pin: '4321' });
    R('P02', 'Segurança', 'PIN para um colaborador que não existe', '401 "PIN incorreto." (não confirma se existe)',
        `${inexistente.status} "${inexistente.dados?.erro}"`, inexistente.status === 401);

    // entregar e reabrir: um mecânico não mexe numa folha entregue
    await tablet.post('/api/auth/bancada/entrar', { colaboradorId: id(nuno), pin: PINS[nuno] });
    const cli = await novoCliente();
    const vei = await novoVeiculo(gestor, cli.id);
    const f = await novaFolha(tablet, vei.id);
    const entregue = await gestor.patch(`/api/folhas-obra/${f.id}`, { estado: 'entregue' });
    const m1 = await tablet.patch(`/api/folhas-obra/${f.id}`, { estado: 'em_curso' });
    const m2 = await tablet.patch(`/api/folhas-obra/${f.id}`, { observacoes: 'alterada depois de entregue' });
    const m3 = await tablet.post(`/api/folhas-obra/${f.id}/linhas`, { designacao: 'Peça', categoria: 'peca', quantidade: 1, valorUnitario: 10 });
    const g1 = await gestor.patch(`/api/folhas-obra/${f.id}`, { estado: 'em_curso' });
    R('R03', 'Autorização', 'Folha entregue: mecânico reabre / edita notas / junta linha; gestor reabre', '409 / 409 / 409 / 200',
        `entregar=${entregue.status}; ${m1.status} / ${m2.status} / ${m3.status} / ${g1.status}`,
        entregue.status === 200 && m1.status === 409 && m2.status === 409 && m3.status === 409 && g1.status === 200);
    R('F01', 'Funcional', 'Reabrir limpa as datas de conclusão e entrega', 'dataEntrega null', `dataEntrega=${g1.dados?.dataEntrega}`,
        g1.dados?.dataEntrega === null);

    // sem cookie de dispositivo, as rotas da bancada recusam
    const semDisp = new Cliente();
    const s1 = await semDisp.get('/api/auth/bancada');
    const s2 = await semDisp.post('/api/auth/bancada/entrar', { colaboradorId: id(nuno), pin: PINS[nuno] });
    R('B04', 'Segurança', 'Rotas da bancada sem cookie de dispositivo', '401 / 401', `${s1.status} / ${s2.status}`, s1.status === 401 && s2.status === 401);

    // "desligar todos os tablets" invalida o cookie de dispositivo
    const antigo = tablet.cookies.get('bancada_dispositivo');
    const desligar = await gestor.post('/api/oficinas/atual/desligar-tablets');
    const velho = new Cliente();
    velho.cookies.set('bancada_dispositivo', antigo);
    const v1 = await velho.get('/api/auth/bancada');
    R('B05', 'Segurança', '"Desligar todos os tablets" e depois usar o cookie antigo', '401', `desligar=${desligar.status}; depois=${v1.status}`,
        v1.status === 401);
}

// ---------------------------------------------------------------- isolamento entre oficinas
const oficinaB = new Cliente('oficinaB');
let emailB;
{
    emailB = `gestor-b-${unico()}@exemplo.invalid`;
    const reg = await oficinaB.post('/api/oficinas', {
        oficina: { nome: `Oficina B Auditoria ${unico()} (fictícia)`, nif: nifValido(`2${Math.floor(Math.random() * 1e7)}`) },
        gestor: { nome: 'Gestor B (fictício)', email: emailB, password: credencialDeTeste() },
    });
    R('I01', 'Funcional', 'Registo público de uma segunda oficina', '201 e sessão aberta', `${reg.status}; sessão=${oficinaB.cookies.has('bancada_sessao')}`,
        reg.status === 201 && oficinaB.cookies.has('bancada_sessao'));

    const g = await Promise.all([
        oficinaB.get(`/api/clientes/${clienteA.id}`), oficinaB.get(`/api/veiculos/${veiculoA.id}`), oficinaB.get(`/api/folhas-obra/${folhaA.id}`),
    ]);
    R('I02', 'Isolamento', 'Oficina B lê cliente, veículo e folha da oficina A pelo id', '404 / 404 / 404', g.map((x) => x.status).join(' / '),
        g.every((x) => x.status === 404));

    const w = await Promise.all([
        oficinaB.put(`/api/clientes/${clienteA.id}`, { nome: 'Tomado', telefone: '912345678' }),
        oficinaB.del(`/api/veiculos/${veiculoA.id}`),
        oficinaB.patch(`/api/folhas-obra/${folhaA.id}`, { observacoes: 'tomado' }),
        oficinaB.post(`/api/folhas-obra/${folhaA.id}/linhas`, { designacao: 'x', categoria: 'peca', quantidade: 1, valorUnitario: 1 }),
        oficinaB.del(`/api/folhas-obra/${folhaComLinhas.id}/linhas/${folhaComLinhas.linhas[0].id}`),
    ]);
    R('I03', 'Isolamento', 'Oficina B altera, arquiva, junta e apaga dados da oficina A', '404 em tudo', w.map((x) => x.status).join(' / '),
        w.every((x) => x.status === 404));

    const cliB = await novoCliente(oficinaB);
    const x1 = await oficinaB.post('/api/folhas-obra', { veiculoId: veiculoA.id });
    const x2 = await oficinaB.post('/api/veiculos', { tipo: 'ligeiro', matricula: matriculaNova(), marca: 'X', clienteId: clienteA.id });
    const x3 = await oficinaB.put(`/api/veiculos/${veiculoA.id}`, { tipo: 'ligeiro', matricula: matriculaNova(), marca: 'X', clienteId: cliB.id });
    R('I04', 'Isolamento', 'Oficina B usa ids da oficina A no corpo do pedido', '400 / 400 / 404', `${x1.status} / ${x2.status} / ${x3.status}`,
        x1.status === 400 && x2.status === 400 && x3.status === 404);

    const l = await Promise.all(['/api/clientes', '/api/veiculos', '/api/folhas-obra'].map((c) => oficinaB.get(c)));
    R('I05', 'Isolamento', 'Listas da oficina B só têm dados dela', 'clientes 1, veículos 0, folhas 0',
        l.map((x) => x.dados.total).join(', '), l[0].dados.total === 1 && l[1].dados.total === 0 && l[2].dados.total === 0);

    const estados = await Promise.all(Array.from({ length: 60 }, (_, i) => oficinaB.get(`/api/folhas-obra/${i + 1}`)));
    const conta = estados.reduce((m, x) => ({ ...m, [x.status]: (m[x.status] || 0) + 1 }), {});
    R('I06', 'Isolamento', 'Oficina B percorre os ids de folha 1 a 60', 'só 404', JSON.stringify(conta), Object.keys(conta).every((k) => k === '404'));

    const repetido = await new Cliente().post('/api/oficinas', {
        oficina: { nome: 'Outra (fictícia)', nif: nifValido(`3${Math.floor(Math.random() * 1e7)}`) },
        gestor: { nome: 'Outro (fictício)', email: EMAIL_GESTOR, password: credencialDeTeste() },
    });
    R('I07', 'Segurança', 'Registo com o email de um gestor já existente', '409 que confirma que o email existe',
        `${repetido.status} "${repetido.dados?.erro}"`, repetido.status === 409 ? null : false, 'enumeração de contas (limitada a 5 registos por hora e por IP)');
    const colabB = await oficinaB.post('/api/colaboradores', { nome: 'Teste (fictício)', cargo: 'gestor', email: EMAIL_GESTOR, password: credencialDeTeste() });
    R('I08', 'Segurança', 'Gestor da oficina B cria colaborador com o email de um gestor da oficina A', '409 (o email é único na plataforma)',
        `${colabB.status} "${colabB.dados?.erro}"`, colabB.status === 409 ? null : false, 'confirma a outra oficina que o email tem conta noutra oficina');
}

// ---------------------------------------------------------------- validação e casos-limite
{
    const v1 = await gestor.post('/api/clientes', {});
    R('V01', 'Validação', 'Cliente sem campos', '400 com nome e telefone', `${v1.status} campos=${campos(v1)}`,
        v1.status === 400 && campos(v1).includes('nome') && campos(v1).includes('telefone'));

    const v2 = await gestor.post('/api/clientes', { nome: 'NIF Inválido (fictício)', telefone: '912345678', nif: '123456780' });
    const nif = nifValido(`5${Math.floor(Math.random() * 1e7)}`);
    const v3 = await gestor.post('/api/clientes', { nome: 'NIF Válido (fictício)', telefone: '912345678', nif });
    const v4 = await gestor.post('/api/clientes', { nome: 'NIF Repetido (fictício)', telefone: '912345678', nif });
    const v5 = await gestor.post('/api/clientes', { nome: 'Cliente Alemão (fictício)', telefone: '+49 30 1234567', nif: `DE${Math.floor(Math.random() * 1e9)}` });
    R('V02', 'Validação', 'NIF: dígito de controlo errado / válido / repetido / estrangeiro', '400 / 201 / 409 / 201',
        `${v2.status} / ${v3.status} / ${v4.status} / ${v5.status}`, v2.status === 400 && v3.status === 201 && v4.status === 409 && v5.status === 201);

    const nome = 'Zé Ñandú 🚐 Ølsen <b>teste</b>\u0007​ (fictício)';
    const v6 = await gestor.post('/api/clientes', { nome, telefone: '912 345 678' });
    R('V03', 'Validação', 'Unicode, emoji, HTML e caracteres de controlo no nome', 'guardado como texto, sem o \\u0007',
        JSON.stringify(v6.dados?.nome), v6.status === 201 && !v6.dados.nome.includes('\u0007') && v6.dados.nome.includes('🚐'),
        v6.dados?.nome?.includes('​') ? 'o espaço de largura zero (U+200B) fica guardado' : '');

    const v7 = await gestor.post('/api/clientes', { nome: 'x'.repeat(121), telefone: '912345678' });
    const v8 = await gestor.post('/api/clientes', { nome: 'Telefone Mau (fictício)', telefone: 'liga-me' });
    R('V04', 'Validação', 'Nome com 121 caracteres / telefone sem algarismos', '400 / 400', `${v7.status} / ${v8.status}`, v7.status === 400 && v8.status === 400);

    const cli = await novoCliente();
    const mat = matriculaNova();
    const ve1 = await gestor.post('/api/veiculos', { tipo: 'autocaravana', matricula: mat.toLowerCase(), marca: 'Fiat', marcaCelula: 'Hymer', clienteId: cli.id });
    const ve2 = await gestor.post('/api/veiculos', { tipo: 'ligeiro', matricula: mat.replace(/-/g, ' '), marca: 'Fiat', clienteId: cli.id });
    const ve3 = await gestor.post('/api/veiculos', { tipo: 'ligeiro', matricula: 'A', marca: 'Fiat', clienteId: cli.id });
    const ve4 = await gestor.post('/api/veiculos', { tipo: 'ligeiro', matricula: matriculaNova(), marca: 'Fiat', ano: 1899, clienteId: cli.id });
    const ve5 = await gestor.post('/api/veiculos', { tipo: 'ligeiro', matricula: matriculaNova(), marca: 'Fiat', ano: new Date().getFullYear() + 2, clienteId: cli.id });
    const ve6 = await gestor.post('/api/veiculos', { tipo: 'nave', matricula: matriculaNova(), marca: 'Fiat', clienteId: cli.id });
    const ve7 = await gestor.post('/api/veiculos', { tipo: 'ligeiro', matricula: matriculaNova(), marca: 'Fiat', marcaCelula: 'Hymer', clienteId: cli.id });
    R('V05', 'Validação', 'Veículo: minúsculas / mesma matrícula com espaços / 1 carácter / ano 1899 / ano+2 / tipo inválido',
        '201 normalizada / 409 / 400 / 400 / 400 / 400',
        `${ve1.status} ${ve1.dados?.matricula} / ${ve2.status} / ${ve3.status} / ${ve4.status} / ${ve5.status} / ${ve6.status}`,
        ve1.status === 201 && ve1.dados.matricula === mat.replace(/-/g, '') && ve2.status === 409 &&
        [ve3, ve4, ve5, ve6].every((x) => x.status === 400));
    R('V06', 'Validação', 'Marca da célula num veículo que não é autocaravana', 'ignorada (null)', `${ve7.status} marcaCelula=${ve7.dados?.marcaCelula}`,
        ve7.status === 201 && ve7.dados.marcaCelula === null);

    const vei = await novoVeiculo(gestor, cli.id);
    const f = await novaFolha(gestor, vei.id);
    const L = (corpo) => gestor.post(`/api/folhas-obra/${f.id}/linhas`, { designacao: 'Peça (fictícia)', categoria: 'peca', ...corpo });
    const casos = [
        [{ quantidade: 0, valorUnitario: 1 }, 400], [{ quantidade: -1, valorUnitario: 1 }, 400],
        [{ quantidade: '0,5', valorUnitario: '12,50' }, 201], [{ quantidade: 1.234, valorUnitario: 1 }, 400],
        [{ quantidade: 100000, valorUnitario: 1 }, 400], [{ quantidade: 1, valorUnitario: 0 }, 201],
        [{ quantidade: 1, valorUnitario: 10000000 }, 400], [{ quantidade: '1e2', valorUnitario: 1 }, 400],
        [{ quantidade: 1, valorUnitario: 1, categoria: 'bonus' }, 400], [{ quantidade: 1, valorUnitario: 1, designacao: 'x'.repeat(151) }, 400],
        [{ quantidade: ' 1 000 ', valorUnitario: 1 }, 201], [{ quantidade: 0.1 + 0.2, valorUnitario: 1 }, 400],
    ];
    const obtidos = [];
    for (const [corpo, esperado] of casos) obtidos.push([(await L(corpo)).status, esperado]);
    R('V07', 'Validação', 'Linhas: 0, -1, "0,5", 3 casas, 100000, preço 0, 10 milhões, "1e2", categoria, 151 car., " 1 000 ", 0.1+0.2',
        casos.map((c) => c[1]).join(' '), obtidos.map((o) => o[0]).join(' '), obtidos.every(([o, e]) => o === e));

    const k1 = await gestor.patch(`/api/folhas-obra/${f.id}`, { kmsEntrada: '0x10' });
    const k2 = await gestor.patch(`/api/folhas-obra/${f.id}`, { kmsEntrada: '1e3' });
    R('V08', 'Validação', 'Quilómetros "0x10" e "1e3"', '400 (ideal)', `${k1.status} kms=${k1.dados?.kmsEntrada} / ${k2.status} kms=${k2.dados?.kmsEntrada}`,
        k1.status === 400 ? true : null, 'o Number() do JavaScript aceita hexadecimal e notação científica');

    const cli2 = await novoCliente();
    const vei2 = await novoVeiculo(gestor, cli2.id);
    const b1 = await gestor.post('/api/folhas-obra', { veiculoId: [vei2.id] });
    R('V09', 'Validação', 'veiculoId enviado como lista [id]', '400 (ideal)', `${b1.status}`, b1.status === 400 ? true : null,
        'o Validador.id() usa Number(), e Number([5]) dá 5');

    const d1 = await gestor.post('/api/folhas-obra', { veiculoId: vei.id, dataEntrada: new Date(Date.now() + 86400000).toISOString() });
    const d2 = await gestor.post('/api/folhas-obra', { veiculoId: vei.id, dataEntrada: '1999-12-31T10:00:00Z' });
    const d3 = await gestor.post('/api/folhas-obra', { veiculoId: vei.id, dataEntrada: '31/12/2025' });
    R('V10', 'Validação', 'Data de entrada amanhã / em 1999 / em formato dd/mm/aaaa', '400 / 400 / 400', `${d1.status} / ${d2.status} / ${d3.status}`,
        [d1, d2, d3].every((x) => x.status === 400));

    const j1 = await gestor.pedido('POST', '/api/clientes', undefined, { corpoBruto: '{"nome": "x",' });
    const j2 = await gestor.pedido('POST', '/api/clientes', undefined, { corpoBruto: JSON.stringify({ nome: 'x'.repeat(150000), telefone: '1' }) });
    const j3 = await gestor.pedido('POST', '/api/clientes', undefined, { corpoBruto: 'nome=x&telefone=912345678', tipo: 'text/plain' });
    R('V11', 'Erros', 'JSON mal formado / corpo com 150 KB / corpo em texto simples', '400 / 413 / 400 com campos',
        `${j1.status} "${j1.dados?.erro}" / ${j2.status} / ${j3.status} campos=${campos(j3)}`,
        j1.status === 400 && j2.status === 413 && j3.status === 400);

    const u = await Promise.all([
        gestor.get('/api/nada'), gestor.put(`/api/folhas-obra/${f.id}`, {}), gestor.get('/api/folhas-obra/abc'),
        gestor.get('/api/folhas-obra/99999999999'), gestor.get('/api/folhas-obra/-1'),
    ]);
    R('V12', 'Erros', 'Rota inexistente / PUT numa rota só com PATCH / id "abc" / id enorme / id negativo', '404 JSON em todos',
        u.map((x) => `${x.status}${typeof x.dados === 'object' ? '' : '(não JSON)'}`).join(' / '), u.every((x) => x.status === 404 && typeof x.dados === 'object'),
        'um PUT numa rota que só aceita PATCH responde 404 e não 405');
    const hex = await gestor.get(`/api/folhas-obra/0x${f.id.toString(16)}`);
    R('V13', 'Erros', `Id da folha escrito em hexadecimal (0x${f.id.toString(16)})`, '404 (ideal)', `${hex.status}${hex.status === 200 ? ` (abre a folha ${hex.dados.id})` : ''}`,
        hex.status === 404 ? true : null, 'o idDoUrl() usa Number(), que aceita "0x.."');

    const p = await Promise.all([
        gestor.get('/api/clientes?porPagina=100000'), gestor.get('/api/clientes?pagina=-3'), gestor.get('/api/clientes?pagina=abc&porPagina=xyz'),
    ]);
    R('V14', 'Validação', 'Paginação: porPagina=100000 / pagina=-3 / valores não numéricos', 'limitada a 200 / página 1 / valores por omissão',
        p.map((x) => `${x.status} p=${x.dados.pagina} pp=${x.dados.porPagina}`).join(' / '),
        p[0].dados.porPagina === 200 && p[1].dados.pagina === 1 && p[2].dados.porPagina === 50);

    const q = async (texto) => (await gestor.get(`/api/clientes?q=${encodeURIComponent(texto)}`)).dados?.total;
    const total = (await gestor.get('/api/clientes')).dados.total;
    const pesquisas = { '%': await q('%'), '_': await q('_'), '[a-z]': await q('[a-z]'), "' OR 1=1 --": await q("' OR 1=1 --") };
    R('V15', 'Segurança', 'Pesquisa com %, _, [a-z] e \' OR 1=1 -- (injeção e LIKE)', `nenhuma devolve os ${total} clientes`,
        JSON.stringify(pesquisas), Object.values(pesquisas).every((n) => n < total));
    const qf = await gestor.get(`/api/folhas-obra?q=${encodeURIComponent("1; DROP TABLE Folha_Obra;--")}`);
    R('V16', 'Segurança', 'Pesquisa de folhas com "1; DROP TABLE Folha_Obra;--"', '200 sem efeitos', `${qf.status}; folhas continuam a existir: ${(await gestor.get('/api/folhas-obra')).dados.total > 0}`,
        qf.status === 200);
}

// ---------------------------------------------------------------- concorrência
{
    const cli = await novoCliente();
    const vei = await novoVeiculo(gestor, cli.id);
    const antes = Number(sql(`SELECT Ultimo_Numero_Folha FROM Oficina WHERE ID_Oficina = (SELECT ID_Oficina FROM Veiculo WHERE ID_Veiculo = ${vei.id})`));
    const r = await Promise.all(Array.from({ length: 10 }, () => gestor.post('/api/folhas-obra', { veiculoId: vei.id })));
    const depois = Number(sql(`SELECT Ultimo_Numero_Folha FROM Oficina WHERE ID_Oficina = (SELECT ID_Oficina FROM Veiculo WHERE ID_Veiculo = ${vei.id})`));
    const c = r.reduce((m, x) => ({ ...m, [x.status]: (m[x.status] || 0) + 1 }), {});
    R('D01', 'Integridade', '10 entradas em simultâneo para o mesmo veículo', '1 x 201, 9 x 409, contador +1', `${JSON.stringify(c)}; contador +${depois - antes}`,
        c[201] === 1 && c[409] === 9 && depois - antes === 1);

    const veiculosNovos = [];
    for (let i = 0; i < 15; i++) veiculosNovos.push(await novoVeiculo(gestor, cli.id));
    const rs = await Promise.all(veiculosNovos.map((v) => gestor.post('/api/folhas-obra', { veiculoId: v.id })));
    const numeros = rs.map((x) => x.dados?.numero).sort((a, b) => a - b);
    const seguidos = numeros.every((n, i) => i === 0 || n === numeros[i - 1] + 1);
    R('D02', 'Integridade', '15 entradas em simultâneo para 15 veículos', '15 x 201, números seguidos sem repetições',
        `${rs.filter((x) => x.status === 201).length} x 201; ${numeros[0]}..${numeros.at(-1)}; seguidos=${seguidos}`,
        rs.every((x) => x.status === 201) && new Set(numeros).size === 15 && seguidos);

    const folha = rs[0].dados;
    const linhas = await Promise.all(Array.from({ length: 20 }, (_, i) => gestor.post(`/api/folhas-obra/${folha.id}/linhas`,
        { designacao: `Peça ${i} (fictícia)`, categoria: 'peca', quantidade: 1, valorUnitario: '1.10' })));
    const final = (await gestor.get(`/api/folhas-obra/${folha.id}`)).dados;
    R('D03', 'Integridade', '20 linhas em simultâneo na mesma folha', '20 x 201 e subtotal 22.00',
        `${linhas.filter((x) => x.status === 201).length} x 201; subtotal=${final.totais.subtotal}; linhas=${final.linhas.length}`,
        linhas.every((x) => x.status === 201) && Number(final.totais.subtotal) === 22 && final.linhas.length === 20);
}

// ---------------------------------------------------------------- contas
{
    const cli = await novoCliente();
    const vei = await novoVeiculo(gestor, cli.id);
    const f = await novaFolha(gestor, vei.id, {
        linhas: [
            { designacao: 'Filtro (fictício)', categoria: 'peca', quantidade: 3, valorUnitario: '19.99' },
            { designacao: 'Mão de obra', categoria: 'mao_de_obra', quantidade: '2.5', valorUnitario: 35 },
            { designacao: 'Consumíveis', categoria: 'outro', quantidade: 1, valorUnitario: '0.10' },
        ],
    });
    const t = f.totais;
    R('M01', 'Dados', 'Totais: 3 x 19,99 + 2,5 h x 35 + 0,10, IVA 23%', 'subtotal 147.57, IVA 33.94, total 181.51',
        `subtotal ${t.subtotal}, IVA ${t.iva}, total ${t.total} (peças ${t.pecas}, MO ${t.maoDeObra}, outros ${t.outros})`,
        Number(t.subtotal) === 147.57 && Number(t.iva) === 33.94 && Number(t.total) === 181.51);
    R('M02', 'Dados', 'Tipo dos valores em euros no JSON', 'número com no máximo 2 casas',
        `${typeof t.total} ${t.total}`, typeof t.total === 'number' && /^\d+(\.\d{1,2})?$/.test(String(t.total)),
        'o driver mssql devolve DECIMAL como número de vírgula flutuante; só se formata, não se soma no browser');

    const l = await gestor.post(`/api/folhas-obra/${f.id}/linhas`, { designacao: 'Anilha (fictícia)', categoria: 'peca', quantidade: '1.5', valorUnitario: '0.03' });
    R('M03', 'Dados', 'Arredondamento de uma linha: 1,5 x 0,03 = 0,045', '0.05 (metade afasta-se do zero, como o ROUND do SQL Server)',
        l.dados?.linha?.total, Number(l.dados?.linha?.total) === 0.05);

    // a taxa de IVA fica fixa em cada folha
    const oficina = (await gestor.get('/api/oficinas/atual')).dados;
    const mudar = await gestor.put('/api/oficinas/atual', { ...oficina, taxaIva: 6 });
    const antiga = (await gestor.get(`/api/folhas-obra/${f.id}`)).dados.totais.taxaIva;
    const vei2 = await novoVeiculo(gestor, cli.id);
    const nova = await novaFolha(gestor, vei2.id);
    await gestor.put('/api/oficinas/atual', { ...oficina, taxaIva: oficina.taxaIva });
    R('M04', 'Dados', 'Mudar a taxa de IVA da oficina para 6%', 'folha antiga fica com 23, nova com 6',
        `mudar=${mudar.status}; antiga=${antiga}; nova=${nova.totais.taxaIva}`, Number(antiga) === 23 && Number(nova.totais.taxaIva) === 6);

    // fronteira do mês: 00:30 de 1 de setembro em Lisboa é 23:30 de 31 de agosto em UTC.
    // as outras folhas entregues da oficina passam para janeiro, para não contarem
    const vA = await novoVeiculo(gestor, cli.id);
    const vB = await novoVeiculo(gestor, cli.id);
    const fA = await novaFolha(gestor, vA.id, { linhas: [{ designacao: 'X', categoria: 'peca', quantidade: 1, valorUnitario: 100 }] });
    const fB = await novaFolha(gestor, vB.id, { linhas: [{ designacao: 'Y', categoria: 'peca', quantidade: 1, valorUnitario: 1000 }] });
    await gestor.patch(`/api/folhas-obra/${fA.id}`, { estado: 'entregue' });
    await gestor.patch(`/api/folhas-obra/${fB.id}`, { estado: 'entregue' });
    sql(`UPDATE Folha_Obra SET Data_Entrega = '2026-08-31T23:30:00' WHERE ID_Folha = ${fA.id};
         UPDATE Folha_Obra SET Data_Entrega = '2026-08-31T22:30:00' WHERE ID_Folha = ${fB.id};
         UPDATE Folha_Obra SET Data_Entrega = '2026-01-15T12:00:00' WHERE Estado = 'entregue' AND ID_Folha NOT IN (${fA.id}, ${fB.id}) AND ID_Oficina = (SELECT ID_Oficina FROM Folha_Obra WHERE ID_Folha = ${fA.id});`);
    const local = (await gestor.get(`/api/folhas-obra/resumo?desde=${encodeURIComponent('2026-08-31T23:00:00.000Z')}`)).dados.entregues;
    R('M05', 'Dados', 'Entregues em setembro (hora de Lisboa): 00:30 de 1/9 conta, 23:30 de 31/8 não', '1 folha, 123.00 com IVA',
        `${local.folhas} folha(s), ${local.total} com IVA`, local.folhas === 1 && Number(local.total) === 123);
    const omissao = (await gestor.get('/api/folhas-obra/resumo')).dados.entregues;
    R('M06', 'Dados', 'Resumo sem o parâmetro "desde" (valor por omissão do servidor)', 'início do mês em Lisboa (ideal)',
        `desde=${omissao.desde}; ${omissao.folhas} folha(s)`, omissao.folhas === 1 ? true : null,
        'por omissão o servidor usa o início do mês em UTC; a interface manda sempre o "desde" certo');
}

guardar(`${DIR}/resultados-api.json`);
console.log('\nfim');
