// pesquisa tolerante: ignora maiúsculas, acentos, espaços e traços.
// "joao" encontra "João"; "aa00aa" encontra "AA-00-AA"
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function soLetrasENumeros(texto) {
  return normalizar(texto).replace(/[^a-z0-9]/g, '');
}

export function contem(alvo, pesquisa) {
  const q = normalizar(pesquisa).trim();
  if (!q) return true;
  return normalizar(alvo).includes(q) || soLetrasENumeros(alvo).includes(soLetrasENumeros(q));
}
