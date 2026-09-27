// os valores são iguais em todos os sítios que calculam o total das linhas?
import { request } from 'playwright';
import { randomBytes } from 'node:crypto';
const BASE = process.env.BASE || 'http://localhost:3000';
const unico = () => Date.now().toString(36) + randomBytes(2).toString('hex');
function nif() { const d = [5]; while (d.length < 8) d.push(Math.floor(Math.random() * 10)); let s = 0; for (let i = 0; i < 8; i++) s += d[i] * (9 - i); let c = 11 - (s % 11); if (c >= 10) c = 0; return d.join('') + c; }
const api = await request.newContext({ baseURL: BASE });
const reg = await api.post('/api/oficinas', { data: {
  oficina: { nome: `Oficina dos totais ${unico()} (fictícia)`, nif: nif() },
  gestor: { nome: 'Gestor fictício', email: `totais-${unico()}@teste.test`, password: randomBytes(12).toString('base64url') + 'Aa1' },
} });
if (reg.status() !== 201) throw new Error(`registo ${reg.status()}`);
const cli = await (await api.post('/api/clientes', { data: { nome: 'Cliente fictício', telefone: '912 000 000' } })).json();
const vei = await (await api.post('/api/veiculos', { data: { matricula: `TT${unico()}`.slice(0, 10).toUpperCase(), tipo: 'ligeiro', marca: 'Fiat', clienteId: cli.id } })).json();
const folha = await (await api.post('/api/folhas-obra', { data: { veiculoId: vei.id, linhas: [
  { designacao: 'Peça A', categoria: 'peca', quantidade: '3', valorUnitario: '19,99' },
  { designacao: 'Mão de obra', categoria: 'mao_de_obra', quantidade: '1,75', valorUnitario: '11' },
] } })).json();
const linha = await (await api.post(`/api/folhas-obra/${folha.id}/linhas`, { data: { designacao: 'Outro', categoria: 'outro', quantidade: '0,33', valorUnitario: '3,33' } })).json();
const lista = await (await api.get('/api/folhas-obra?estado=ativas')).json();
const veiculo = await (await api.get(`/api/veiculos/${vei.id}`)).json();
const resumo = await (await api.get(`/api/folhas-obra/resumo?desde=${encodeURIComponent(new Date(Date.now() - 864e5).toISOString())}`)).json();
const completa = await (await api.get(`/api/folhas-obra/${folha.id}`)).json();
console.log(JSON.stringify({
  linhasDaFolha: completa.linhas.map((l) => l.total),
  linhaNova: linha.linha.total,
  totais: linha.totais,
  subtotalNaLista: lista.itens.find((f) => f.id === folha.id).subtotal,
  subtotalNoHistoricoDoVeiculo: veiculo.historico[0].subtotal,
  subtotalEmCursoNoResumo: resumo.emCurso.subtotal,
}));
await api.dispose();
