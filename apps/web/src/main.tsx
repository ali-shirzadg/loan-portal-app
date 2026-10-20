import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { AppProvider } from './app/provider';
import { AppRouter } from './app/router';
import './styles.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <AppProvider>
      <AppRouter />
    </AppProvider>
  </StrictMode>,
);
