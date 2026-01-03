import { Wallet } from '@mercadopago/sdk-react';
import { useMutation } from '@tanstack/react-query';
import { CreditCard, Loader, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { CartItem } from '../context/CartContext';
import type { Address } from '../types';
import { api } from '../lib/api-client';
import { formatCurrency } from '../lib/formatters';
import { ensureMercadoPagoInitialized } from '../lib/mercadopago';
import { supabase } from '../lib/supabase';
import { StoreHeader } from '../components/StoreHeader';

export function CartPage() {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { items, totalItems, updateQuantity, removeItem, clearCart } = useCart();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [walletPreferences, setWalletPreferences] = useState<
    Array<{ preferenceId: string; orderId: string; productName: string; paymentUrl: string }>
  >([]);

  const mpPublicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
  const isWalletReady = Boolean(mpPublicKey);

  useEffect(() => {
    ensureMercadoPagoInitialized(mpPublicKey);
  }, [mpPublicKey]);

  const totalsByCurrency = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      const currency = item.product.currency;
      acc[currency] = (acc[currency] ?? 0) + item.product.price * item.quantity;
      return acc;
    }, {});
  }, [items]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const checkoutMutation = useMutation({
    mutationFn: async (cartItem: CartItem) => {
      if (!token) {
        throw new Error('Necesitás iniciar sesión antes de completar la compra.');
      }
      return api.createOrder(token, cartItem.product.id);
    }
  });

  const handleCheckout = async () => {
    setFeedback(null);
    if (!items.length) {
      setFeedback('Tu carrito está vacío.');
      return;
    }
    if (!token) {
      setFeedback('Necesitás iniciar sesión para finalizar la compra.');
      return;
    }

    let shippingRecord: Partial<Address> | null = null;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.warn('No pudimos validar Supabase antes del checkout', error);
      } else {
        const metadata = (data.user?.user_metadata ?? {}) as { address?: Partial<Address> };
        if (metadata.address) {
          shippingRecord = metadata.address as Partial<Address>;
        }
      }
    } catch (error) {
      console.warn('Fallo al obtener metadata desde Supabase', error);
    }

    const fallbackAddress = user?.address ?? null;
    const shippingData = shippingRecord ?? fallbackAddress;

    const hasShippingData = Boolean(
      shippingData &&
        shippingData.street &&
        shippingData.city &&
        shippingData.state &&
        shippingData.zipCode &&
        shippingData.country
    );

    if (!hasShippingData) {
      setFeedback('Necesitamos tus datos de envío antes de continuar. Completalos en tu perfil.');
      navigate('/account', { state: { from: location.pathname, reason: 'missing-shipping' } });
      return;
    }

    if (shippingRecord && token) {
      const normalizedAddress: Address = {
        street: shippingRecord.street!.trim(),
        number: shippingRecord.number?.trim() || undefined,
        city: shippingRecord.city!.trim(),
        state: shippingRecord.state!.trim(),
        zipCode: shippingRecord.zipCode!.trim(),
        country: shippingRecord.country!.trim(),
        reference: shippingRecord.reference?.trim() || undefined
      };

      try {
        await api.updateAddress(token, normalizedAddress);
      } catch (error) {
        console.warn('No pudimos sincronizar tu dirección con el backend antes del checkout', error);
      }
    }
    try {
      const cartSnapshot = [...items];
      let generatedOrders = 0;
      let firstCheckoutUrl: string | null = null;

      for (const item of cartSnapshot) {
        const result = await checkoutMutation.mutateAsync(item);
        generatedOrders += 1;

        removeItem(item.product.id);

        const preferenceId = result.preferenceId ?? result.paymentReference;
        if (preferenceId) {
          setWalletPreferences((prev) => {
            if (prev.some((entry) => entry.preferenceId === preferenceId)) {
              return prev;
            }
            return [
              ...prev,
              {
                preferenceId,
                orderId: result.orderId,
                productName: item.product.title,
                paymentUrl: result.paymentUrl
              }
            ];
          });
        }

        if (!firstCheckoutUrl && result.paymentUrl) {
          firstCheckoutUrl = result.paymentUrl;
        }
      }

      if (generatedOrders > 0) {
        
        if (firstCheckoutUrl) {
          window.open(firstCheckoutUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos completar la compra.';
      setFeedback(message);
    }
  };

  return (
    <div className="store-shell cart-page">
      <StoreHeader />
      <section className="cart-page__content">
        <div className="cart-page__items">
          <header className="cart-page__intro">
            <p className="hero-kicker">Carrito de compras</p>
            <h1>Resumen de piezas</h1>
            <p className="muted">
              {totalItems > 0
                ? `Tenés ${totalItems} piezas listas para ${user?.name ?? user?.email ?? 'tu cuenta'}.`
                : 'Todavía no sumaste productos. Navegá la colección y agregá tus favoritos.'}
            </p>
          </header>

          {items.length === 0 ? (
            <p className="muted">Tu carrito está vacío.</p>
          ) : (
            <div className="stack gap-md">
              {items.map((item) => (
                <article className="cart-item" key={item.product.id}>
                  <div className="cart-item__info">
                    <h3>{item.product.title}</h3>
                    <p className="muted">{item.product.summary}</p>
                    <span className="price">{formatCurrency(item.product.price, item.product.currency)}</span>
                  </div>
                  <div className="cart-item__actions">
                    <div className="quantity-pill">
                      <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <button className="ghost" type="button" onClick={() => removeItem(item.product.id)}>
                      <Trash2 size={16} /> Quitar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="cart-page__summary">
          <h2>
            <ShoppingCart size={20} /> Total del carrito
          </h2>
          <p className="muted">Incluye impuestos estimados. Confirmaremos el costo final al generar la orden.</p>
          <div className="cart-total">
            {Object.entries(totalsByCurrency).length === 0
              ? formatCurrency(0, 'USD')
              : Object.entries(totalsByCurrency).map(([currency, amount]) => (
                  <span key={currency}>{formatCurrency(amount, currency)}</span>
                ))}
          </div>
          <button className="cta" type="button" onClick={handleCheckout} disabled={!items.length || checkoutMutation.isPending}>
            {checkoutMutation.isPending ? <Loader className="spin" size={18} /> : <CreditCard size={18} />}
            Pagar
          </button>
          <button className="ghost" type="button" onClick={clearCart} disabled={!items.length}>
            Vaciar carrito
          </button>
          {feedback && <p className="feedback ghost">{feedback}</p>}
          {walletPreferences.length > 0 && (
            <div className="cart-wallet">
              <h3>Pagá tus órdenes ahora</h3>
              {!isWalletReady && (
                <p className="feedback ghost">
                  Configurá VITE_MP_PUBLIC_KEY para renderizar el botón de Mercado Pago sin salir del sitio.
                </p>
              )}
              {walletPreferences.map((entry) => (
                <div className="cart-wallet__item" key={entry.orderId}>
                  <div className="cart-wallet__info">
                    <span>Orden {entry.orderId}</span>
                    <span className="muted">{entry.productName}</span>
                  </div>
                  {isWalletReady ? (
                    <Wallet
                      initialization={{ preferenceId: entry.preferenceId }}
                      customization={{ valueProp: 'convenience_all' }}
                    />
                  ) : (
                    <a
                      className="cta ghost"
                      href={entry.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir checkout de Mercado Pago
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
