import { Navigate, Route, Routes } from 'react-router-dom';
import { CartPage } from './pages/CartPage';
import { LoginPage } from './pages/LoginPage';
import { OrdersPage } from './pages/OrdersPage';
import { StorefrontPage } from './pages/StorefrontPage';
import { AccountPage } from './pages/AccountPage';
import { CheckoutStatusPage } from './pages/CheckoutStatusPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LogoutPage } from './pages/LogoutPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StorefrontPage />} />
      <Route path="/search" element={<StorefrontPage />} />
      <Route path="/signin" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/signin" replace />} />
      <Route path="/profile" element={<AccountPage />} />
      <Route path="/account" element={<Navigate to="/profile" replace />} />
      <Route path="/profile/orders" element={<OrdersPage />} />
      <Route path="/orders" element={<Navigate to="/profile/orders" replace />} />
      <Route path="/pedidos" element={<Navigate to="/profile/orders" replace />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/item/:itemId" element={<ProductDetailPage />} />
      <Route path="/checkout/:itemId" element={<CheckoutPage />} />
      <Route path="/thanks" element={<CheckoutStatusPage />} />
      <Route path="/logout" element={<LogoutPage />} />
    </Routes>
  );
}
