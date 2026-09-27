// carga na API (instância na porta 3001, sem limites de pedidos) com a oficina
// de carga: 3000 clientes, 4000 veículos, 12 000 folhas, 72 000 linhas (fictícios)
import { readFileSync, writeFileSync } from 'node:fs';
process.env.BASE = 'http://localhost:3001';
const { Cliente, DIR, sql } = await import('./comum.mjs');

const conta = JSON.parse(readFileSync(`${DIR}/carga-conta.json`, 'utf8'));
const c = new Cliente('carga');
await c.entrar(conta.email, conta.password);

const ativa = (await c.get('/api/folhas-obra?estado=ativas&ordem=antigas&porPagina=200')).dados.itens[0];
const veiculoComHistorico = Number(sql(`SELECT TOP 1 ID_Veiculo FROM Folha_Obra WHERE ID_Oficina = ${conta.oficinaId} GROUP BY ID_Veiculo ORDER BY COUNT(*) DESC`));
const inicioMes = new Date(Date.UTC(2026, 7, 31, 23)).toISOString();

async function medir(nome, pedido, { total = 400, concorrencia = 10 } = {}) {
    const tempos = [];
    const estados = {};
    let proximo = 0;
    const inicio = performance.now();
    await Promise.all(Array.from({ length: concorrencia }, async () => {
        while (proximo < total) {
            proximo += 1;
            const r = await pedido();
            tempos.push(r.ms);
            estados[r.status] = (estados[r.status] || 0) + 1;
        }
    }));
    const duracao = (performance.now() - inicio) / 1000;
    tempos.sort((a, b) => a - b);
    const p = (q) => tempos[Math.min(tempos.length - 1, Math.floor(q * tempos.length))].toFixed(0);
    const linha = { nome, pedidos: tempos.length, concorrencia, p50: p(0.5), p95: p(0.95), p99: p(0.99), max: tempos.at(-1).toFixed(0), porSegundo: (tempos.length / duracao).toFixed(0), estados };
    console.log(`${nome.padEnd(46)} c=${String(concorrencia).padStart(2)} p50 ${linha.p50.padStart(4)} ms  p95 ${linha.p95.padStart(4)} ms  p99 ${linha.p99.padStart(4)} ms  máx ${linha.max.padStart(5)} ms  ${linha.porSegundo.padStart(4)} ped/s  ${JSON.stringify(estados)}`);
    return linha;
}

const res = [];
res.push(await medir('quadro (60 folhas ativas)', () => c.get('/api/folhas-obra?estado=ativas&ordem=antigas&porPagina=200')));
res.push(await medir('resumo do gestor (valores do mês)', () => c.get(`/api/folhas-obra/resumo?desde=${encodeURIComponent(inicioMes)}`)));
res.push(await medir('histórico, página 1 de 12 000 folhas', () => c.get('/api/folhas-obra?pagina=1&porPagina=50')));
res.push(await medir('histórico, página 200', () => c.get('/api/folhas-obra?pagina=200&porPagina=50')));
res.push(await medir('pesquisa de folhas por nome ("Silva")', () => c.get('/api/folhas-obra?q=Silva')));
res.push(await medir('pesquisa de folhas por matrícula', () => c.get('/api/folhas-obra?q=CG0012')));
res.push(await medir('uma folha com 6 linhas', () => c.get(`/api/folhas-obra/${ativa.id}`)));
res.push(await medir('pesquisa de clientes ("Silva")', () => c.get('/api/clientes?q=Silva')));
res.push(await medir('veículo com o histórico de visitas', () => c.get(`/api/veiculos/${veiculoComHistorico}`)));
res.push(await medir('juntar uma linha (escrita + totais)', () => c.post(`/api/folhas-obra/${ativa.id}/linhas`,
    { designacao: 'Linha de carga (fictícia)', categoria: 'peca', quantidade: 1, valorUnitario: '1.00' }), { total: 200 }));
console.log('--- esforço: mais pedidos em simultâneo do que ligações no pool (10)');
res.push(await medir('quadro com 50 em simultâneo', () => c.get('/api/folhas-obra?estado=ativas&ordem=antigas&porPagina=200'), { total: 1000, concorrencia: 50 }));
res.push(await medir('histórico p1 com 50 em simultâneo', () => c.get('/api/folhas-obra?pagina=1&porPagina=50'), { total: 1000, concorrencia: 50 }));
writeFileSync(`${DIR}/resultados-carga.json`, JSON.stringify(res, null, 2));
