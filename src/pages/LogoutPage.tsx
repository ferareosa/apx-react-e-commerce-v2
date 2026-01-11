import { useEffect } from 'react';
import { Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StoreHeader } from '../components/StoreHeader';
import { useAuth } from '../context/AuthContext';

export function LogoutPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function performLogout() {
      try {
        await logout();
      } catch (error) {
        console.error('No pudimos cerrar tu sesión en Supabase.', error);
      } finally {
        if (active) {
          navigate('/', { replace: true });
        }
      }
    }

    performLogout();

    return () => {
      active = false;
    };
  }, [logout, navigate]);

  return (
    <div className="store-shell logout-page">
      <StoreHeader />
      <section className="panel stack gap-md">
        <p className="muted">
          <Loader className="spin" size={18} /> Cerrando tu sesión…
        </p>
      </section>
    </div>
  );
}
