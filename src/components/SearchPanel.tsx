import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api-client';
import { useDebounce } from '../hooks/useDebounce';
import {
  getAlgoliaIndexName,
  isAlgoliaSearchConfigured,
  searchEditorialLooks,
  type EditorialLook,
  type EditorialSearchPayload
} from '../lib/algolia-search';
import type { Product, SearchResponse } from '../types';

type SearchQueryResult =
  | ({ mode: 'algolia' } & EditorialSearchPayload)
  | ({ mode: 'api' } & SearchResponse);

const ALGOLIA_ENABLED = isAlgoliaSearchConfigured();
const ALGOLIA_INDEX = getAlgoliaIndexName();

type SearchPanelProps = {
  onProductsChange?: (items: Product[]) => void;
};

export function SearchPanel(props: SearchPanelProps = {}) {
  const { onProductsChange } = props;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todo');
  const categories = ['Todo', 'Sastrería', 'Denim', 'Edición limitada', 'Weekend'];
  const effectiveQuery = category === 'Todo' ? query : `${query} ${category.toLowerCase()}`;
  const debounced = useDebounce(effectiveQuery, 350);
  const searchMode: 'algolia' | 'api' = ALGOLIA_ENABLED ? 'algolia' : 'api';

  const searchEnabled = true;

  const searchResult = useQuery<SearchQueryResult>({
    queryKey: ['search', debounced, searchMode],
    queryFn: async () => {
      if (searchMode === 'algolia') {
        const payload = await searchEditorialLooks(debounced, 6);
        return { mode: 'algolia', ...payload } as const;
      }
      const payload = await api.searchProducts(debounced, 0, 6);
      return { mode: 'api', ...payload } as const;
    },
    enabled: searchEnabled
  });

  const syncCopy = useMemo(() => {
    if (!searchResult.data) return null;
    if (searchResult.data.mode === 'algolia') {
      const total = searchResult.data.total;
      const availabilityCopy = total === 1 ? ' disponible' : ' disponibles';
      const indexCopy = ALGOLIA_INDEX ? ` en ${ALGOLIA_INDEX}` : '';
      return `Algolia · ${total} looks editoriales${availabilityCopy}${indexCopy}`;
    }
    const { syncSource } = searchResult.data;
    const provider = syncSource.mode === 'algolia' ? 'Algolia live' : 'réplica local';
    return `${syncSource.filteredForStock}/${syncSource.airtableRecords} listos (${provider}: ${syncSource.algoliaHits} hits)`;
  }, [searchResult.data]);

  const showAlgoliaHits = searchResult.data?.mode === 'algolia';
  const algoliaItems = searchResult.data?.mode === 'algolia' ? searchResult.data.items : null;
  const catalogItems = searchResult.data?.mode === 'api' ? searchResult.data.items : null;
  const hasResults = Boolean((algoliaItems && algoliaItems.length > 0) || (catalogItems && catalogItems.length > 0));

  useEffect(() => {
    if (!onProductsChange) {
      return;
    }

    if (!searchResult.data) {
      onProductsChange([]);
      return;
    }

    if (searchResult.data.mode === 'api') {
      onProductsChange(searchResult.data.items ?? []);
      return;
    }

    if (searchResult.data.mode === 'algolia') {
      const bridgedProducts = searchResult.data.items.map(normalizeEditorialLookToProduct);
      onProductsChange(bridgedProducts);
      return;
    }

    onProductsChange([]);
  }, [searchResult.data, onProductsChange]);

  return (
    <section className="panel catalog-panel">
      <header className="catalog-header search-header">
        <div className="search-bar full">
          <Search size={20} />
          <input
            type="search"
            placeholder="vestidos linos, blazer crudo, denim..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span>{searchResult.isFetching ? 'Buscando…' : searchMode === 'algolia' ? 'Algolia live' : 'Editorial lista'}</span>
        </div>
      </header>

      {syncCopy && (
        <p className="muted search-meta">
          {showAlgoliaHits && <Sparkles size={14} />} {syncCopy}
        </p>
      )}

      <div className="catalog-controls">
        <div className="category-chips" role="tablist">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={clsx('chip', { active: category === item })}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {searchResult.error && (
        <p className="feedback error">No pudimos buscar: {(searchResult.error as Error).message}</p>
      )}

      {!hasResults && (
        <p className="muted">Empezá a escribir para disparar la búsqueda.</p>
      )}
    </section>
  );
}

function normalizeEditorialLookToProduct(look: EditorialLook): Product {
  const gallery = look.gallery && look.gallery.length > 0 ? look.gallery : [look.heroImage];

  return {
    id: look.objectID || look.sku,
    sku: look.sku,
    title: look.title,
    summary: look.summary,
    description: look.description,
    price: look.price,
    currency: look.currency,
    stock: look.stock,
    tags: look.tags,
    heroImage: look.heroImage,
    gallery,
    metadata: {
      category: look.categories[0] ?? look.metadata.collection ?? 'Editorial',
      shippingEstimateDays: look.shipping.leadTimeDays ?? 0,
      location: look.shipping.region ?? look.metadata.collection ?? 'Editorial',
      featured: true
    },
    createdAt: look.createdAt,
    updatedAt: look.updatedAt
  };
}
