import { Loader } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { StoreHeader } from '../components/StoreHeader';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type ProfileForm = {
  name: string;
  phone: string;
};

type AddressForm = {
  street: string;
  number: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  reference: string;
};

type UserMetadata = {
  name?: string | null;
  phone?: string | null;
  address?: Partial<AddressForm> | null;
};

export function AccountPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [accountEmail, setAccountEmail] = useState('');
  const [profileForm, setProfileForm] = useState<ProfileForm>({ name: '', phone: '' });
  const [addressForm, setAddressForm] = useState<AddressForm>({
    street: '',
    number: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    reference: ''
  });
  const [metadata, setMetadata] = useState<UserMetadata>({});
  const [isLoading, setIsLoading] = useState(true);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [addressFeedback, setAddressFeedback] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const applyMetadata = useCallback((meta: UserMetadata) => {
    setMetadata(meta ?? {});
    setProfileForm({
      name: meta?.name ? String(meta.name) : '',
      phone: meta?.phone ? String(meta.phone) : ''
    });
    const addressMeta = meta?.address ?? {};
    setAddressForm({
      street: addressMeta?.street ?? '',
      number: addressMeta?.number ?? '',
      city: addressMeta?.city ?? '',
      state: addressMeta?.state ?? '',
      zipCode: addressMeta?.zipCode ?? '',
      country: addressMeta?.country ?? '',
      reference: addressMeta?.reference ?? ''
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          throw error;
        }
        if (!data?.user) {
          throw new Error('No encontramos tu usuario en Supabase.');
        }
        if (cancelled) return;

        setAccountEmail(data.user.email ?? '');
        applyMetadata((data.user.user_metadata as UserMetadata) ?? {});
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'No pudimos cargar tus datos desde Supabase.';
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [applyMetadata]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileFeedback(null);
    setProfileError(null);
    setIsSavingProfile(true);
    try {
      const payload: Record<string, string> = {};
      if (profileForm.name.trim()) {
        payload.name = profileForm.name.trim();
      }
      if (profileForm.phone.trim()) {
        payload.phone = profileForm.phone.trim();
      }
      if (Object.keys(payload).length === 0) {
        throw new Error('Completá al menos un campo para actualizar.');
      }
      const nextMetadata: UserMetadata = {
        ...metadata,
        name: payload.name ?? '',
        phone: payload.phone ?? ''
      };
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          name: nextMetadata.name,
          phone: nextMetadata.phone,
          address: nextMetadata.address ?? metadata.address ?? null
        }
      });
      if (error) {
        throw error;
      }
      applyMetadata((data.user?.user_metadata as UserMetadata) ?? nextMetadata);
      setProfileFeedback('Actualizamos tus datos.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos guardar los cambios.';
      setProfileError(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddressSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddressFeedback(null);
    setAddressError(null);
    setIsSavingAddress(true);
    try {
      const cleanedAddress = {
        street: addressForm.street.trim(),
        number: addressForm.number.trim() || '',
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        zipCode: addressForm.zipCode.trim(),
        country: addressForm.country.trim(),
        reference: addressForm.reference.trim() || ''
      };
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          address: cleanedAddress
        }
      });
      if (error) {
        throw error;
      }
      applyMetadata((data.user?.user_metadata as UserMetadata) ?? { ...metadata, address: cleanedAddress });
      setAddressFeedback('Guardamos tu dirección principal.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos actualizar la dirección.';
      setAddressError(message);
    } finally {
      setIsSavingAddress(false);
    }
  };

  return (
    <div className="store-shell account-page">
      <StoreHeader />
      <section className="account-page__content stack gap-xl">
        <article className="panel account-card stack gap-md">
          <header>
            <p className="hero-kicker">Perfil</p>
            <h1>Mis datos</h1>
            <p className="muted">Sincronizamos esta información directo con Supabase para mantener tu acceso seguro.</p>
          </header>

          <dl className="data-list compact">
            <div>
              <dt>Email</dt>
              <dd>{accountEmail || 'Sin email'}</dd>
            </div>
          </dl>
          {loadError ? <p className="feedback error">{loadError}</p> : null}
        </article>

        <div className="account-page__grid">
          <article className="panel stack gap-md">
            <header className="stack gap-xxs">
              <p className="panel-kicker">Identidad</p>
              <h2>Datos básicos</h2>
              <p className="muted">Actualizá cómo te mostramos en notificaciones y comprobantes.</p>
            </header>
            <form className="stack gap-md" onSubmit={handleProfileSubmit}>
              <div className="form-grid">
                <label className="field">
                  Nombre completo
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Ada L. Boulevard"
                    disabled={isLoading}
                  />
                </label>
                <label className="field">
                  Teléfono
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="+54 11 1234 5678"
                    disabled={isLoading}
                  />
                </label>
              </div>
              <button className="cta" type="submit" disabled={isSavingProfile || isLoading}>
                {isSavingProfile ? <Loader className="spin" size={16} /> : null}
                {isSavingProfile ? 'Guardando…' : 'Guardar perfil'}
              </button>
              {profileFeedback && <p className="feedback success">{profileFeedback}</p>}
              {profileError && <p className="feedback error">{profileError}</p>}
            </form>
          </article>

          <article className="panel stack gap-md">
            <header className="stack gap-xxs">
              <p className="panel-kicker">Logística</p>
              <h2>Dirección principal</h2>
              <p className="muted">Usamos estos datos para envíos y facturación.</p>
            </header>
            <form className="stack gap-md" onSubmit={handleAddressSubmit}>
              <div className="form-grid">
                <label className="field">
                  Calle
                  <input
                    type="text"
                    value={addressForm.street}
                    onChange={(event) => setAddressForm((prev) => ({ ...prev, street: event.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </label>
                <label className="field">
                  Número
                  <input
                    type="text"
                    value={addressForm.number}
                    onChange={(event) => setAddressForm((prev) => ({ ...prev, number: event.target.value }))}
                    disabled={isLoading}
                  />
                </label>
                <label className="field">
                  Ciudad
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </label>
                <label className="field">
                  Provincia / Estado
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(event) => setAddressForm((prev) => ({ ...prev, state: event.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </label>
                <label className="field">
                  Código postal
                  <input
                    type="text"
                    value={addressForm.zipCode}
                    onChange={(event) => setAddressForm((prev) => ({ ...prev, zipCode: event.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </label>
                <label className="field">
                  País
                  <input
                    type="text"
                    value={addressForm.country}
                    onChange={(event) => setAddressForm((prev) => ({ ...prev, country: event.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </label>
                <label className="field" style={{ gridColumn: '1 / -1' }}>
                  Referencia
                  <textarea
                    rows={2}
                    value={addressForm.reference}
                    onChange={(event) => setAddressForm((prev) => ({ ...prev, reference: event.target.value }))}
                    placeholder="Piso 8, dejar con portería, etc."
                    disabled={isLoading}
                  />
                </label>
              </div>
              <button
                className="cta"
                type="submit"
                disabled={isSavingAddress || isLoading}
                style={{
                  backgroundColor: '#000',
                  color: '#fff',
                  borderColor: '#000',
                  opacity: isSavingAddress ? 0.85 : 1
                }}
              >
                <span className="cta__icon">{isSavingAddress ? <Loader className="spin" size={16} /> : null}</span>
                <span>
                  {isSavingAddress ? 'Guardando dirección…' : 'Actualizar dirección'}
                </span>
              </button>
              {addressFeedback && <p className="feedback success">{addressFeedback}</p>}
              {addressError && <p className="feedback error">{addressError}</p>}
            </form>
          </article>
        </div>
      </section>
    </div>
  );
}
