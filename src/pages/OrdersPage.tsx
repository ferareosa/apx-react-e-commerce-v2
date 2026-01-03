import { Navigate, useLocation } from 'react-router-dom';
import { OrdersPanel } from '../components/OrdersPanel';
import { StoreHeader } from '../components/StoreHeader';
import { useAuth } from '../context/AuthContext';

export function OrdersPage() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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
