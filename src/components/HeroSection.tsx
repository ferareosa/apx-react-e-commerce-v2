import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function HeroSection() {
  const { user } = useAuth();

  return (
    <section className="hero-section">
      <div className="hero-copy">
        <p className="hero-kicker">Colección AW25 · Sastrería moderna</p>
        <h1>
          Prendas esenciales
          <span>pensadas para la ciudad.</span>
        </h1>
        <p>
          Siluetas relajadas, paleta cálida y telas italianas con caída perfecta. Conectá tu cuenta, guardá tus
          medidas y gestioná pedidos directo desde el showroom digital.
        </p>
        <div className="hero-ctas">
          <a href="#catalog" className="cta hero-primary">
            Ver colección <ArrowRight size={18} />
          </a>
          <a href="#account" className="ghost hero-secondary">
            {user ? 'Actualizar perfil' : 'Unirme al club'}
          </a>
        </div>
      </div>
      <figure className="hero-figure">
        <div className="hero-photo" role="presentation" />
        <figcaption>Editorial Palermo · 18° · Luz dorada</figcaption>
      </figure>
    </section>
  );
}
