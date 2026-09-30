// cliente da API.
//
// a sessão vive num cookie httpOnly que o browser envia sozinho em cada
// pedido: o JavaScript da página nunca vê nem guarda o token (antes ia para
// o localStorage, onde qualquer script o podia ler). Em desenvolvimento o
// Vite reencaminha /api para a API (ver vite.config.js); em produção a API
// serve o frontend, por isso é tudo a mesma origem.

export class ErroApi extends Error {
  constructor(mensagem, status, campos) {
    super(mensagem);
    this.status = status;
    // erros por campo do formulário: { nome: 'Campo obrigatório.' }
    this.campos = campos || {};
  }
}

// `tempoLimite` (ms) é opcional: desiste do pedido se o servidor não responder a
// tempo. Sem ele, uma ligação a meio (o Wi-Fi da oficina) deixa o ecrã à espera
// durante minutos. Só o pedem os gestos em que ficar pendurado bloqueia alguém
async function pedido(caminho, { metodo = 'GET', corpo, sinal, tempoLimite } = {}) {
  const opcoes = { method: metodo, credentials: 'same-origin', signal: sinal };
  if (corpo !== undefined) {
    opcoes.headers = { 'Content-Type': 'application/json' };
    opcoes.body = JSON.stringify(corpo);
  }

  let esgotou = false;
  let relogio;
  if (tempoLimite) {
    const controlo = new AbortController();
    if (sinal?.aborted) controlo.abort();
    else sinal?.addEventListener('abort', () => controlo.abort(), { once: true });
    relogio = setTimeout(() => {
      esgotou = true;
      controlo.abort();
    }, tempoLimite);
    opcoes.signal = controlo.signal;
  }

  let resposta;
  try {
    resposta = await fetch(`/api${caminho}`, opcoes);
  } catch (err) {
    if (esgotou) throw new ErroApi('O servidor demorou a responder. Tenta outra vez.', 0);
    if (err.name === 'AbortError') throw err;
    throw new ErroApi('Sem ligação ao servidor. Confirma a internet e tenta outra vez.', 0);
  } finally {
    clearTimeout(relogio);
  }

  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    // a sessão acabou (expirou, ou o gestor desativou a conta): a app volta
    // ao ecrã de entrada. Os próprios pedidos de login ficam de fora
    if (resposta.status === 401 && !caminho.startsWith('/auth/')) {
      window.dispatchEvent(new CustomEvent('bancada:sessao-terminada'));
    }
    throw new ErroApi(dados?.erro || `Erro ${resposta.status}. Tenta outra vez.`, resposta.status, dados?.campos);
  }
  return dados;
}

export const api = {
  get: (caminho, opcoes) => pedido(caminho, opcoes),
  post: (caminho, corpo) => pedido(caminho, { metodo: 'POST', corpo: corpo ?? {} }),
  put: (caminho, corpo) => pedido(caminho, { metodo: 'PUT', corpo }),
  patch: (caminho, corpo, opcoes) => pedido(caminho, { metodo: 'PATCH', corpo, ...opcoes }),
  apagar: (caminho) => pedido(caminho, { metodo: 'DELETE' }),
};
