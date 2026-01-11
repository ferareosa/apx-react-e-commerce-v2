import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StoreHeader } from '../components/StoreHeader';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api-client';
import { formatCurrency } from '../lib/formatters';

type StatusBucket = 'success' | 'failure' | 'pending';

const statusCopy: Record<StatusBucket, { title: string; message: string; accent: string }> = {
  success: {
    title: 'Pago confirmado',
    message: 'Gracias por tu compra. En breve recibirás un correo con todos los detalles.',
    accent: 'positive'
  },
  failure: {
    title: 'Pago rechazado',
    message: 'No pudimos procesar tu pago. Revisá los datos o probá con otro método.',
    accent: 'danger'
  },
  pending: {
    title: 'Pago en revisión',
    message: 'Estamos revisando tu pago. Te avisaremos por correo cuando se acredite.',
    accent: 'warning'
  }
};

// Mercado Pago returns a rich status vocabulary; normalise it into UI buckets.
const providerStatusBuckets: Record<string, StatusBucket> = {
  approved: 'success',
  authorized: 'success',
  accredited: 'success',
  in_process: 'pending',
  in_mediation: 'pending',
  pending: 'pending',
  partially_approved: 'pending',
  rejected: 'failure',
  cancelled: 'failure',
  charged_back: 'failure',
  refunded: 'failure'
};

function normaliseParam(value: string | null) {
  return value ? value.toLowerCase() : undefined;
}

function getBaseStatus(pathname: string, params: URLSearchParams): StatusBucket {
  const explicitStatus = normaliseParam(params.get('status'));
  if (explicitStatus === 'success' || explicitStatus === 'failure' || explicitStatus === 'pending') {
    return explicitStatus;
  }

  if (pathname.includes('/checkout/success')) {
    return 'success';
  }
  if (pathname.includes('/checkout/failure')) {
    return 'failure';
  }
  if (pathname.includes('/checkout/pending')) {
    return 'pending';
  }

  return 'pending';
}

function humanizeStatus(value?: string) {
  if (!value) {
    return undefined;
  }
  return value
    .split(/[_\s]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

const orderStatusCopy: Record<string, string> = {
  'pending-payment': 'Pago pendiente',
  paid: 'Pago acreditado',
  failed: 'Pago rechazado'
};

export function CheckoutStatusPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();

  const baseStatus = getBaseStatus(location.pathname, searchParams);
  const providerStatus = normaliseParam(
    searchParams.get('collection_status') ??
      searchParams.get('status') ??
      searchParams.get('payment_status') ??
      searchParams.get('result')
  );
  const statusKey: StatusBucket = providerStatus
    ? providerStatusBuckets[providerStatus] ?? baseStatus
    : baseStatus;
  const copy = statusCopy[statusKey];

  const orderId = searchParams.get('external_reference') ?? searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id') ?? searchParams.get('collection_id');
  const preferenceId = searchParams.get('preference_id');
  const merchantOrderId = searchParams.get('merchant_order_id');
  const paymentType = searchParams.get('payment_type');

  const { data: orderData, isLoading: isOrderLoading, error: orderError } = useQuery({
    queryKey: ['checkout-status-order', orderId],
    queryFn: () => api.getOrder(token!, orderId!),
    enabled: Boolean(token && orderId),
    staleTime: 1000 * 30
  });

  const providerStatusLabel = humanizeStatus(providerStatus);
  const paymentTypeLabel = humanizeStatus(paymentType ?? undefined);

  const details = [
    providerStatusLabel ? { label: 'Estado reportado', value: providerStatusLabel } : null,
    orderId ? { label: 'Orden vinculada', value: orderId } : null,
    paymentId ? { label: 'ID de pago', value: paymentId } : null,
    preferenceId ? { label: 'Preferencia', value: preferenceId } : null,
    merchantOrderId ? { label: 'Orden del comercio', value: merchantOrderId } : null,
    paymentTypeLabel ? { label: 'Método de pago', value: paymentTypeLabel } : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const orderStatusLabel = orderData?.order?.status
    ? orderStatusCopy[orderData.order.status] ?? humanizeStatus(orderData.order.status)
    : undefined;

  return (
    <div className="store-shell checkout-status">
      <StoreHeader />
      <section className={`panel checkout-status__panel checkout-status__panel--${copy.accent}`}>
        <p className="hero-kicker">Mercado Pago</p>
        <h1>{copy.title}</h1>
        <p className="muted">{copy.message}</p>

        {details.length > 0 && (
          <dl className="checkout-status__details">
            {details.map((item) => (
              <div className="checkout-status__details-item" key={`${item.label}-${item.value}`}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {orderId && !token && (
          <p className="checkout-status__footnote muted">
            Iniciá sesión para consultar el detalle completo de esta orden.
          </p>
        )}

        {isOrderLoading && (
          <p className="checkout-status__footnote muted">Cargando detalle de la orden…</p>
        )}

        {orderError && (
          <p className="feedback ghost">No pudimos recuperar el detalle de la orden vinculada.</p>
        )}

        {orderData && (
          <div className="checkout-status__order">
            <h2>Detalle de la orden</h2>
            <div className="checkout-status__order-data">
              <p>
                <strong>{orderData.product.title}</strong>
              </p>
              <p className="muted">
                {formatCurrency(orderData.order.total, orderData.order.currency)}
              </p>
              {orderStatusLabel && (
                <p className="muted">Estado interno: {orderStatusLabel}</p>
              )}
            </div>
          </div>
        )}

        <div className="checkout-status__actions">
          <Link className="cta" to="/profile/orders">
            Ver mis pedidos
          </Link>
          <Link className="ghost" to="/">
            Volver a la tienda
          </Link>
        </div>
      </section>
    </div>
  );
}
