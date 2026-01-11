import { useCallback, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { SearchPanel } from '../components/SearchPanel';
import { HeroSection } from '../components/HeroSection';
import { StoreHeader } from '../components/StoreHeader';
import { ProductMosaic } from '../components/ProductMosaic';
import type { Product } from '../types';

export function StorefrontPage() {
  const [mosaicItems, setMosaicItems] = useState<Product[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') ?? '';
  const isSearchRoute = location.pathname === '/search';

  const handleQueryChange = useCallback(
    (value: string) => {
      const hasValue = value.trim().length > 0;
      if (hasValue) {
        const params = new URLSearchParams({ q: value });
        const serialized = params.toString();
        if (!isSearchRoute) {
          navigate(`/search?${serialized}`, { replace: false });
        } else {
          setSearchParams({ q: value }, { replace: false });
        }
      } else if (isSearchRoute) {
        navigate('/', { replace: false });
      } else {
        setSearchParams({}, { replace: true });
      }
    },
    [isSearchRoute, navigate, setSearchParams]
  );

  return (
    <div className="store-shell">
      <StoreHeader />
      <HeroSection />
      <section className="store-layout" id="catalog">
        <div className="store-main">
          <SearchPanel
            onProductsChange={setMosaicItems}
            initialQuery={searchQuery}
            onQueryChange={handleQueryChange}
          />
          <ProductMosaic items={mosaicItems} />
        </div>
      </section>
    </div>
  );
}
