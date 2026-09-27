// o formulário de cliente comporta-se igual antes e depois do useEnvio?
import { chromium } from 'playwright';
import { randomBytes } from 'node:crypto';
const BASE = process.env.BASE || 'http://localhost:3000';
const unico = () => Date.now().toString(36) + randomBytes(2).toString('hex');
function nif() { const d = [5]; while (d.length < 8) d.push(Math.floor(Math.random() * 10)); let s = 0; for (let i = 0; i < 8; i++) s += d[i] * (9 - i); let c = 11 - (s % 11); if (c >= 10) c = 0; return d.join('') + c; }

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1180, height: 820 } });
const reg = await ctx.request.post('/api/oficinas', { data: {
  oficina: { nome: `Oficina do formulário ${unico()} (fictícia)`, nif: nif() },
  gestor: { nome: 'Gestor fictício', email: `form-${unico()}@teste.test`, password: randomBytes(12).toString('base64url') + 'Aa1' },
} });
if (reg.status() !== 201) throw new Error(`registo ${reg.status()}`);
const p = await ctx.newPage();
await p.goto('/clientes');
await p.getByRole('button', { name: 'Novo cliente' }).click();
const guardar = p.getByRole('button', { name: 'Guardar cliente' });
await guardar.click();
await p.getByText('Campo obrigatório.').first().waitFor();
const mensagens = await p.locator('.campo__mensagem').allTextContents();
console.log('vazio: erros por campo =', JSON.stringify(mensagens), '| erro geral visível =', await p.locator('.erro-formulario').count() > 0,
  '| botão ativo outra vez =', await guardar.isEnabled());
await p.getByLabel('Nome').fill('Cliente fictício do teste');
await p.getByLabel('Telefone').fill('912 345 678');
await p.getByLabel('NIF').fill('123');
await guardar.click();
await p.locator('.campo__mensagem').first().waitFor();
console.log('NIF errado:', JSON.stringify(await p.locator('.campo__mensagem').allTextContents()));
await p.getByLabel('NIF').fill('');
await guardar.click();
await p.waitForURL(/\/clientes\/\d+$/);
console.log('válido: foi para', new URL(p.url()).pathname.replace(/\d+$/, ':id'), '| aviso =', await p.getByText('Cliente criado.').isVisible());
await browser.close();
