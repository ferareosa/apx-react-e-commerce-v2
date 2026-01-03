import { useQuery } from '@tanstack/react-query';
import { Loader, Receipt, RefreshCcw } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api-client';
import { formatCurrency, formatIsoDate } from '../lib/formatters';
import type { SupabaseOrderHistoryEntry, SupabaseOrderItem, SupabaseOrdersResponse } from '../types';

export function OrdersPanel() {
  const { token, user } = useAuth();
  const email = user?.email ?? null;

  const ordersQuery = useQuery({
    queryKey: ['supabase-orders', email, token],
    queryFn: () => {
      if (!token || !email) {
        return Promise.resolve<SupabaseOrdersResponse>({ user: null, total: 0, items: [] });
      }
      return api.listSupabaseOrders(email, token);
    },
    enabled: Boolean(token && email),
    refetchInterval: 15000
  });

  if (!token) {
    return (
      <div className="panel orders-panel">
        <header className="orders-header">
          <div>
            <h2>Seguimiento boutique</h2>
          </div>
          <Receipt className="panel__icon" size={32} />
        </header>
        <p className="muted">Necesitás iniciar sesión para ver tus entregas recientes.</p>
      </div>
    );
  }

  return (
    <div className="panel orders-panel">
      <header className="orders-header">
        <div>
          <h2>Seguimiento boutique</h2>
          <p className="muted">Actualizamos cada 15 minutos el estado con Mercado Pago.</p>
        </div>
        <button className="ghost" onClick={() => ordersQuery.refetch()} disabled={ordersQuery.isFetching}>
          {ordersQuery.isFetching ? <Loader className="spin" size={16} /> : <RefreshCcw size={16} />}
          <span>Actualizar</span>
        </button>
      </header>

      {ordersQuery.isError && (
        <p className="feedback error">{(ordersQuery.error as Error).message}</p>
      )}

      {ordersQuery.isSuccess && !ordersQuery.data?.items.length && !ordersQuery.isFetching ? (
        <div className="orders-empty">
          <p className="muted">Todavía no generaste órdenes.</p>
          <p>Explorá la colección y sumá piezas al carrito para ver su recorrido en esta sección.</p>
          <Link className="cta outline" to="/">
            Ir a la tienda
          </Link>
        </div>
      ) : null}

      <div className="stack gap-md">
        {(ordersQuery.data?.items ?? []).map((item) => (
          <OrderCard key={item.orderId} item={item} />
        ))}
      </div>
    </div>
  );
}

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  'pending-payment': { label: 'Esperando pago', tone: 'pending' },
  paid: { label: 'Pago confirmado', tone: 'success' },
  failed: { label: 'Pago fallido', tone: 'danger' },
  packed: { label: 'Empaquetado', tone: 'pending' },
  shipped: { label: 'Despachado', tone: 'pending' },
  'in-transit': { label: 'En tránsito', tone: 'pending' },
  delivered: { label: 'Entregado', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'danger' }
};

function resolveStatusCopy(status?: string | null) {
  if (!status) {
    return { label: 'Sin estado', tone: 'pending' };
  }
  return (
    STATUS_COPY[status] ?? {
      label: humanizeStatus(status),
      tone: 'pending'
    }
  );
}

function humanizeStatus(status: string) {
  return status
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function OrderCard({ item }: { item: SupabaseOrderItem }) {
  const statusCopy = resolveStatusCopy(item.status ?? item.history.at(0)?.status);
  const latestHistory = useMemo(() => item.history.at(0), [item.history]);
  const totalLabel =
    typeof item.total === 'number' && item.currency
      ? formatCurrency(item.total, item.currency)
      : 'Pendiente de imputar';

  return (
    <article className="order-card">
      <header>
        <div>
          <p className="order-sku">Orden #{item.orderId.slice(0, 8)}</p>
          <h3>{item.productId ?? 'SKU a confirmar'}</h3>
        </div>
        <div className={`status-chip ${statusCopy.tone}`}>
          {statusCopy.label}
        </div>
      </header>
      <p className="muted">Total abonado: {totalLabel}</p>
      <div className="order-card__body">
        <div>
          <p className="muted">Historial</p>
          <Timeline entries={item.history} />
        </div>
        <div className="order-card__actions">
          <div className="order-card__note">
            {latestHistory ? (
              <small className="muted">
                Último evento: {latestHistory.note ?? resolveStatusCopy(latestHistory.status).label}
              </small>
            ) : (
              <small className="muted">Sin eventos registrados todavía.</small>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Timeline({ entries }: { entries: SupabaseOrderHistoryEntry[] }) {
  if (!entries.length) {
    return <p className="muted">Aún no registramos eventos logísticos.</p>;
  }

  return (
    <ol className="timeline">
      {entries.map((entry, index) => {
        const timestamp = entry.at ? formatIsoDate(entry.at) : 'Fecha pendiente';
        const copy = entry.note ?? resolveStatusCopy(entry.status).label;
        const key = entry.at ?? `${entry.status ?? 'event'}-${index}`;
        return (
          <li key={key}>
            <span>{timestamp}</span>
            <p>{copy}</p>
          </li>
        );
      })}
    </ol>
  );
}
