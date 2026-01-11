import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CreditCard, Loader, ShieldCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { StoreHeader } from '../components/StoreHeader';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api-client';
import { formatCurrency } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import type { Address } from '../types';

const STATUS_REDIRECTS = new Set(['success', 'failure', 'pending']);

export function CheckoutPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user, isAuthenticated } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);

  const normalizedId = (itemId ?? '').toLowerCase();

  if (itemId && STATUS_REDIRECTS.has(normalizedId)) {
    const params = new URLSearchParams(location.search);
    if (!params.has('status')) {
      params.set('status', normalizedId);
    }
    const nextSearch = params.toString();
    return <Navigate to={`/thanks${nextSearch ? `?${nextSearch}` : ''}`} replace />;
  }

  if (!itemId) {
    return <Navigate to="/" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  const productQuery = useQuery({
    queryKey: ['checkout-product', itemId],
    queryFn: () => api.getProduct(itemId),
    enabled: Boolean(itemId)
  });

  const product = productQuery.data?.product ?? null;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!token || !product) {
        throw new Error('Necesitamos validar tu sesión antes de continuar.');
      }
      return api.createOrder(token, product.id);
    }
  });

  const isBusy = productQuery.isLoading || checkoutMutation.isPending;

  useEffect(() => {
    if (productQuery.isError) {
      setFeedback('No pudimos preparar el checkout para este producto.');
    }
  }, [productQuery.isError]);

  const shippingData = useMemo(() => user?.address ?? null, [user?.address]);

  const handleCheckout = async () => {
    if (!product || !token) {
      setFeedback('No encontramos el producto solicitado.');
      return;
    }

    setFeedback(null);

    let sessionAddress: Partial<Address> | null = null;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error) {
        const metadata = (data.user?.user_metadata ?? {}) as { address?: Partial<Address> };
        if (metadata.address) {
          sessionAddress = metadata.address;
        }
      }
    } catch (error) {
      console.warn('No pudimos verificar la dirección guardada antes del checkout', error);
    }

    const activeAddress = sessionAddress ?? shippingData;
    const hasShippingData = Boolean(
      activeAddress &&
      activeAddress.street &&
      activeAddress.city &&
      activeAddress.state &&
      activeAddress.zipCode &&
      activeAddress.country
    );

    if (!hasShippingData) {
      setFeedback('Necesitamos tus datos de envío antes de continuar. Completalos en tu perfil.');
      navigate('/profile', { state: { from: location.pathname, reason: 'missing-shipping' } });
      return;
    }

    if (sessionAddress && token) {
      const normalizedAddress: Address = {
        street: sessionAddress.street!.trim(),
        number: sessionAddress.number?.trim() || undefined,
        city: sessionAddress.city!.trim(),
        state: sessionAddress.state!.trim(),
        zipCode: sessionAddress.zipCode!.trim(),
        country: sessionAddress.country!.trim(),
        reference: sessionAddress.reference?.trim() || undefined
      };

      try {
        await api.updateAddress(token, normalizedAddress);
      } catch (error) {
        console.warn('No pudimos sincronizar tu dirección antes del checkout', error);
      }
    }

    try {
      const result = await checkoutMutation.mutateAsync();
      setFeedback('Generamos tu orden. Abriremos el pago en una nueva pestaña.');
      if (result.paymentUrl) {
        window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos iniciar el checkout.';
      setFeedback(message);
    }
  };

  return (
    <div className="store-shell">
      <StoreHeader />
      <section className="store-layout">
        <div className="store-main">
          <article className="panel stack gap-lg">
            <header className="stack gap-xxs">
              <p className="panel-kicker">Checkout rápido</p>
              <h1>Confirmá tu pago</h1>
              <p className="muted">Preparamos la orden para que completes el pago desde Mercado Pago.</p>
            </header>

            {productQuery.isLoading ? (
              <div className="stack gap-sm">
                <Loader className="spin" size={20} />
                <p className="muted">Cargando datos del producto…</p>
              </div>
            ) : product ? (
              <div className="stack gap-md">
                <div className="stack gap-xxs">
                  <p className="muted">{product.metadata.category}</p>
                  <h2>{product.title}</h2>
                  <p>{product.summary}</p>
                </div>
                <strong>{formatCurrency(product.price, product.currency)}</strong>
                <div className="stack gap-xxs">
                  <small className="muted">Stock disponible: {product.stock}</small>
                  <small className="muted">Entrega estimada: {product.metadata.shippingEstimateDays} días</small>
                </div>
              </div>
            ) : (
              <p className="feedback error">Este producto no está disponible para checkout directo.</p>
            )}

            <button className="cta" type="button" onClick={handleCheckout} disabled={!product || isBusy}>
              {checkoutMutation.isPending ? <Loader className="spin" size={18} /> : <CreditCard size={18} />}
              Iniciar pago
            </button>

            {feedback && (
              <p className={checkoutMutation.isError ? 'feedback error' : 'feedback ghost'}>{feedback}</p>
            )}

            <div className="stack gap-xxs">
              <small className="muted">
                <ShieldCheck size={14} /> Usamos tu dirección guardada para coordinar el envío.
              </small>
              <small className="muted">Podés actualizarla desde tu perfil en cualquier momento.</small>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
