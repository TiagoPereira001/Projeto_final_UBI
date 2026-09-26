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

async function pedido(caminho, { metodo = 'GET', corpo, sinal } = {}) {
  const opcoes = { method: metodo, credentials: 'same-origin', signal: sinal };
  if (corpo !== undefined) {
    opcoes.headers = { 'Content-Type': 'application/json' };
    opcoes.body = JSON.stringify(corpo);
  }

  let resposta;
  try {
    resposta = await fetch(`/api${caminho}`, opcoes);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ErroApi('Sem ligação ao servidor. Confirma a internet e tenta outra vez.', 0);
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
  patch: (caminho, corpo) => pedido(caminho, { metodo: 'PATCH', corpo }),
  apagar: (caminho) => pedido(caminho, { metodo: 'DELETE' }),
};
