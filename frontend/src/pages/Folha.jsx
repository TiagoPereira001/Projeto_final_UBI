import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Plus, Trash, LockKey } from '../components/icones';
import { api } from '../lib/api';
import { useRecurso } from '../lib/useRecurso';
import { useTitulo } from '../lib/useTitulo';
import {
  CATEGORIAS, ESTADOS, ESTADOS_ATIVOS, categoria, dataHora, descreverVeiculo, euros, nomeEstado, numero, quilometros,
  tempoDesde,
} from '../lib/formatar';
import { useSessao } from '../context/SessaoContext';
import { useAvisos } from '../context/AvisosContext';
import { Matricula } from '../components/Matricula';
import { SimboloEstado } from '../components/Luzes';
import { Botao, BotaoConfirmar, TEMPO_CONFIRMACAO } from '../components/Botao';
import { AreaTexto, Segmentos, Texto } from '../components/Campo';
import { ErroCarregar, ErroFormulario, Esqueleto, Vazio } from '../components/Situacoes';
import '../styles/folha.css';

// a folha de obra: estado, linhas (peças, horas, outros), totais com IVA e notas.
// Atualiza sozinha de 30 em 30 segundos, para quem está no tablet ver as
// linhas que um colega acrescentou noutro dispositivo
export default function Folha() {
  const { id } = useParams();
  const folha = useRecurso(`/folhas-obra/${id}`, { intervalo: 30000 });
  useTitulo(folha.dados ? `Folha nº ${folha.dados.numero}, ${folha.dados.veiculo.matricula}` : 'Folha de obra');

  if (folha.aCarregar) return <Esqueleto linhas={5} altura={64} />;
  if (folha.erro && !folha.dados) {
    if (folha.erro.status === 404) {
      return (
        <Vazio pagina titulo="Esta folha não existe." acao={<Botao para="/">Voltar ao quadro</Botao>}>
          Pode ter sido o número errado, ou pertencer a outra oficina.
        </Vazio>
      );
    }
    return <ErroCarregar erro={folha.erro} aoTentar={folha.recarregar} />;
  }
  return <FolhaAberta folha={folha.dados} definir={folha.definirDados} recarregar={folha.recarregar} />;
}

function FolhaAberta({ folha, definir, recarregar }) {
  const { colaborador } = useSessao();
  const { mostrar } = useAvisos();
  const fechada = folha.estado === 'entregue';
  const gestor = colaborador.cargo === 'gestor';
  const [aMudarPara, setAMudarPara] = useState(null);

  async function mudarEstado(estado) {
    if (estado === folha.estado || aMudarPara) return;
    setAMudarPara(estado);
    try {
      // 15 s: o seletor fica bloqueado enquanto espera, não pode ser para sempre
      definir(await api.patch(`/folhas-obra/${folha.id}`, { estado }, { tempoLimite: 15000 }));
      mostrar(estado === 'entregue' ? 'Folha entregue e fechada.' : `Estado: ${nomeEstado(estado)}.`);
    } catch (err) {
      // o erro fica 8 s (no tablet lê-se a 1 ou 2 m) e a folha volta a pedir-se:
      // um colega pode tê-la entregue noutro dispositivo, ou a resposta perdeu-se
      // depois de a mudança ter chegado ao servidor. Assim o ecrã diz a verdade
      mostrar(err.message, { tipo: 'erro', duracao: 8000 });
      recarregar();
    } finally {
      setAMudarPara(null);
    }
  }

  async function removerLinha(linhaId) {
    try {
      const { totais } = await api.apagar(`/folhas-obra/${folha.id}/linhas/${linhaId}`) ?? {};
      definir((f) => ({ ...f, linhas: f.linhas.filter((l) => l.id !== linhaId), totais: totais ?? f.totais }));
      mostrar('Linha removida.');
    } catch (err) {
      mostrar(err.message, { tipo: 'erro' });
    }
  }

  return (
    <article className="folha">
      <header className="folha__cabecalho">
        <Link to="/" className="voltar"><ArrowLeft size={20} weight="bold" aria-hidden="true" /> Quadro</Link>
        <div className="folha__identidade">
          <Matricula valor={folha.veiculo.matricula} tamanho="grande" />
          <div className="folha__titulos">
            <h1 className="folha__titulo">Folha nº <span className="num">{folha.numero}</span></h1>
            <p className="folha__veiculo">
              <Link to={`/veiculos/${folha.veiculo.id}`}>{descreverVeiculo(folha.veiculo)}</Link>
              {folha.veiculo.ano ? <>, de <span className="num">{folha.veiculo.ano}</span></> : null}
            </p>
          </div>
        </div>
        <dl className="folha__factos">
          <div>
            <dt>Cliente</dt>
            <dd>
              <Link to={`/clientes/${folha.cliente.id}`}>{folha.cliente.nome}</Link>
              <a className="folha__telefone num" href={`tel:${folha.cliente.telefone.replace(/[^\d+]/g, '')}`}>
                <Phone size={18} weight="fill" aria-hidden="true" /> {folha.cliente.telefone}
              </a>
            </dd>
          </div>
          <div>
            <dt>Entrada</dt>
            <dd>
              <span title={dataHora(folha.dataEntrada)}>
                {tempoDesde(folha.dataEntrada)}, <span className="num">{quilometros(folha.kmsEntrada)}</span>
              </span>
            </dd>
          </div>
          <div>
            <dt>Aberta por</dt>
            <dd>{folha.colaborador.nome}</dd>
          </div>
        </dl>
      </header>

      <SeletorEstado
        atual={folha.estado}
        aoMudar={mudarEstado}
        aGravar={aMudarPara}
        gestor={gestor}
        bloqueado={fechada && !gestor}
      />
      {fechada && (
        <p className="folha__fechada">
          <LockKey size={20} weight="fill" aria-hidden="true" />
          Entregue a {dataHora(folha.dataEntrega)}. A folha está fechada
          {gestor ? '; para a alterar, escolhe outro estado acima.' : '; só um gestor a pode reabrir.'}
        </p>
      )}

      <div className="folha__corpo">
        <section className="painel folha__linhas" aria-labelledby="titulo-linhas">
          <header className="painel__cabecalho">
            <h2 className="painel__titulo" id="titulo-linhas">Peças e serviços</h2>
          </header>

          {folha.linhas.length === 0 ? (
            <Vazio titulo="Ainda sem linhas.">
              Regista aqui as peças que aplicas e as horas de trabalho, à medida que avanças.
            </Vazio>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">Descrição</th>
                  <th scope="col" className="tabela__num">Qtd.</th>
                  <th scope="col" className="tabela__num">Preço</th>
                  <th scope="col" className="tabela__num">Total</th>
                  {!fechada && <th scope="col"><span className="so-leitores">Ações</span></th>}
                </tr>
              </thead>
              <tbody>
                {folha.linhas.map((linha) => (
                  <tr key={linha.id}>
                    <td>
                      <span className="tabela__designacao">{linha.designacao}</span>
                      <span className="tabela__meta">{categoria(linha.categoria).nome}, por {linha.colaborador.nome}</span>
                      <span className="tabela__meta tabela__so-estreito num">
                        {numero(linha.quantidade)} {categoria(linha.categoria).unidade} × {euros(linha.valorUnitario)}
                      </span>
                    </td>
                    <td className="tabela__num num tabela__so-largo">{numero(linha.quantidade)} {categoria(linha.categoria).unidade}</td>
                    <td className="tabela__num num tabela__so-largo">{euros(linha.valorUnitario)}</td>
                    <td className="tabela__num num tabela__total">{euros(linha.total)}</td>
                    {!fechada && (
                      <td className="tabela__acao">
                        <BotaoConfirmar
                          variante="fantasma"
                          tamanho="compacto"
                          icone={Trash}
                          pergunta="Remover?"
                          aoConfirmar={() => removerLinha(linha.id)}
                          aria-label={`Remover ${linha.designacao}`}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!fechada && (
            <NovaLinha
              folhaId={folha.id}
              aoAdicionar={(linha, totais) => definir((f) => ({ ...f, linhas: [...f.linhas, linha], totais }))}
            />
          )}
        </section>

        <aside className="folha__lado">
          <Totais totais={folha.totais} />
          <Notas folha={folha} fechada={fechada} aoGuardar={definir} />
        </aside>
      </div>
    </article>
  );
}

const ENTREGUE = ESTADOS.find((e) => e.codigo === 'entregue');

// o estado escolhe-se com um toque. Cada opção tem o pictograma do estado,
// como no tablier: aceso no estado atual, apagado nos outros.
//
// Os quatro estados de trabalho ficam juntos e "Entregue" fica à parte, com a
// consequência à vista (num tablet não há rato para passar por cima). Entregar
// pede um segundo toque, porque fecha a folha e só um gestor a pode reabrir;
// reabrir também, porque apaga a data de entrega. A pergunta caduca ao fim de
// 4 s (como as outras confirmações), com Escape, se o foco sair do seletor ou
// se a folha mudar entretanto
function SeletorEstado({ atual, aoMudar, aGravar, gestor, bloqueado }) {
  const grupo = useRef(null);
  const [pedido, setPedido] = useState(null);
  // a pergunta só vale para a folha no estado em que foi feita
  const aPerguntar = pedido && pedido.desde === atual ? pedido.codigo : null;

  useEffect(() => {
    if (!pedido) return undefined;
    const relogio = setTimeout(() => setPedido(null), TEMPO_CONFIRMACAO);
    return () => clearTimeout(relogio);
  }, [pedido]);

  function tocar(codigo) {
    if (aGravar || codigo === atual) return;
    if (codigo === 'entregue' || atual === 'entregue') {
      if (aPerguntar !== codigo) {
        setPedido({ codigo, desde: atual, em: Date.now() });
        return;
      }
      // um toque duplo sem querer (luvas, dedos sujos) não conta como resposta:
      // ler a pergunta leva mais do que isto
      if (Date.now() - pedido.em < 400) return;
    }
    setPedido(null);
    aoMudar(codigo);
  }

  function aoTeclar(ev) {
    if (ev.key === 'Escape' && aPerguntar) setPedido(null);
  }

  function aoSairDoFoco(ev) {
    if (!grupo.current?.contains(ev.relatedTarget)) setPedido(null);
  }

  const opcao = (estado) => (
    <OpcaoEstado
      key={estado.codigo}
      estado={estado}
      atual={atual}
      aPerguntar={aPerguntar}
      aGravar={aGravar}
      gestor={gestor}
      desativada={bloqueado || Boolean(aGravar && aGravar !== estado.codigo)}
      aoTocar={tocar}
      aoTeclar={aoTeclar}
    />
  );

  return (
    <div className="seletor-estado" role="group" aria-label="Estado da reparação" ref={grupo} onBlur={aoSairDoFoco}>
      <div className="seletor-estado__trabalho">{ESTADOS_ATIVOS.map(opcao)}</div>
      <div className="seletor-estado__saida">{opcao(ENTREGUE)}</div>
      <p className="so-leitores" role="status">{anunciar({ aGravar, aPerguntar, gestor })}</p>
    </div>
  );
}

function OpcaoEstado({ estado, atual, aPerguntar, aGravar, gestor, desativada, aoTocar, aoTeclar }) {
  const { nome, nota } = textoDaOpcao(estado, { atual, aPerguntar, aGravar, gestor });
  return (
    <button
      type="button"
      aria-pressed={atual === estado.codigo}
      aria-busy={aGravar === estado.codigo || undefined}
      className={`seletor-estado__opcao estado--${estado.codigo}`}
      data-pergunta={aPerguntar === estado.codigo || undefined}
      disabled={desativada}
      onClick={() => aoTocar(estado.codigo)}
      onKeyDown={aoTeclar}
      title={nota ? undefined : estado.ajuda}
    >
      <SimboloEstado estado={estado.codigo} tamanho={26} className="seletor-estado__simbolo" />
      <span className="seletor-estado__texto">
        <span className="seletor-estado__nome">{nome}</span>
        {nota && <span className="seletor-estado__nota">{nota}</span>}
      </span>
    </button>
  );
}

// o que cada opção diz: o nome do estado e, onde ajuda a não errar, o que
// acontece ao tocar (em "Entregue" sempre; nas outras só na pergunta)
function textoDaOpcao(estado, { atual, aPerguntar, aGravar, gestor }) {
  if (aGravar === estado.codigo) return { nome: 'A gravar...' };
  if (aPerguntar === estado.codigo) {
    return estado.codigo === 'entregue'
      ? { nome: 'Entregar mesmo?', nota: gestor ? 'Podes reabrir depois' : 'Só um gestor reabre' }
      : { nome: 'Reabrir mesmo?', nota: 'Apaga a data de entrega' };
  }
  if (estado.codigo === 'entregue' && atual !== 'entregue') return { nome: estado.nome, nota: 'Fecha a folha' };
  return { nome: estado.nome };
}

// a mesma pergunta para quem usa um leitor de ecrã, que não vê o botão mudar
function anunciar({ aGravar, aPerguntar, gestor }) {
  if (aGravar) return 'A gravar o estado.';
  if (aPerguntar === 'entregue') {
    return `Toca outra vez em Entregue para fechar a folha. ${gestor ? 'Podes reabri-la depois.' : 'Só um gestor a pode reabrir.'}`;
  }
  if (aPerguntar) return `Toca outra vez em ${nomeEstado(aPerguntar)} para reabrir a folha. A data de entrega apaga-se.`;
  return '';
}

// adicionar uma linha: depois de adicionar, o cursor volta à descrição para a
// próxima peça (quem regista várias peças seguidas não tem de tocar em nada)
function NovaLinha({ folhaId, aoAdicionar }) {
  const { mostrar } = useAvisos();
  const [cat, setCat] = useState('peca');
  const [designacao, setDesignacao] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [valor, setValor] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState(null);
  const [erros, setErros] = useState({});
  const campoDesignacao = useRef(null);

  async function submeter(ev) {
    ev.preventDefault();
    setAGuardar(true);
    setErro(null);
    setErros({});
    try {
      const resposta = await api.post(`/folhas-obra/${folhaId}/linhas`, {
        categoria: cat, designacao, quantidade, valorUnitario: valor,
      });
      aoAdicionar(resposta.linha, resposta.totais);
      mostrar('Linha adicionada.');
      setDesignacao('');
      setValor('');
      setQuantidade('1');
      campoDesignacao.current?.focus();
    } catch (err) {
      setErro(err.message);
      setErros(err.campos || {});
    } finally {
      setAGuardar(false);
    }
  }

  const unidade = cat === 'mao_de_obra' ? 'Horas' : 'Quantidade';

  return (
    <form className="nova-linha formulario" onSubmit={submeter} noValidate>
      <h3 className="nova-linha__titulo">Adicionar</h3>
      <Segmentos
        etiqueta="Tipo"
        opcoes={CATEGORIAS.map((c) => ({ valor: c.codigo, nome: c.nome }))}
        valor={cat}
        aoMudar={setCat}
      />
      <Texto
        etiqueta="Descrição"
        value={designacao}
        onChange={(e) => setDesignacao(e.target.value)}
        erro={erros.designacao}
        ref={campoDesignacao}
        placeholder={cat === 'mao_de_obra' ? 'Ex.: substituição da bomba de água' : 'Ex.: filtro de óleo'}
        autoComplete="off"
        maxLength={150}
      />
      <div className="nova-linha__numeros">
        <Texto etiqueta={unidade} value={quantidade} onChange={(e) => setQuantidade(e.target.value)}
          erro={erros.quantidade} inputMode="decimal" autoComplete="off" />
        <Texto etiqueta="Preço sem IVA (€)" value={valor} onChange={(e) => setValor(e.target.value)}
          erro={erros.valorUnitario} inputMode="decimal" autoComplete="off" placeholder="0,00" />
        <Botao type="submit" variante="primario" tamanho="grande" icone={Plus} aTrabalhar={aGuardar}>Adicionar</Botao>
      </div>
      <ErroFormulario erro={erro && !Object.keys(erros).length ? erro : null} />
    </form>
  );
}

function Totais({ totais }) {
  return (
    <section className="painel totais" aria-labelledby="titulo-totais">
      <h2 className="painel__titulo totais__titulo" id="titulo-totais">Contas</h2>
      <dl className="totais__lista num">
        <div><dt>Peças</dt><dd>{euros(totais.pecas)}</dd></div>
        <div><dt>Mão de obra</dt><dd>{euros(totais.maoDeObra)}</dd></div>
        <div><dt>Outros</dt><dd>{euros(totais.outros)}</dd></div>
        <div className="totais__separador"><dt>Subtotal</dt><dd>{euros(totais.subtotal)}</dd></div>
        <div><dt>IVA ({numero(totais.taxaIva)}%)</dt><dd>{euros(totais.iva)}</dd></div>
        <div className="totais__final"><dt>Total</dt><dd>{euros(totais.total)}</dd></div>
      </dl>
      <p className="totais__nota">A fatura é emitida no programa de faturação certificado da oficina.</p>
    </section>
  );
}

function Notas({ folha, fechada, aoGuardar }) {
  const { mostrar } = useAvisos();
  const [notas, setNotas] = useState({
    kmsEntrada: folha.kmsEntrada ?? '',
    observacoes: folha.observacoes ?? '',
    conselhos: folha.conselhos ?? '',
  });
  const [aGuardar, setAGuardar] = useState(false);
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState(null);

  const mudou = String(notas.kmsEntrada) !== String(folha.kmsEntrada ?? '') ||
    notas.observacoes !== (folha.observacoes ?? '') || notas.conselhos !== (folha.conselhos ?? '');

  async function guardar(ev) {
    ev.preventDefault();
    setAGuardar(true);
    setErros({});
    setErro(null);
    try {
      aoGuardar(await api.patch(`/folhas-obra/${folha.id}`, {
        kmsEntrada: notas.kmsEntrada === '' ? null : String(notas.kmsEntrada).replace(/\s|\./g, ''),
        observacoes: notas.observacoes,
        conselhos: notas.conselhos,
      }));
      mostrar('Notas guardadas.');
    } catch (err) {
      setErro(err.message);
      setErros(err.campos || {});
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <form className="painel painel__corpo formulario notas" onSubmit={guardar} noValidate>
      <h2 className="painel__titulo">Notas</h2>
      <Texto etiqueta="Quilómetros à entrada" opcional value={notas.kmsEntrada} disabled={fechada}
        onChange={(e) => setNotas({ ...notas, kmsEntrada: e.target.value })} erro={erros.kmsEntrada} inputMode="numeric" />
      <AreaTexto etiqueta="Observações da entrada" opcional value={notas.observacoes} disabled={fechada}
        onChange={(e) => setNotas({ ...notas, observacoes: e.target.value })} erro={erros.observacoes} maxLength={2000} />
      <AreaTexto etiqueta="Conselhos para o cliente" opcional value={notas.conselhos} disabled={fechada}
        onChange={(e) => setNotas({ ...notas, conselhos: e.target.value })} erro={erros.conselhos} maxLength={2000}
        ajuda="O que convém rever numa próxima visita (manutenção preventiva)." />
      <ErroFormulario erro={erro && !Object.keys(erros).length ? erro : null} />
      {!fechada && (
        <Botao type="submit" variante={mudou ? 'primario' : 'secundario'} aTrabalhar={aGuardar} disabled={!mudou}>
          Guardar notas
        </Botao>
      )}
    </form>
  );
}
