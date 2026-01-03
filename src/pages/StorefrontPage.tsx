import { useState } from 'react';
import { SearchPanel } from '../components/SearchPanel';
import { HeroSection } from '../components/HeroSection';
import { StoreHeader } from '../components/StoreHeader';
import { ProductMosaic } from '../components/ProductMosaic';
import type { Product } from '../types';

export function StorefrontPage() {
  const [mosaicItems, setMosaicItems] = useState<Product[]>([]);

  return (
    <div className="store-shell">
      <StoreHeader />
      <HeroSection />
      <section className="store-layout" id="catalog">
        <div className="store-main">
          <SearchPanel onProductsChange={setMosaicItems} />
          <ProductMosaic items={mosaicItems} />
        </div>
      </section>
    </div>
  );
}
