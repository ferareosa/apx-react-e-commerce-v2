import { initMercadoPago } from '@mercadopago/sdk-react';

let initializedKey: string | null = null;

export function ensureMercadoPagoInitialized(publicKey?: string | null) {
  if (!publicKey || initializedKey === publicKey) {
    return;
  }

  initMercadoPago(publicKey, {
    locale: 'es-AR'
  });
  initializedKey = publicKey;
}
