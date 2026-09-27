import { useState } from 'react';
import { api } from '../lib/api';
import { Botao } from './Botao';
import { Texto } from './Campo';
import { ErroFormulario } from './Situacoes';

// criar ou editar um cliente. Só o nome e o telefone são obrigatórios: muitos
// clientes de autocaravana são turistas sem NIF português
export function FormularioCliente({ inicial = {}, aoGuardar, aoCancelar, textoBotao = 'Guardar cliente' }) {
  const [c, setC] = useState({
    nome: inicial.nome ?? '',
    telefone: inicial.telefone ?? '',
    nif: inicial.nif ?? '',
    email: inicial.email ?? '',
    morada: inicial.morada ?? '',
  });
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState(null);
  const [erros, setErros] = useState({});
  const mudar = (campo) => (ev) => setC((x) => ({ ...x, [campo]: ev.target.value }));

  async function submeter(ev) {
    ev.preventDefault();
    setAGuardar(true);
    setErro(null);
    setErros({});
    try {
      const gravado = inicial.id ? await api.put(`/clientes/${inicial.id}`, c) : await api.post('/clientes', c);
      aoGuardar(gravado);
    } catch (err) {
      setErro(err.message);
      setErros(err.campos || {});
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <form className="formulario" onSubmit={submeter} noValidate>
      <div className="formulario__linha">
        <Texto etiqueta="Nome" value={c.nome} onChange={mudar('nome')} erro={erros.nome} autoComplete="off" />
        <Texto etiqueta="Telefone" type="tel" value={c.telefone} onChange={mudar('telefone')} erro={erros.telefone} />
        <Texto etiqueta="NIF" opcional value={c.nif} onChange={mudar('nif')} erro={erros.nif}
          ajuda="Estrangeiros: com o código do país (ex.: DE123456789)." />
      </div>
      <div className="formulario__linha">
        <Texto etiqueta="Email" opcional type="email" value={c.email} onChange={mudar('email')} erro={erros.email} />
        <Texto etiqueta="Morada" opcional value={c.morada} onChange={mudar('morada')} erro={erros.morada} />
      </div>
      <ErroFormulario erro={erro && !Object.keys(erros).length ? erro : null} />
      <div className="formulario__acoes">
        <Botao type="submit" variante="primario" aTrabalhar={aGuardar}>{textoBotao}</Botao>
        {aoCancelar && <Botao variante="fantasma" onClick={aoCancelar}>Cancelar</Botao>}
      </div>
    </form>
  );
}
