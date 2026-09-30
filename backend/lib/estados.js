// os estados de uma folha de obra, pela ordem em que acontecem. A mesma lista
// está no CHECK da tabela Folha_Obra (database/schema.sql) e no frontend
// (frontend/src/lib/formatar.js): se mudar aqui, muda nos três sítios
const ESTADOS = ['aberta', 'em_curso', 'aguarda_pecas', 'concluida', 'entregue'];

// os que estão na oficina: tudo menos as entregues (as luzes do tablier)
const ESTADOS_ATIVOS = ESTADOS.filter((e) => e !== 'entregue');

module.exports = { ESTADOS, ESTADOS_ATIVOS };
