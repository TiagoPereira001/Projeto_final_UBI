import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { SessaoProvider } from './context/SessaoContext';
import { AvisosProvider } from './context/AvisosContext';
import { Moldura } from './components/Moldura';
import { Protegida } from './components/Protegida';
import { Esqueleto } from './components/Situacoes';
import Entrar from './pages/Entrar';
import Bancada from './pages/Bancada';
import Quadro from './pages/Quadro';
import Folha from './pages/Folha';
import NovaEntrada from './pages/NovaEntrada';

// o que se usa no tablet todos os dias vai no pacote principal; o resto
// (gestão, registo) só é descarregado quando é preciso
const paginas = {
  Registar: () => import('./pages/Registar'),
  Folhas: () => import('./pages/Folhas'),
  Clientes: () => import('./pages/Clientes'),
  Cliente: () => import('./pages/Cliente'),
  Veiculos: () => import('./pages/Veiculos'),
  Veiculo: () => import('./pages/Veiculo'),
  Equipa: () => import('./pages/Equipa'),
  Definicoes: () => import('./pages/Definicoes'),
  NaoEncontrado: () => import('./pages/NaoEncontrado'),
};
const Registar = lazy(paginas.Registar);
const Folhas = lazy(paginas.Folhas);
const Clientes = lazy(paginas.Clientes);
const Cliente = lazy(paginas.Cliente);
const Veiculos = lazy(paginas.Veiculos);
const Veiculo = lazy(paginas.Veiculo);
const Equipa = lazy(paginas.Equipa);
const Definicoes = lazy(paginas.Definicoes);
const NaoEncontrado = lazy(paginas.NaoEncontrado);

const aCarregar = (elemento) => <Suspense fallback={<Esqueleto linhas={4} />}>{elemento}</Suspense>;
const soGestor = (elemento) => (
  <Protegida cargos={['gestor']} exigePassword>{aCarregar(elemento)}</Protegida>
);

const router = createBrowserRouter([
  { path: '/entrar', element: <Entrar /> },
  { path: '/registar', element: aCarregar(<Registar />) },
  { path: '/bancada', element: <Bancada /> },
  {
    path: '/',
    element: <Protegida><Moldura /></Protegida>,
    children: [
      { index: true, element: <Quadro /> },
      { path: 'entrada', element: <NovaEntrada /> },
      { path: 'folhas', element: aCarregar(<Folhas />) },
      { path: 'folhas/:id', element: <Folha /> },
      { path: 'clientes', element: aCarregar(<Clientes />) },
      { path: 'clientes/:id', element: aCarregar(<Cliente />) },
      { path: 'veiculos', element: aCarregar(<Veiculos />) },
      { path: 'veiculos/:id', element: aCarregar(<Veiculo />) },
      { path: 'equipa', element: soGestor(<Equipa />) },
      { path: 'definicoes', element: soGestor(<Definicoes />) },
      { path: '*', element: aCarregar(<NaoEncontrado />) },
    ],
  },
]);

export default function App() {
  // quando o browser está parado, adianta o download das outras páginas:
  // no tablet, abrir o Histórico ou os Clientes fica instantâneo
  useEffect(() => {
    const adiantar = () => Object.values(paginas).forEach((carregar) => carregar().catch(() => {}));
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(adiantar, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const relogio = setTimeout(adiantar, 2500);
    return () => clearTimeout(relogio);
  }, []);

  return (
    <SessaoProvider>
      <AvisosProvider>
        <RouterProvider router={router} />
      </AvisosProvider>
    </SessaoProvider>
  );
}
