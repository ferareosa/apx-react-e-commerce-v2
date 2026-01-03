import { ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/formatters';
import type { Product } from '../types';

type ProductMosaicProps = {
  items: Product[];
};

export function ProductMosaic({ items }: ProductMosaicProps) {
  const { addItem, removeItem, items: cartItems } = useCart();

  if (!items.length) {
    return (
      <div className="product-mosaic placeholder">
        <p className="muted">Usá el buscador para poblar el mosaico editorial.</p>
      </div>
    );
  }

  return (
    <div className="product-mosaic-container">
      <div className="product-mosaic">
        {items.map((product) => {
          const inCart = cartItems.some((entry) => entry.product.id === product.id);
          const handleClick = () => (inCart ? removeItem(product.id) : addItem(product));

          return (
            <article key={product.id} className="mosaic-card">
              <div className="mosaic-card__image">
                <img src={product.heroImage} alt={product.title} loading="lazy" />
              </div>
              <div className="mosaic-card__media" aria-hidden="true">
                <span>{product.metadata.category}</span>
              </div>
              <div className="mosaic-card__content">
                <header>
                  <p className="muted">{product.sku}</p>
                  <h3>{product.title}</h3>
                </header>
                <p className="muted">{product.summary}</p>
                <strong>{formatCurrency(product.price, product.currency)}</strong>
                <button
                  className={inCart ? 'cta danger' : 'cta accent'}
                  type="button"
                  onClick={handleClick}
                >
                  {inCart ? <Trash2 size={16} /> : <ShoppingCart size={16} />}
                  {inCart ? 'Eliminar' : 'Añadir al carrito'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
