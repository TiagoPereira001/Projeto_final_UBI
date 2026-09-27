// fiabilidade: limites de pedidos, base de dados em baixo e recuperação.
// corre no fim, porque bloqueia o IP local (limites) e pára o SQL Server
import { execFileSync } from 'node:child_process';
import { Cliente, registar as R, guardar, DIR, unico } from './comum.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// 1) login: 8 tentativas por IP e email em 15 minutos
{
    const c = new Cliente();
    const email = `limite-${unico()}@exemplo.invalid`;
    const estados = [];
    for (let i = 0; i < 9; i++) estados.push((await c.post('/api/auth/entrar', { email, password: 'Errada-123456' })).status);
    const outro = await c.post('/api/auth/entrar', { email: `outro-${unico()}@exemplo.invalid`, password: 'Errada-123456' });
    R('L01', 'Segurança', '9 tentativas de login falhadas para o mesmo email', '401 x8 e depois 429; outro email continua a poder tentar',
        `${estados.join(', ')}; outro email: ${outro.status}`, estados.slice(0, 8).every((s) => s === 401) && estados[8] === 429 && outro.status === 401);
}

// 2) base de dados em baixo: respostas, tempos e recuperação sem reiniciar a API
{
    const gestor = new Cliente();
    await gestor.entrar();
    const ok = await gestor.get('/api/clientes');

    execFileSync('docker', ['stop', '-t', '5', 'bancada_sql']);
    const saude = await gestor.get('/api/saude');
    const leitura = await gestor.get('/api/clientes');
    const escrita = await gestor.post('/api/clientes', { nome: 'Durante a falha (fictício)', telefone: '912345678' });
    const frontend = await fetch('http://localhost:3000/').then((r) => r.status);
    R('E01', 'Fiabilidade', 'SQL Server parado: saúde / leitura / escrita / página', '503 / 500 genérico / 500 genérico / 200',
        `${saude.status} (${saude.ms.toFixed(0)} ms) / ${leitura.status} "${leitura.dados?.erro}" (${leitura.ms.toFixed(0)} ms) / ${escrita.status} (${escrita.ms.toFixed(0)} ms) / ${frontend}`,
        saude.status === 503 && leitura.status === 500 && escrita.status === 500 && frontend === 200,
        'o corpo não traz detalhes do SQL Server');
    R('E02', 'Fiabilidade', 'Mensagem ao utilizador com a base de dados em baixo', 'diz que é temporário (idealmente 503)',
        `${leitura.status} "${leitura.dados?.erro}"`, null, 'um 503 com "serviço indisponível" seria mais exato que um 500');

    execFileSync('docker', ['start', 'bancada_sql']);
    const inicio = Date.now();
    let recuperou = null;
    while (Date.now() - inicio < 120000) {
        const s = await gestor.get('/api/saude');
        if (s.status === 200) { recuperou = Date.now() - inicio; break; }
        await esperar(2000);
    }
    const depois = await gestor.get('/api/clientes');
    R('E03', 'Fiabilidade', 'SQL Server volta: a API recupera sozinha?', 'saúde 200 e leitura 200 sem reiniciar a API',
        `saúde 200 ao fim de ${recuperou === null ? 'mais de 120 s' : `${(recuperou / 1000).toFixed(0)} s`}; leitura ${depois.status}; antes da falha ${ok.status}`,
        recuperou !== null && depois.status === 200);
}

// 3) limite geral: 1000 pedidos por IP em 5 minutos
{
    const c = new Cliente();
    let primeiro429 = null, estado429 = null;
    for (let i = 1; i <= 1010; i += 50) {
        const lote = await Promise.all(Array.from({ length: 50 }, () => c.get('/api/saude')));
        const k = lote.findIndex((r) => r.status === 429);
        if (k >= 0) { primeiro429 = i + k; estado429 = lote[k]; break; }
    }
    R('L02', 'Segurança', 'Rajada de pedidos do mesmo IP', '429 depois do pedido 1000, com mensagem em JSON',
        primeiro429 ? `429 no pedido ~${primeiro429}: "${estado429.dados?.erro}"; Retry-After=${estado429.headers.get('retry-after')}` : 'nunca 429',
        primeiro429 !== null && primeiro429 > 900);
}

guardar(`${DIR}/resultados-api.json`);
