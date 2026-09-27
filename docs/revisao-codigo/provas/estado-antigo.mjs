// provas no browser (instância local, dados fictícios criados aqui):
// 1) Notas da folha (BUG-01): depois da atualização automática, o formulário fica com o
//    texto antigo e, ao guardar outro campo, apaga o que um colega gravou
// 2) Definições (BUG-03): depois de "Desligar todos os tablets", o ecrã continua a dizer
//    que este dispositivo é a bancada
import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';

const BASE = process.env.BASE || 'http://localhost:3000';
const credencial = () => randomBytes(12).toString('base64url') + 'Aa1';
const unico = () => Date.now().toString(36) + randomBytes(2).toString('hex');
function nif() {
  const d = [5]; while (d.length < 8) d.push(Math.floor(Math.random() * 10));
  let s = 0; for (let i = 0; i < 8; i++) s += d[i] * (9 - i);
  let c = 11 - (s % 11); if (c >= 10) c = 0; return d.join('') + c;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const opcoes = { baseURL: BASE, viewport: { width: 1180, height: 820 } };
const a = await browser.newContext(opcoes);
const email = `revisao-${unico()}@teste.test`;
const password = credencial();
const reg = await a.request.post('/api/oficinas', { data: {
  oficina: { nome: `Oficina da revisão ${unico()} (fictícia)`, nif: nif() },
  gestor: { nome: 'Gestor fictício', email, password },
} });
if (reg.status() !== 201) throw new Error(`registo ${reg.status()} ${await reg.text()}`);
const cli = await (await a.request.post('/api/clientes', { data: { nome: 'Cliente fictício', telefone: '912 000 000' } })).json();
const vei = await (await a.request.post('/api/veiculos', { data: { matricula: `RV${unico()}`.slice(0, 10).toUpperCase(), tipo: 'ligeiro', marca: 'Renault', clienteId: cli.id } })).json();
const folha = await (await a.request.post('/api/folhas-obra', { data: { veiculoId: vei.id, observacoes: 'Texto original da entrada' } })).json();

// --- prova 1: dois dispositivos com a mesma folha aberta
const b = await browser.newContext(opcoes);
const login = await b.request.post('/api/auth/entrar', { data: { email, password } });
if (login.status() !== 200) throw new Error(`login ${login.status()}`);
const pa = await a.newPage();
const pb = await b.newPage();
await pa.goto(`/folhas/${folha.id}`);
await pb.goto(`/folhas/${folha.id}`);
const obsA = pa.getByLabel('Observações da entrada');
const obsB = pb.getByLabel('Observações da entrada');
await obsA.waitFor();
await obsB.waitFor();

await obsA.fill('Nota nova escrita no computador do gestor');
await pa.getByRole('button', { name: 'Guardar notas' }).click();
await pa.getByText('Notas guardadas.').waitFor();

// o tablet volta a pedir a folha (o mesmo que acontece de 30 em 30 s ou ao voltar ao separador)
const resposta = pb.waitForResponse((r) => r.url().endsWith(`/api/folhas-obra/${folha.id}`) && r.request().method() === 'GET');
await pb.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
const dadosNovos = await (await resposta).json();
await pb.waitForTimeout(300);
const botaoB = pb.getByRole('button', { name: 'Guardar notas' });
console.log('1a) a API devolveu ao tablet:', JSON.stringify(dadosNovos.observacoes));
console.log('1b) o campo no tablet mostra:  ', JSON.stringify(await obsB.inputValue()));
console.log('1c) "Guardar notas" no tablet está ativo sem ninguém mexer:', await botaoB.isEnabled());
// o mecânico escreve só um conselho e guarda
await pb.getByLabel('Conselhos para o cliente').fill('Rever as pastilhas daqui a 10 000 km');
await botaoB.click();
await pb.getByText('Notas guardadas.').waitFor();
const final = await (await a.request.get(`/api/folhas-obra/${folha.id}`)).json();
console.log('1d) depois de o tablet guardar um conselho, as observações são:', JSON.stringify(final.observacoes));
console.log('1e) e os conselhos:', JSON.stringify(final.conselhos));

// --- prova 2: Definições depois de "Desligar todos os tablets"
const c = await browser.newContext(opcoes);
await c.request.post('/api/auth/entrar', { data: { email, password } });
const ativar = await c.request.post('/api/auth/bancada');
await c.request.post('/api/auth/entrar', { data: { email, password } }); // o gestor volta a entrar com password no mesmo dispositivo
const pc = await c.newPage();
await pc.goto('/definicoes');
await pc.getByText('Este dispositivo é a bancada da oficina.').waitFor();
const desligar = pc.getByRole('button', { name: 'Desligar todos os tablets' });
await desligar.click();
await pc.getByRole('button', { name: 'Desligar todos?' }).click();
await pc.getByText('Todos os tablets foram desligados.').waitFor();
const sessao = await (await c.request.get('/api/auth/sessao')).json();
console.log('2a) ativar bancada respondeu', ativar.status());
console.log('2b) a API diz que este dispositivo é bancada:', sessao.bancada !== null);
console.log('2c) o ecrã continua a dizer "Este dispositivo é a bancada da oficina.":',
  await pc.getByText('Este dispositivo é a bancada da oficina.').isVisible());

await browser.close();
