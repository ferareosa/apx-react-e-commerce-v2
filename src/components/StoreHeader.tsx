import { ArrowUpRight, LogOut, PackageCheck, ShoppingCart, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export function StoreHeader() {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === '/login';
  const ordersPath = '/pedidos';
  const isOrdersPage = location.pathname === '/orders' || location.pathname === ordersPath;
  const isAccountPage = location.pathname === '/account';
  const isCartPage = location.pathname === '/cart';
  const { totalItems } = useCart();

  const hasSession = isAuthenticated;
  const ordersLinkState = hasSession ? undefined : { from: { pathname: ordersPath } };
  const ordersDestination = hasSession ? ordersPath : '/login';
  const isOrdersEntryActive = hasSession ? isOrdersPage : isLoginPage;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('No pudimos cerrar tu sesión en Supabase.', error);
    } finally {
      navigate('/', { replace: true });
    }
  };

  return (
    <header className="store-header">
      <Link className="brand-mark" to="/" aria-label="Ir al inicio">
        <span>Casa</span>
        <strong>Boulevard</strong>
      </Link>

      <div className="header-actions">
        {user ? (
          <>
            <Link
              className="header-pill"
              to="/account"
              aria-current={isAccountPage ? 'page' : undefined}
              data-active={isAccountPage ? 'true' : undefined}
            >
              <User size={16} /> Mis datos
            </Link>
            <button className="header-pill" type="button" onClick={handleLogout}>
              <LogOut size={16} /> Salir
            </button>
          </>
        ) : (
          <Link
            className="header-pill"
            to="/login"
            aria-current={isLoginPage ? 'page' : undefined}
            data-active={isLoginPage ? 'true' : undefined}
          >
            <User size={16} /> Ingresar
          </Link>
        )}
        <Link
          className={`header-pill accent${isOrdersEntryActive ? ' active' : ''}`}
          to={ordersDestination}
          state={ordersLinkState}
          aria-current={isOrdersEntryActive ? 'page' : undefined}
          data-active={isOrdersEntryActive ? 'true' : undefined}
        >
          <PackageCheck size={16} /> Mis pedidos
          <ArrowUpRight size={14} />
        </Link>
        <Link
          className="header-pill accent cart-pill"
          to="/cart"
          aria-current={isCartPage ? 'page' : undefined}
          data-active={isCartPage ? 'true' : undefined}
        >
          <ShoppingCart size={16} /> Carrito
          {totalItems > 0 && <span className="cart-pill__count">{totalItems}</span>}
        </Link>
      </div>
    </header>
  );
}
