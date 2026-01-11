import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Loader, ShoppingCart, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StoreHeader } from '../components/StoreHeader';
import { useCart } from '../context/CartContext';
import { api } from '../lib/api-client';
import { formatCurrency } from '../lib/formatters';

export function ProductDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { items, addItem, removeItem } = useCart();

  const productQuery = useQuery({
    queryKey: ['product-detail', itemId],
    queryFn: () => api.getProduct(itemId!),
    enabled: Boolean(itemId)
  });

  const product = productQuery.data?.product;
  const inCart = useMemo(() => (product ? items.some((entry) => entry.product.id === product.id) : false), [items, product]);

  if (!itemId) {
    return (
      <div className="store-shell">
        <StoreHeader />
        <section className="panel stack gap-md">
          <p className="feedback error">Identificador de producto faltante.</p>
          <Link className="ghost" to="/">
            <ArrowLeft size={16} /> Volver al inicio
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="store-shell">
      <StoreHeader />
      <section className="store-layout">
        <div className="store-main">
          <article className="panel stack gap-lg">
            {productQuery.isLoading ? (
              <div className="stack gap-md">
                <Loader className="spin" size={24} />
                <p className="muted">Cargando la ficha del producto…</p>
              </div>
            ) : productQuery.isError ? (
              <div className="stack gap-md">
                <p className="feedback error">No pudimos recuperar este producto.</p>
                <Link className="ghost" to="/">
                  <ArrowLeft size={16} /> Volver a la tienda
                </Link>
              </div>
            ) : product ? (
              <div className="stack gap-lg">
                <div>
                  <img src={product.heroImage} alt={product.title} loading="lazy" />
                </div>
                <div className="stack gap-md">
                  <div className="stack gap-xxs">
                    <p className="hero-kicker">{product.metadata.category}</p>
                    <h1>{product.title}</h1>
                    <p className="muted">{product.summary}</p>
                  </div>
                  <p>{product.description}</p>
                  <strong>{formatCurrency(product.price, product.currency)}</strong>
                  <div className="stack gap-xxs">
                    <small className="muted">Disponibles: {product.stock}</small>
                    <small className="muted">Entrega estimada: {product.metadata.shippingEstimateDays} días</small>
                  </div>
                  <div className="stack gap-sm">
                    <button
                      className={`cta ${inCart ? 'danger' : 'accent'}`}
                      type="button"
                      onClick={() => (inCart ? removeItem(product.id) : addItem(product))}
                    >
                      {inCart ? <Trash2 size={18} /> : <ShoppingCart size={18} />}
                      {inCart ? 'Quitar del carrito' : 'Agregar al carrito'}
                    </button>
                    <button
                      className="cta"
                      type="button"
                      onClick={() => navigate(`/checkout/${product.id}`)}
                    >
                      <CreditCard size={18} /> Comprar ahora
                    </button>
                  </div>
                  <Link className="ghost" to="/">
                    <ArrowLeft size={16} /> Seguir explorando
                  </Link>
                </div>
              </div>
            ) : (
              <div className="stack gap-md">
                <p className="feedback error">Este producto no está disponible.</p>
                <Link className="ghost" to="/">
                  <ArrowLeft size={16} /> Volver a la tienda
                </Link>
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
