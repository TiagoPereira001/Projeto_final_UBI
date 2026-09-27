// latência das interações no tablet (aproximação ao INP), com o CPU 4x mais
// lento (como o Lighthouse em "mobile") e sem limitar a rede (Wi-Fi da oficina)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = process.env.AUDITORIA_DIR || '.';
const BASE = 'http://localhost:3000';
const seed = readFileSync(`${DIR}/seed-output.txt`, 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, locale: 'pt-PT', timezoneId: 'Europe/Lisbon' });
const page = await ctx.newPage();
await page.addInitScript(() => {
    window.__eventos = [];
    new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
            if (e.interactionId) window.__eventos.push({ tipo: e.name, duracao: e.duration, alvo: e.target?.className?.toString?.().slice(0, 40) || e.target?.tagName });
        }
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; })
        .observe({ type: 'layout-shift', buffered: true });
});
await page.goto(`${BASE}/entrar`);
await page.getByLabel('Email').fill(seed.match(/Gestor:\s+(\S+)/)[1]);
await page.getByLabel('Password').fill(seed.match(/Password:\s+(\S+)/)[1]);
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForURL(`${BASE}/`);
await page.waitForSelector('.fila');
await page.waitForTimeout(2500);

const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

const medir = async (nome, acao) => {
    await page.evaluate(() => { window.__eventos = []; });
    await acao();
    await page.waitForTimeout(3000);
    const ev = await page.evaluate(() => window.__eventos);
    const max = ev.reduce((m, e) => Math.max(m, e.duracao), 0);
    const lentos = [...ev].sort((x, y) => y.duracao - x.duracao).slice(0, 4).map((e) => `${e.tipo}:${Math.round(e.duracao)}ms@${e.alvo}`);
    return { nome, maximo: Math.round(max), eventos: ev.length, lentos };
};

const r = [];
r.push(await medir('tocar numa luz do tablier (filtra a lista)', () => page.locator('.tablier button, .tablier [role="button"]').nth(1).tap()));
r.push(await medir('tocar outra vez (tira o filtro)', () => page.locator('.tablier button, .tablier [role="button"]').nth(1).tap()));
r.push(await medir('abrir uma folha a partir da lista', async () => { await page.locator('.fila').first().tap(); await page.waitForSelector('.folha'); }));
r.push(await medir('escrever na descrição de uma linha', () => page.locator('input:not([type=radio]):not([type=checkbox])').first().pressSequentially('Pastilhas de travão', { delay: 30 })));
r.push(await medir('mudar o estado da folha (seletor)', () => page.locator('.seletor-estado button, .seletor-estado label').nth(1).tap()));
r.push(await medir('voltar ao quadro', async () => { await page.getByRole('link', { name: /Quadro/ }).first().tap(); await page.waitForSelector('.fila'); }));
const cls = await page.evaluate(() => window.__cls);

for (const x of r) console.log(`${x.nome}: interação mais lenta ${x.maximo} ms (${x.eventos} eventos acima de 16 ms) ${x.lentos.join(' ')}`);
console.log(`CLS acumulado no percurso: ${cls.toFixed(3)}`);
writeFileSync(`${DIR}/interacoes.json`, JSON.stringify({ interacoes: r, cls }, null, 2));
await browser.close();
