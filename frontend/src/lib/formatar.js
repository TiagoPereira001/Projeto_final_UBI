// tudo o que tem a ver com mostrar dados em português de Portugal.
// A API usa códigos (em_curso, mao_de_obra...); os nomes bonitos vivem aqui.

const MOEDA = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const NUMERO = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
const INTEIRO = new Intl.NumberFormat('pt-PT');
const DATA = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
const DATA_HORA = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const HORA = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' });

export const euros = (valor) => MOEDA.format(Number(valor) || 0);
export const numero = (valor) => NUMERO.format(Number(valor) || 0);
export const quilometros = (valor) => (valor == null ? 'Sem registo' : `${INTEIRO.format(valor)} km`);
export const data = (valor) => (valor ? DATA.format(new Date(valor)) : '');
export const dataHora = (valor) => (valor ? DATA_HORA.format(new Date(valor)) : '');

// as matrículas portuguesas têm três pares, cada um só de letras ou só de
// números: AA-00-AA, 00-AA-00, 00-00-AA, AA-00-00. As estrangeiras (V432KL,
// holandesa) ficam como estão, porque não sabemos onde levam os traços
// três pares de letras ou algarismos: o formato das matrículas portuguesas
// (AA-00-00 até AA-00-AA). As estrangeiras ficam como foram escritas
export function matriculaPortuguesa(valor) {
  return /^(?:[A-Z]{2}|\d{2}){3}$/.test(valor || '');
}

export function matricula(valor) {
  if (!valor) return '';
  return matriculaPortuguesa(valor) ? valor.match(/.{2}/g).join('-') : valor;
}

// há quanto tempo o carro está na oficina: "hoje", "ontem", "há 3 dias"
export function tempoDesde(valor) {
  if (!valor) return '';
  const inicio = new Date(valor);
  const hoje = new Date();
  const dias = Math.round(
    (new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()) -
      new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())) / 86400000
  );
  if (dias <= 0) return `hoje, ${HORA.format(inicio)}`;
  if (dias === 1) return 'ontem';
  if (dias < 14) return `há ${dias} dias`;
  if (dias < 60) return `há ${Math.floor(dias / 7)} semanas`;
  return DATA.format(inicio);
}

// o dia 1 deste mês à meia-noite, na hora local (para o resumo do gestor)
export function inicioDoMes() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
}

export const ESTADOS = [
  { codigo: 'aberta', nome: 'Aberta', tablier: 'Abertas', ajuda: 'Entraram e esperam vez' },
  { codigo: 'em_curso', nome: 'Em curso', tablier: 'Em curso', ajuda: 'Alguém está a trabalhar nelas' },
  { codigo: 'aguarda_pecas', nome: 'A aguardar peças', tablier: 'Aguardam peças', ajuda: 'Paradas à espera de material' },
  { codigo: 'concluida', nome: 'Pronta', tablier: 'Prontas', ajuda: 'Prontas para o cliente levantar' },
  { codigo: 'entregue', nome: 'Entregue', tablier: 'Entregues', ajuda: 'Já saíram da oficina' },
];
export const ESTADOS_ATIVOS = ESTADOS.filter((e) => e.codigo !== 'entregue');
export const nomeEstado = (codigo) => ESTADOS.find((e) => e.codigo === codigo)?.nome ?? codigo;

export const TIPOS_VEICULO = [
  { codigo: 'ligeiro', nome: 'Ligeiro' },
  { codigo: 'comercial', nome: 'Comercial' },
  { codigo: 'autocaravana', nome: 'Autocaravana' },
  { codigo: 'motociclo', nome: 'Motociclo' },
  { codigo: 'pesado', nome: 'Pesado' },
  { codigo: 'outro', nome: 'Outro' },
];
export const nomeTipo = (codigo) => TIPOS_VEICULO.find((t) => t.codigo === codigo)?.nome ?? codigo;

export const CATEGORIAS = [
  { codigo: 'peca', nome: 'Peça', unidade: 'un.' },
  { codigo: 'mao_de_obra', nome: 'Mão de obra', unidade: 'h' },
  { codigo: 'outro', nome: 'Outro', unidade: 'un.' },
];
export const categoria = (codigo) => CATEGORIAS.find((c) => c.codigo === codigo) ?? CATEGORIAS[2];

export const CARGOS = [
  { codigo: 'mecanico', nome: 'Mecânico' },
  { codigo: 'gestor', nome: 'Gestor' },
];
export const nomeCargo = (codigo) => CARGOS.find((c) => c.codigo === codigo)?.nome ?? codigo;

// "Fiat Ducato + Hymer" nas autocaravanas; "Renault Clio" nos outros
export function descreverVeiculo(v) {
  if (!v) return '';
  const base = [v.marca, v.modelo].filter(Boolean).join(' ');
  return v.marcaCelula ? `${base} · célula ${v.marcaCelula}` : base;
}
