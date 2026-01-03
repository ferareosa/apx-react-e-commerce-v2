import { Navigate, Route, Routes } from 'react-router-dom';
import { CartPage } from './pages/CartPage';
import { LoginPage } from './pages/LoginPage';
import { OrdersPage } from './pages/OrdersPage';
import { StorefrontPage } from './pages/StorefrontPage';
import { AccountPage } from './pages/AccountPage';
import { CheckoutStatusPage } from './pages/CheckoutStatusPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StorefrontPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/orders" element={<Navigate to="/pedidos" replace />} />
      <Route path="/pedidos" element={<OrdersPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout/success" element={<CheckoutStatusPage />} />
      <Route path="/checkout/failure" element={<CheckoutStatusPage />} />
      <Route path="/checkout/pending" element={<CheckoutStatusPage />} />
    </Routes>
  );
}
