import { Cliente, nifValido, unico, credencialDeTeste, DIR } from './comum.mjs';
import { writeFileSync } from 'node:fs';
const c = new Cliente();
const password = credencialDeTeste();
const email = `carga-${unico()}@exemplo.invalid`;
const r = await c.post('/api/oficinas', {
  oficina: { nome: 'Oficina de Carga (fictícia)', nif: nifValido(`6${Math.floor(Math.random() * 1e7)}`) },
  gestor: { nome: 'Gestor de Carga (fictício)', email, password },
});
if (r.status !== 201) throw new Error(`${r.status} ${JSON.stringify(r.dados)}`);
writeFileSync(`${DIR}/carga-conta.json`, JSON.stringify({ email, password, oficinaId: r.dados.oficina.id, gestorId: r.dados.colaborador.id }));
console.log(`oficina ${r.dados.oficina.id}, gestor ${r.dados.colaborador.id}`);
