import { useState } from 'react';
import { CarProfile, Truck, Van, Motorcycle, TruckTrailer, Tire } from './icones';
import { api } from '../lib/api';
import { TIPOS_VEICULO } from '../lib/formatar';
import { Botao } from './Botao';
import { Segmentos, Texto } from './Campo';
import { EscolherCliente } from './EscolherCliente';
import { ErroFormulario } from './Situacoes';

const ICONE_TIPO = {
  ligeiro: CarProfile,
  comercial: Truck,
  autocaravana: Van,
  motociclo: Motorcycle,
  pesado: TruckTrailer,
  outro: Tire,
};

export const OPCOES_TIPO = TIPOS_VEICULO.map((t) => ({ valor: t.codigo, nome: t.nome, icone: ICONE_TIPO[t.codigo] }));

// criar ou editar um veículo. Nas autocaravanas aparece também a marca da
// célula (a parte habitacional), que vem da análise original das folhas da
// Duarte & Raposo: o chassis e a célula têm fornecedores diferentes
export function FormularioVeiculo({ inicial = {}, aoGuardar, textoBotao = 'Guardar veículo', aoCancelar }) {
  const [v, setV] = useState({
    matricula: inicial.matricula ?? '',
    tipo: inicial.tipo ?? 'ligeiro',
    marca: inicial.marca ?? '',
    modelo: inicial.modelo ?? '',
    ano: inicial.ano ?? '',
    marcaCelula: inicial.marcaCelula ?? '',
  });
  const [cliente, setCliente] = useState(inicial.cliente ?? null);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState(null);
  const [erros, setErros] = useState({});

  const mudar = (campo) => (ev) => setV((x) => ({ ...x, [campo]: ev.target.value }));

  async function submeter(ev) {
    ev.preventDefault();
    setAGuardar(true);
    setErro(null);
    setErros({});
    const corpo = {
      ...v,
      ano: v.ano === '' ? null : v.ano,
      marcaCelula: v.tipo === 'autocaravana' ? v.marcaCelula : null,
      clienteId: cliente?.id,
    };
    try {
      const gravado = inicial.id
        ? await api.put(`/veiculos/${inicial.id}`, corpo)
        : await api.post('/veiculos', corpo);
      aoGuardar({ ...gravado, cliente });
    } catch (err) {
      setErro(err.message);
      setErros(err.campos || {});
      setAGuardar(false);
    }
  }

  return (
    <form className="formulario" onSubmit={submeter} noValidate>
      <Segmentos
        etiqueta="Tipo de veículo"
        opcoes={OPCOES_TIPO}
        valor={v.tipo}
        aoMudar={(tipo) => setV((x) => ({ ...x, tipo }))}
        erro={erros.tipo}
      />
      <div className="formulario__linha">
        <Texto etiqueta="Matrícula" value={v.matricula} onChange={mudar('matricula')} erro={erros.matricula}
          autoCapitalize="characters" autoComplete="off" spellCheck={false} className="campo--matricula" />
        <Texto etiqueta={v.tipo === 'autocaravana' ? 'Marca do chassis' : 'Marca'} value={v.marca}
          onChange={mudar('marca')} erro={erros.marca} autoComplete="off" />
        <Texto etiqueta="Modelo" opcional value={v.modelo} onChange={mudar('modelo')} erro={erros.modelo} autoComplete="off" />
        <Texto etiqueta="Ano" opcional value={v.ano} onChange={mudar('ano')} erro={erros.ano}
          inputMode="numeric" maxLength={4} />
      </div>
      {v.tipo === 'autocaravana' && (
        <Texto etiqueta="Marca da célula" opcional value={v.marcaCelula} onChange={mudar('marcaCelula')}
          erro={erros.marcaCelula} ajuda="A parte habitacional: Hymer, Adria, Rapido, Knaus..." autoComplete="off" />
      )}

      <EscolherCliente valor={cliente} aoMudar={setCliente} erro={erros.clienteId} />

      <ErroFormulario erro={erro && !Object.keys(erros).length ? erro : null} />
      <div className="formulario__acoes">
        <Botao type="submit" variante="primario" tamanho="grande" aTrabalhar={aGuardar}>{textoBotao}</Botao>
        {aoCancelar && <Botao variante="fantasma" tamanho="grande" onClick={aoCancelar}>Cancelar</Botao>}
      </div>
    </form>
  );
}
