import { useState } from 'react';
import { Plus, PencilSimple } from '../components/icones';
import { api } from '../lib/api';
import { useRecurso } from '../lib/useRecurso';
import { CARGOS, nomeCargo } from '../lib/formatar';
import { useSessao } from '../context/SessaoContext';
import { useAvisos } from '../context/AvisosContext';
import { Botao, BotaoConfirmar } from '../components/Botao';
import { Segmentos, Texto } from '../components/Campo';
import { ErroCarregar, ErroFormulario, Esqueleto, Vazio } from '../components/Situacoes';
import '../styles/gestao.css';

// a equipa da oficina. Cada pessoa entra de uma de duas formas (ou das duas):
// - PIN: no tablet partilhado da oficina (modo bancada)
// - email e password: no seu telemóvel ou computador (os gestores, sempre)
export default function Equipa() {
  const { colaborador: eu } = useSessao();
  const { mostrar } = useAvisos();
  const equipa = useRecurso('/colaboradores');
  const [aEditar, setAEditar] = useState(null); // null | 'novo' | id

  const itens = equipa.dados?.itens ?? [];

  async function desativar(pessoa) {
    try {
      await api.apagar(`/colaboradores/${pessoa.id}`);
      mostrar(`${pessoa.nome} já não tem acesso.`);
      setAEditar(null);
      equipa.recarregar();
    } catch (err) {
      mostrar(err.message, { tipo: 'erro' });
    }
  }

  return (
    <div className="gestao">
      <header className="cabecalho">
        <h1 className="cabecalho__titulo">Equipa</h1>
        {aEditar !== 'novo' && <Botao variante="primario" icone={Plus} onClick={() => setAEditar('novo')}>Adicionar pessoa</Botao>}
        <p className="cabecalho__sub">Quem entra no tablet da oficina precisa de um PIN. Os gestores entram também com email e password.</p>
      </header>

      {aEditar === 'novo' && (
        <section className="painel painel__corpo gestao__novo" aria-label="Nova pessoa">
          <h2 className="painel__titulo">Nova pessoa</h2>
          <FormularioColaborador
            aoCancelar={() => setAEditar(null)}
            aoGuardar={(novo) => { mostrar(`${novo.nome} adicionado à equipa.`); setAEditar(null); equipa.recarregar(); }}
          />
        </section>
      )}

      <section className="painel">
        {equipa.aCarregar && <div className="painel__corpo"><Esqueleto linhas={3} altura={64} /></div>}
        {equipa.erro && !equipa.dados && (
          <div className="painel__corpo"><ErroCarregar erro={equipa.erro} aoTentar={equipa.recarregar} /></div>
        )}
        {equipa.dados && itens.length === 0 && <Vazio titulo="Ainda não há ninguém na equipa." />}
        <ul className="lista">
          {itens.map((pessoa) => (
            <li key={pessoa.id}>
              {aEditar === pessoa.id ? (
                <div className="painel__corpo">
                  <FormularioColaborador
                    inicial={pessoa}
                    souEu={pessoa.id === eu.id}
                    aoCancelar={() => setAEditar(null)}
                    aoGuardar={() => { mostrar('Alterações guardadas.'); setAEditar(null); equipa.recarregar(); }}
                    aoDesativar={() => desativar(pessoa)}
                  />
                </div>
              ) : (
                <div className="linha-pessoa">
                  <span className="linha-pessoa__nome">
                    {pessoa.nome}
                    {pessoa.id === eu.id && <span className="etiqueta">Tu</span>}
                  </span>
                  <span className="linha-simples__dado">{nomeCargo(pessoa.cargo)}</span>
                  <span className="linha-pessoa__acessos">
                    {pessoa.temPin && <span className="etiqueta">PIN</span>}
                    {pessoa.email && <span className="etiqueta" title={pessoa.email}>Email</span>}
                  </span>
                  <Botao tamanho="compacto" variante="fantasma" icone={PencilSimple} onClick={() => setAEditar(pessoa.id)}>
                    Editar
                  </Botao>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FormularioColaborador({ inicial, souEu = false, aoGuardar, aoCancelar, aoDesativar }) {
  const aCriar = !inicial;
  const [dados, setDados] = useState({
    nome: inicial?.nome ?? '',
    cargo: inicial?.cargo ?? 'mecanico',
    email: inicial?.email ?? '',
    password: '',
    pin: '',
  });
  const [comEmail, setComEmail] = useState(Boolean(inicial?.email));
  const [removerPin, setRemoverPin] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState(null);
  const [erros, setErros] = useState({});
  const gestor = dados.cargo === 'gestor';
  const usaEmail = gestor || comEmail;
  const mudar = (campo) => (ev) => setDados((d) => ({ ...d, [campo]: ev.target.value }));

  async function submeter(ev) {
    ev.preventDefault();
    setAGuardar(true);
    setErro(null);
    setErros({});
    const corpo = {
      nome: dados.nome,
      cargo: dados.cargo,
      email: usaEmail ? dados.email : null,
      ...(dados.password ? { password: dados.password } : {}),
      ...(dados.pin ? { pin: dados.pin } : {}),
      ...(removerPin && !dados.pin ? { removerPin: true } : {}),
    };
    try {
      const gravado = aCriar
        ? await api.post('/colaboradores', corpo)
        : await api.put(`/colaboradores/${inicial.id}`, corpo);
      aoGuardar(gravado);
    } catch (err) {
      setErro(err.message);
      setErros(err.campos || {});
      setAGuardar(false);
    }
  }

  return (
    <form className="formulario" onSubmit={submeter} noValidate>
      <div className="formulario__linha">
        <Texto etiqueta="Nome" value={dados.nome} onChange={mudar('nome')} erro={erros.nome} autoComplete="off" />
        <Segmentos
          etiqueta="Cargo"
          opcoes={CARGOS.map((c) => ({ valor: c.codigo, nome: c.nome }))}
          valor={dados.cargo}
          aoMudar={(cargo) => setDados((d) => ({ ...d, cargo }))}
          erro={erros.cargo}
        />
      </div>

      <div className="formulario__linha">
        <Texto
          etiqueta={aCriar || !inicial.temPin ? 'PIN para o tablet' : 'Novo PIN'}
          opcional={usaEmail || (!aCriar && inicial.temPin)}
          value={dados.pin}
          onChange={(e) => setDados((d) => ({ ...d, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
          erro={erros.pin}
          inputMode="numeric"
          autoComplete="off"
          ajuda="4 a 6 algarismos, sem sequências como 1234."
        />
        {!aCriar && inicial.temPin && !dados.pin && (
          <label className="caixa">
            <input type="checkbox" checked={removerPin} onChange={(e) => setRemoverPin(e.target.checked)} />
            Tirar o PIN (deixa de entrar no tablet)
          </label>
        )}
      </div>

      {!gestor && (
        <label className="caixa">
          <input type="checkbox" checked={comEmail} onChange={(e) => setComEmail(e.target.checked)} />
          Também entra com email e password (no seu telemóvel)
        </label>
      )}

      {usaEmail && (
        <div className="formulario__linha">
          <Texto etiqueta="Email" type="email" value={dados.email} onChange={mudar('email')} erro={erros.email}
            autoComplete="off" />
          <Texto
            etiqueta={aCriar || !inicial.email ? 'Password' : 'Nova password'}
            opcional={!aCriar && Boolean(inicial.email)}
            type="password"
            value={dados.password}
            onChange={mudar('password')}
            erro={erros.password}
            autoComplete="new-password"
            ajuda="Pelo menos 10 caracteres."
          />
        </div>
      )}

      <ErroFormulario erro={erro && !Object.keys(erros).length ? erro : null} />
      <div className="formulario__acoes">
        <Botao type="submit" variante="primario" aTrabalhar={aGuardar}>{aCriar ? 'Adicionar' : 'Guardar'}</Botao>
        <Botao variante="fantasma" onClick={aoCancelar}>Cancelar</Botao>
        {!aCriar && !souEu && (
          <BotaoConfirmar className="formulario__direita" pergunta="Tirar o acesso?" aoConfirmar={aoDesativar}>
            Desativar
          </BotaoConfirmar>
        )}
      </div>
    </form>
  );
}
