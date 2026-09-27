// tema claro/escuro. Por omissão segue o sistema; a escolha manual fica
// guardada só neste dispositivo (um tablet ao sol pode querer o claro,
// o computador do escritório o escuro)
const CHAVE = 'bancada:tema';

export function temaGuardado() {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === 'claro' || tema === 'escuro') raiz.dataset.tema = tema;
  else delete raiz.dataset.tema;
}

export function temaAtual() {
  const guardado = temaGuardado();
  if (guardado) return guardado;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

export function alternarTema() {
  const novo = temaAtual() === 'escuro' ? 'claro' : 'escuro';
  try {
    localStorage.setItem(CHAVE, novo);
  } catch {
    // sem armazenamento (modo privado): muda só nesta visita
  }
  aplicarTema(novo);
  return novo;
}
