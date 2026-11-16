import React from 'react';
import { createRoot } from 'react-dom/client';
import { injectStyles } from '@spresenter/plugin-sdk/ui-kit';
import { App } from './App';
import './index.css';

injectStyles();

/** Mostra o erro em vez de deixar o painel em branco. */
class Boundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state: { err: Error | null } = { err: null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            margin: 14, padding: '12px 14px', borderRadius: 10, border: '1px solid #e74c3c',
            background: 'rgba(231, 76, 60, 0.10)', color: '#ff9b91',
            font: '13px/1.5 system-ui, sans-serif',
          }}
        >
          <b>Não consegui abrir o painel.</b>
          <div style={{ marginTop: 6, opacity: 0.9, wordBreak: 'break-word' }}>
            {this.state.err.message || String(this.state.err)}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </React.StrictMode>,
);
