// prova: o bloqueio do PIN (5 erros) aguenta pedidos em simultâneo? (BUG-02 da revisão)
// corre contra a BD de testes (Bancada_Teste, apagada e criada de novo), com o limite
// de PIN de produção (40 / 15 min por IP). PROJETO aponta para outra cópia do projeto
const path = require('node:path');
const { arrancar, fecharBaseDados, novaOficina } = require(
    path.join(process.env.PROJETO || path.resolve(__dirname, '../../..'), 'backend/test/ajuda.js'));

async function tablet(servidor, pinCerto) {
    const { gestor } = await novaOficina(servidor, 'Prova PIN');
    const mec = await gestor.post('/colaboradores', { nome: 'Mecânico da prova', cargo: 'mecanico', pin: pinCerto });
    const ativar = await gestor.post('/auth/bancada');
    if (mec.status !== 201 || ativar.status !== 204) throw new Error(`preparação falhou ${mec.status} ${ativar.status}`);
    return { tablet: gestor, colaboradorId: mec.dados.id };
}

// comparados: 401 "PIN incorreto", 429 "PIN errado 5 vezes" e 200. Não comparados: 429 "PIN bloqueado"
const comparados = (rs) => rs.filter((r) => r.status === 200 || r.status === 401 || /errado/.test(r.dados?.erro || '')).length;
const resumo = (rs) => rs.reduce((acc, r) => { const k = `${r.status} ${String(r.dados?.erro || (r.status === 200 ? 'entrou' : '')).slice(0, 38)}`; acc[k] = (acc[k] || 0) + 1; return acc; }, {});

(async () => {
    const servidor = await arrancar({ limites: { pin: 40 } });
    try {
        // A) sequencial (como o teste P01 da auditoria): 5 erros e depois bloqueia
        const a = await tablet(servidor, '4821');
        const seq = [];
        for (let i = 0; i < 7; i++) seq.push(await a.tablet.post('/auth/bancada/entrar', { colaboradorId: a.colaboradorId, pin: '1357' }));
        console.log('A) 7 PINs errados seguidos:', resumo(seq));

        // B) em simultâneo: 12 PINs errados ao mesmo tempo
        const b = await tablet(servidor, '4821');
        const par = await Promise.all(Array.from({ length: 12 }, () =>
            b.tablet.post('/auth/bancada/entrar', { colaboradorId: b.colaboradorId, pin: '1357' })));
        console.log('B) 12 PINs errados em simultâneo:', resumo(par), '| comparados:', comparados(par));

        // C) 19 errados + o certo, todos ao mesmo tempo: o certo entra apesar dos erros?
        const c = await tablet(servidor, '4821');
        const pedidos = Array.from({ length: 19 }, () => ({ colaboradorId: c.colaboradorId, pin: '1357' }));
        pedidos.push({ colaboradorId: c.colaboradorId, pin: '4821' });
        const misto = await Promise.all(pedidos.map((p) => c.tablet.post('/auth/bancada/entrar', p)));
        console.log('C) 19 errados + 1 certo em simultâneo:', resumo(misto), '| comparados:', comparados(misto));
    } finally {
        await servidor.parar();
        await fecharBaseDados();
    }
})().catch((e) => { console.error(e); process.exit(1); });
