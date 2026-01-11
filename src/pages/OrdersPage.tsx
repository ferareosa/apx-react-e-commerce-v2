import { Navigate, useLocation } from 'react-router-dom';
import { OrdersPanel } from '../components/OrdersPanel';
import { StoreHeader } from '../components/StoreHeader';
import { useAuth } from '../context/AuthContext';

export function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return (
    <div className="store-shell orders-page">
      <StoreHeader />
      <section className="orders-page__content">
        <OrdersPanel />
      </section>
    </div>
  );
}
