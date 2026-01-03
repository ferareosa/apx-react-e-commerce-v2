import type { OrderStatus } from '../types';

const currencyCache = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string) {
  if (!currencyCache.has(currency)) {
    currencyCache.set(
      currency,
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2
      })
    );
  }
  return currencyCache.get(currency)!;
}

export function formatCurrency(value: number, currency: string) {
  return getCurrencyFormatter(currency).format(value);
}

export function formatIsoDate(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export function formatRelativeTime(iso: string) {
  const target = new Date(iso).getTime();
  const diffMs = target - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (Math.abs(diffMinutes) > 90) {
    const diffHours = Math.round(diffMinutes / 60);
    return relativeFormatter.format(diffHours, 'hour');
  }
  return relativeFormatter.format(diffMinutes, 'minute');
}

export function getStatusCopy(status: OrderStatus) {
  const map: Record<OrderStatus, { label: string; tone: string }> = {
    'pending-payment': { label: 'Esperando pago', tone: 'pending' },
    paid: { label: 'Pago confirmado', tone: 'success' },
    failed: { label: 'Pago fallido', tone: 'danger' },
    'in-transit': { label: 'En tránsito', tone: 'pending' },
    delivered: { label: 'Entregado', tone: 'success' },
    cancelled: { label: 'Cancelado', tone: 'danger' }
  };
  return map[status];
}
