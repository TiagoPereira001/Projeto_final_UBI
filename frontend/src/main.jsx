import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fontes.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/componentes.css';
import App from './App';

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
