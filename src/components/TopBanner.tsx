import { Zap } from 'lucide-react';
import { getApiBaseUrl } from '../lib/api-client';

export function TopBanner() {
  return (
    <header className="top-banner">
      <div className="top-banner__badge">
        <Zap size={18} />
        <span>Commerce Lab</span>
      </div>
      <div>
        <h1>Panel táctico para la operación ecommerce</h1>
        <p>
          Orquesta autenticación passwordless, búsqueda estilo Airtable ➜ Algolia y checkout con MercadoPago
          desde un mismo lugar.
        </p>
      </div>
      <div className="top-banner__meta">
        <span>API base</span>
        <strong>{getApiBaseUrl()}</strong>
      </div>
    </header>
  );
}
