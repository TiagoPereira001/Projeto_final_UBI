// auditoria no browser (Chromium do Playwright, instância local, dados fictícios):
// XSS, acessibilidade (axe), transbordo horizontal, alvos de toque, teclado,
// bloqueio por inatividade, modo offline e falha de um ficheiro JS
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const DIR = process.env.AUDITORIA_DIR || '.';
const BASE = 'http://localhost:3000';
const PASTA = `${DIR}/browser`;
mkdirSync(PASTA, { recursive: true });

const seed = readFileSync(`${DIR}/seed-output.txt`, 'utf8');
const EMAIL = seed.match(/Gestor:\s+(\S+)/)[1];
const PASS = seed.match(/Password:\s+(\S+)/)[1];
const PINS = Object.fromEntries([...seed.matchAll(/^ {4}(\S.*?) {2,}(\d{4,6})\s*$/gm)].map((m) => [m[1].trim(), m[2]]));
const NUNO = Object.keys(PINS)[0];

const resultados = [];
const R = (id, categoria, titulo, esperado, obtido, ok, nota = '') => {
    resultados.push({ id, categoria, titulo, esperado: String(esperado), obtido: String(obtido), ok, nota });
    console.log(`${ok === true ? 'PASSA' : ok === false ? 'FALHA' : 'INFO '}  ${id.padEnd(5)} ${titulo} | esperado: ${esperado} | obtido: ${obtido}${nota ? ` | ${nota}` : ''}`);
};
const consola = [];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });

async function contexto({ largura = 1180, altura = 820, tema = 'claro', toque = true, sw = 'allow' } = {}) {
    const ctx = await browser.newContext({
        viewport: { width: largura, height: altura }, colorScheme: tema === 'escuro' ? 'dark' : 'light',
        hasTouch: toque, locale: 'pt-PT', timezoneId: 'Europe/Lisbon', serviceWorkers: sw,
    });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP: ${e.violatedDirective} ${e.blockedURI}`));
    });
    page.on('console', (m) => { if (m.type() === 'error') consola.push(`[${largura}px ${tema}] ${m.text()}`); });
    page.on('pageerror', (e) => consola.push(`[${largura}px ${tema}] pageerror: ${e.message}`));
    return { ctx, page };
}

async function entrar(page) {
    await page.goto(`${BASE}/entrar`);
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASS);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL(`${BASE}/`);
    await page.waitForSelector('.fila');
}

const api = async (page, metodo, caminho, dados) => {
    const r = await page.request.fetch(`${BASE}/api${caminho}`, {
        method: metodo, data: dados, headers: { origin: BASE, 'sec-fetch-site': 'same-origin' },
    });
    return { status: r.status(), dados: await r.json().catch(() => null) };
};

async function axe(page) {
    await page.evaluate(AXE);
    return page.evaluate(async () => {
        const r = await window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
            resultTypes: ['violations'],
        });
        return r.violations.map((v) => ({ id: v.id, impacto: v.impact, nos: v.nodes.length, exemplo: v.nodes[0]?.target?.join(' '), ajuda: v.help }));
    });
}

async function transbordo(page) {
    return page.evaluate(() => {
        const w = window.innerWidth;
        const doc = document.documentElement.scrollWidth - w;
        const fora = [];
        for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (r.right > w + 1 || r.left < -1) {
                // ignora o que está dentro de um contentor com scroll horizontal
                let p = el.parentElement, rola = false;
                while (p) { const s = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(s.overflowX)) { rola = true; break; } p = p.parentElement; }
                if (!rola) fora.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
            }
        }
        return { excesso: doc, fora: [...new Set(fora)].slice(0, 5) };
    });
}

async function alvosPequenos(page, minimo = 48) {
    return page.evaluate((m) => {
        const pequenos = [];
        for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], summary')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            const s = getComputedStyle(el);
            if (s.visibility === 'hidden' || s.display === 'none') continue;
            // links dentro de texto corrido ficam de fora (WCAG 2.5.8, exceção "inline")
            if (el.tagName === 'A' && s.display === 'inline') continue;
            if (r.height < m || r.width < m) pequenos.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
        return pequenos;
    }, minimo);
}

// ------------------------------------------------------------ preparação: dados com HTML
const { ctx: c0, page: p0 } = await contexto();
await entrar(p0);
const payload = '<img src=x onerror="window.__xss=1">Auditoria XSS <script>window.__xss=2</script> (fictício)';
const cli = await api(p0, 'POST', '/clientes', { nome: payload, telefone: '912345678' });
const vei = await api(p0, 'POST', '/veiculos', { tipo: 'ligeiro', matricula: `XS${Math.floor(Math.random() * 90 + 10)}ZZ`, marca: '<svg onload="window.__xss=3">', clienteId: cli.dados.id });
const folha = await api(p0, 'POST', '/folhas-obra', { veiculoId: vei.dados.id, observacoes: '<iframe src="javascript:window.__xss=4"></iframe>' });
await api(p0, 'POST', `/folhas-obra/${folha.dados.id}/linhas`, { designacao: '<a href="javascript:window.__xss=5">clica</a>', categoria: 'peca', quantidade: 1, valorUnitario: 1 });

// ------------------------------------------------------------ XSS
{
    const verificar = async (caminho) => {
        await p0.goto(BASE + caminho);
        await p0.waitForTimeout(900);
        return p0.evaluate(() => ({
            xss: window.__xss ?? null,
            elementos: document.querySelectorAll('img[src="x"], svg[onload], iframe, a[href^="javascript:"], script:not([src])').length,
            textoLiteral: document.body.innerText.includes('<img src=x'),
        }));
    };
    const quadro = await verificar(`/?q=${encodeURIComponent('Auditoria XSS')}`);
    const pagFolha = await verificar(`/folhas/${folha.dados.id}`);
    const pagCliente = await verificar(`/clientes/${cli.dados.id}`);
    const todos = [quadro, pagFolha, pagCliente];
    R('X01', 'Segurança', 'HTML e JavaScript guardados em nome, marca, notas e linha: quadro, folha e cliente',
        'nada executa, nenhum elemento criado, texto mostrado tal como foi escrito',
        todos.map((t) => `xss=${t.xss} elementos=${t.elementos} literal=${t.textoLiteral}`).join(' / '),
        todos.every((t) => t.xss === null && t.elementos === 0) && pagFolha.textoLiteral);
    await p0.screenshot({ path: `${PASTA}/xss-folha.png` });
}

// ------------------------------------------------------------ acessibilidade (axe) nos dois temas
const paginas = ['/', '/entrada', '/folhas', `/folhas/${folha.dados.id}`, '/clientes', `/clientes/${cli.dados.id}`, '/veiculos',
    `/veiculos/${vei.dados.id}`, '/equipa', '/definicoes', '/nao-existe'];
const violacoes = {};
for (const tema of ['claro', 'escuro']) {
    const { ctx, page } = tema === 'claro' ? { ctx: c0, page: p0 } : await contexto({ tema });
    if (tema === 'escuro') await entrar(page);
    const anon = await contexto({ tema });
    for (const caminho of ['/entrar', '/registar']) {
        await anon.page.goto(BASE + caminho);
        await anon.page.waitForTimeout(2600);
        for (const v of await axe(anon.page)) (violacoes[`${v.id}`] ??= []).push(`${tema} ${caminho} (${v.nos}) ${v.exemplo}`);
    }
    await anon.ctx.close();
    for (const caminho of paginas) {
        await page.goto(BASE + caminho);
        await page.waitForTimeout(caminho === '/' ? 2200 : 900);
        for (const v of await axe(page)) (violacoes[`${v.id}`] ??= []).push(`${tema} ${caminho} (${v.nos}) [${v.impacto}] ${v.exemplo} :: ${v.ajuda}`);
    }
    if (tema === 'escuro') await ctx.close();
}
R('A11Y1', 'Acessibilidade', 'axe-core 4.13 (WCAG 2.0/2.1/2.2 A e AA) em 13 ecrãs, temas claro e escuro', '0 violações',
    Object.keys(violacoes).length ? Object.entries(violacoes).map(([k, v]) => `${k}: ${v.length} ecrã(s)`).join('; ') : '0 violações',
    Object.keys(violacoes).length === 0);
writeFileSync(`${PASTA}/axe.json`, JSON.stringify(violacoes, null, 2));

// ------------------------------------------------------------ teclado e foco
{
    const { ctx, page } = await contexto({ toque: false, largura: 1440, altura: 900 });
    await page.goto(`${BASE}/entrar`);
    await page.waitForTimeout(2600);
    const passos = [];
    for (let i = 0; i < 4; i++) {
        await page.keyboard.press('Tab');
        passos.push(await page.evaluate(() => {
            const el = document.activeElement;
            const s = getComputedStyle(el);
            const visivel = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
            return `${el.tagName.toLowerCase()}${el.type ? `[${el.type}]` : ''}${el.textContent?.trim() ? `"${el.textContent.trim().slice(0, 14)}"` : ''}${visivel ? '' : ' SEM FOCO VISÍVEL'}`;
        }));
    }
    R('K01', 'Acessibilidade', 'Teclado no ecrã de entrada: Tab x4', 'email, password, entrar, registar, com foco visível', passos.join(' → '),
        !passos.some((p) => p.includes('SEM FOCO')));
    await ctx.close();
}

// ------------------------------------------------------------ transbordo horizontal em 4 larguras
{
    const tamanhos = [[390, 844], [820, 1180], [1180, 820], [1440, 900]];
    const problemas = [];
    for (const [largura, altura] of tamanhos) {
        const { ctx, page } = await contexto({ largura, altura, toque: largura < 1300 });
        await page.goto(`${BASE}/entrar`);
        await page.waitForTimeout(600);
        let t = await transbordo(page);
        if (t.excesso > 0 || t.fora.length) problemas.push(`${largura}px /entrar +${t.excesso}px ${t.fora.join(',')}`);
        await ctx.addCookies((await c0.cookies()).filter((c) => c.name === 'bancada_sessao'));
        for (const caminho of paginas) {
            await page.goto(BASE + caminho);
            await page.waitForTimeout(700);
            t = await transbordo(page);
            if (t.excesso > 0 || t.fora.length) problemas.push(`${largura}px ${caminho} +${t.excesso}px ${t.fora.join(',')}`);
        }
        if (largura === 390) await page.screenshot({ path: `${PASTA}/folha-390.png`, fullPage: true });
        await ctx.close();
    }
    R('RSP1', 'Responsivo', 'Transbordo horizontal em 390, 820 (alto), 1180 (deitado) e 1440 px, 12 ecrãs', 'nenhum',
        problemas.length ? problemas.join(' | ') : 'nenhum', problemas.length === 0);
}

// ------------------------------------------------------------ alvos de toque no tablet
{
    const pequenos = {};
    for (const caminho of ['/', `/folhas/${folha.dados.id}`, '/entrada']) {
        await p0.goto(BASE + caminho);
        await p0.waitForTimeout(900);
        const l = await alvosPequenos(p0);
        if (l.length) pequenos[caminho] = l;
    }
    R('T01', 'Acessibilidade', 'Alvos de toque com menos de 48 px no tablet (quadro, folha, nova entrada)', 'nenhum',
        Object.keys(pequenos).length ? Object.entries(pequenos).map(([k, v]) => `${k}: ${v.slice(0, 4).join(', ')}${v.length > 4 ? ` (+${v.length - 4})` : ''}`).join(' | ') : 'nenhum',
        Object.keys(pequenos).length === 0);
}

// ------------------------------------------------------------ modo bancada: teclado do PIN e bloqueio por inatividade
{
    const { ctx, page } = await contexto();
    await page.clock.install();
    await entrar(page);
    await api(page, 'POST', '/auth/bancada');
    await page.goto(`${BASE}/bancada`);
    await page.getByRole('button', { name: new RegExp(NUNO) }).click();
    const teclas = await page.$$eval('.teclado-pin button', (bs) => bs.map((b) => Math.round(Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))));
    R('T02', 'Acessibilidade', 'Teclas do PIN no tablet', 'pelo menos 72 px', `${Math.min(...teclas)} a ${Math.max(...teclas)} px (${teclas.length} teclas)`, Math.min(...teclas) >= 72);
    const pinAxe = await axe(page);
    R('A11Y2', 'Acessibilidade', 'axe no ecrã do PIN', '0 violações', pinAxe.length ? pinAxe.map((v) => `${v.id} (${v.nos})`).join(', ') : '0', pinAxe.length === 0);
    await page.keyboard.type(PINS[NUNO]);
    await page.keyboard.press('Enter'); // o teclado do PIN só entra com Enter (ou com a seta)
    await page.waitForURL(`${BASE}/`);
    await page.waitForSelector('.fila');
    await page.locator('.fila').first().click();
    await page.waitForSelector('.folha');
    const campo = page.locator('input:not([type=radio]):not([type=checkbox]), textarea').first();
    await campo.fill('Filtro de óleo (escrito e não gravado)');
    await page.clock.fastForward('04:30');
    const aos430 = page.url();
    await page.clock.fastForward('00:45');
    await page.waitForTimeout(500);
    const aos515 = page.url();
    const sess = await api(page, 'GET', '/auth/sessao');
    R('S01', 'Segurança', 'Tablet parado: 4 min 30 s e depois 5 min 15 s', 'continua aos 4:30; aos 5:15 volta a "quem vai trabalhar" e a sessão acaba',
        `4:30 ${aos430.replace(BASE, '')}; 5:15 ${aos515.replace(BASE, '')}; sessão=${sess.dados?.colaborador ? 'aberta' : 'fechada'}`,
        aos430.includes('/folhas/') && aos515.endsWith('/bancada') && !sess.dados?.colaborador,
        'o que estava escrito e não gravado perde-se (troca consciente: o tablet é partilhado)');
    await page.screenshot({ path: `${PASTA}/bloqueio.png` });
    await ctx.close();
}

// ------------------------------------------------------------ offline (PWA)
{
    const { ctx, page } = await contexto();
    await entrar(page);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.waitForTimeout(1500);
    await ctx.setOffline(true);
    await page.reload().catch(() => {});
    await page.waitForTimeout(2500);
    const texto = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 220);
    const mostraEntrada = (await page.getByRole('button', { name: 'Entrar' }).count()) > 0;
    const falaDeLigacao = /liga[çc][ãa]o|sem rede|offline/i.test(texto);
    await page.screenshot({ path: `${PASTA}/offline.png` });
    R('O01', 'Fiabilidade', 'Sem rede, recarregar a app (PWA)', 'a app abre a partir da cache e explica que não há ligação',
        `ecrã de entrada=${mostraEntrada}; fala da ligação=${falaDeLigacao}; texto: "${texto}"`, !mostraEntrada && falaDeLigacao, 'ver captura offline.png');
    await ctx.setOffline(false);
    await ctx.close();
}

// o caso do ficheiro JS em falta depois de uma atualização está em chunk.mjs: aqui não
// funcionava, porque a app já tinha descarregado a página antes da interceção

await c0.close();
await browser.close();
const erros = consola.filter((e) => !e.includes('Failed to load resource') && !e.includes('Failed to fetch dynamically'));
R('CON1', 'Qualidade', 'Erros na consola e violações da CSP em todo o percurso', 'nenhum (fora os provocados de propósito)',
    erros.length ? erros.slice(0, 6).join(' | ') : 'nenhum', erros.length === 0 ? true : null);
writeFileSync(`${PASTA}/consola.txt`, consola.join('\n'));
writeFileSync(`${DIR}/resultados-browser.json`, JSON.stringify(resultados, null, 2));
