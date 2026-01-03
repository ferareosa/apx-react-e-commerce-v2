import { ArrowLeft, CheckCircle, Loader, Mail, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { StoreHeader } from '../components/StoreHeader';
import { useAuth, type AuthStatus } from '../context/AuthContext';

type RouterState = {
  from?: {
    pathname: string;
    search?: string;
    hash?: string;
  };
};

export function LoginPage() {
  const { sendMagicLink, status, lastEmail, isAuthenticated } = useAuth();
  const [email, setEmail] = useState(lastEmail ?? '');
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [stage, setStage] = useState<'form' | 'sent'>('form');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const redirectTarget = useMemo(() => {
    const from = (location.state as RouterState | undefined)?.from;
    if (!from) return '/pedidos';
    return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;
  }, [location.state]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  const handleSendLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Necesitamos un email para enviarte el enlace.');
      return;
    }
    setError(null);
    setFeedback(null);
    setIsSending(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await sendMagicLink(normalizedEmail);
      setActiveEmail(normalizedEmail);
      setStage('sent');
      setFeedback('Te enviamos un enlace mágico. Abrilo desde tu email para completar el acceso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos mandar el enlace. Intentá de nuevo.';
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async () => {
    if (!activeEmail) return;
    setError(null);
    setFeedback(null);
    setIsSending(true);
    try {
      await sendMagicLink(activeEmail);
      setFeedback(`Reenviamos el enlace a ${activeEmail}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos reenviar el enlace.';
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleChangeEmail = () => {
    setStage('form');
    setActiveEmail(null);
    setFeedback(null);
    setError(null);
  };

  const statusLabels: Record<AuthStatus, string> = {
    idle: 'Listo para ingresar',
    checking: 'Esperando confirmación',
    authenticated: 'Sesión activa',
    error: 'Necesita atención'
  };

  const statusLabel = statusLabels[status];
  return (
    <div className="store-shell login-page">
      <StoreHeader />
      <main className="login-page__content">
        <section className="login-page__intro">
          <p className="hero-kicker">Club Boulevard</p>
          <h1>Ingresá a tu guardarropa digital</h1>
            <p className="muted">
              Confirmamos tu identidad con códigos temporales. Guardamos tus direcciones y preferencias para acelerar
              futuros pedidos.
            </p>
          <ul className="login-page__benefits">
            <li>
              <ShieldCheck size={18} /> Protección con verificación en dos pasos
            </li>
            <li>
              <ShieldCheck size={18} /> Seguimiento de pedidos y facturas en un mismo lugar
            </li>
            <li>
              <ShieldCheck size={18} /> Acceso prioritario a nuevas entregas y drops
            </li>
          </ul>
          <Link className="ghost" to="/">
            <ArrowLeft size={16} /> Volver a la tienda
          </Link>
        </section>

        <section className="login-page__panel">
          <article className="panel login-stage">
            <header className="identity-header">
              <div>
                <p className="panel-kicker">Identidad</p>
                <h2>{stage === 'form' ? 'Recibí un enlace seguro' : 'Revisá tu bandeja de entrada'}</h2>
              </div>
              <span className="status-pill">{statusLabel}</span>
            </header>

            {stage === 'form' ? (
              <form className="stack gap-md" onSubmit={handleSendLink}>
                <label className="field" htmlFor="email">
                  Email
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tumejorlook@ejemplo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
                <button className="cta" type="submit" disabled={isSending}>
                  {isSending ? <Loader className="spin" size={18} /> : <Mail size={18} />}
                  Enviarme un enlace mágico
                </button>
                <p className="muted">Te enviaremos un enlace mágico. Abrilo desde tu email para confirmar el acceso.</p>
              </form>
            ) : (
              <div className="magic-link-state">
                <p>
                  Enviamos un enlace seguro a <strong>{activeEmail}</strong>. Abrilo desde tu correo para completar el
                  ingreso.
                </p>
                <p className="muted">
                  Una vez que confirmes el email, te redirigiremos automáticamente. Si no te llega, verificá la carpeta
                  de SPAM.
                </p>
                <div className="magic-link-actions">
                  <button className="cta outline" type="button" onClick={handleResend} disabled={isSending}>
                    {isSending ? <Loader className="spin" size={16} /> : <RefreshCcw size={16} />}
                    Reenviar enlace
                  </button>
                  <button className="ghost" type="button" onClick={handleChangeEmail}>
                    Cambiar email
                  </button>
                </div>
                <p className="muted">Tip: abrí el enlace desde el mismo dispositivo para ingresar más rápido.</p>
              </div>
            )}

            {feedback && (
              <p className="feedback success">
                <CheckCircle size={18} /> {feedback}
              </p>
            )}
            {error && (
              <p className="feedback error">
                {error}
              </p>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
