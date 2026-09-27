// um ficheiro de página (lazy) que já não existe depois de uma atualização:
// o servidor responde 200 com o index.html. O que vê quem tem a app aberta?
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const DIR = process.env.AUDITORIA_DIR || '.', BASE = 'http://localhost:3000';
const seed = readFileSync(`${DIR}/seed-output.txt`, 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, locale: 'pt-PT', serviceWorkers: 'block' });
const page = await ctx.newPage();
const consola = [];
page.on('console', (m) => { if (m.type() === 'error') consola.push(m.text()); });
page.on('pageerror', (e) => consola.push(`pageerror: ${e.message}`));
// a resposta real do servidor para um /assets/... inexistente
const real = await fetch(`${BASE}/assets/Clientes-versao-antiga.js`);
const html = await real.text();
await page.route('**/assets/Clientes-*.js', (route) => route.fulfill({ status: real.status, contentType: real.headers.get('content-type'), body: html }));
await page.goto(`${BASE}/entrar`);
await page.getByLabel('Email').fill(seed.match(/Gestor:\s+(\S+)/)[1]);
await page.getByLabel('Password').fill(seed.match(/Password:\s+(\S+)/)[1]);
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForURL(`${BASE}/`);
await page.waitForTimeout(2500);
await page.getByRole('link', { name: 'Clientes' }).first().click();
await page.waitForTimeout(2000);
const texto = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300);
await page.screenshot({ path: `${DIR}/browser/chunk-em-falta.png` });
console.log(`servidor para um asset inexistente: ${real.status} ${real.headers.get('content-type')}`);
console.log(`ecrã: "${texto}"`);
console.log(`consola: ${consola.map((c) => c.slice(0, 160)).join(' | ')}`);
writeFileSync(`${DIR}/resultados-chunk.json`, JSON.stringify([{
  id: 'E04', categoria: 'Fiabilidade', titulo: 'Página carregada à parte cujo ficheiro já não existe (depois de uma atualização)',
  esperado: 'mensagem clara com opção de recarregar', obtido: `servidor ${real.status} ${real.headers.get('content-type')}; ecrã: "${texto.slice(0, 160)}"`, ok: false,
  nota: consola.map((c) => c.slice(0, 120)).join(' | '),
}], null, 2));
await browser.close();
