import { algoliasearch } from 'algoliasearch';

const appId = import.meta.env.VITE_ALGOLIA_APP_ID;
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;
const indexName = import.meta.env.VITE_ALGOLIA_INDEX_NAME;

const hasAlgoliaConfig = Boolean(appId && searchKey && indexName);
const searchClient = hasAlgoliaConfig ? algoliasearch(appId!, searchKey!) : null;

type MeasurementKey = 'bust' | 'waist' | 'hips' | 'length' | 'sleeve';

type SizeGuide = {
  label: string;
  available: boolean;
  measurements: Partial<Record<MeasurementKey, number>>;
};

type ColorSwatch = {
  name: string;
  hex: string;
};

type ShippingInfo = {
  region: string;
  leadTimeDays: number;
  method: string;
};

type LookMetadata = {
  collection: string;
  drop: string;
  occasion: string[];
};

export type EditorialLook = {
  objectID: string;
  sku: string;
  title: string;
  summary: string;
  description: string;
  price: number;
  currency: string;
  categories: string[];
  color: ColorSwatch;
  palette: string[];
  sizes: SizeGuide[];
  materials: string[];
  care: string[];
  season: string[];
  gender: string[];
  fit: 'regular' | 'oversized' | 'tailored';
  stock: number;
  heroImage: string;
  gallery: string[];
  tags: string[];
  shipping: ShippingInfo;
  metadata: LookMetadata;
  createdAt: string;
  updatedAt: string;
};

export type EditorialSearchPayload = {
  items: EditorialLook[];
  total: number;
  query: string;
};

export async function searchEditorialLooks(query: string, limit = 6): Promise<EditorialSearchPayload> {
  if (!searchClient || !indexName) {
    throw new Error('Algolia search is not configured.');
  }

  const trimmed = query.trim();
  // Si la búsqueda está vacía, usar '*' para traer todos los productos
  const finalQuery = trimmed === '' ? '*' : trimmed;

  const safeLimit = Math.max(1, Math.min(limit, 12));
  const response = await searchClient.searchForHits<EditorialLook>({
    requests: [
      {
        indexName,
        query: finalQuery,
        hitsPerPage: safeLimit,
        attributesToRetrieve: [
          'objectID',
          'sku',
          'title',
          'summary',
          'description',
          'price',
          'currency',
          'categories',
          'color',
          'palette',
          'sizes',
          'materials',
          'care',
          'season',
          'gender',
          'fit',
          'stock',
          'heroImage',
          'gallery',
          'tags',
          'shipping',
          'metadata',
          'createdAt',
          'updatedAt'
        ],
        attributesToHighlight: ['title', 'summary', 'categories', 'tags']
      }
    ]
  });

  const [firstResult] = response.results;
  const hits = firstResult?.hits ?? [];
  const total = firstResult?.nbHits ?? hits.length;

  return {
    items: hits,
    total,
    query: finalQuery
  };
}

export function isAlgoliaSearchConfigured() {
  return hasAlgoliaConfig;
}

export function getAlgoliaIndexName() {
  return indexName ?? null;
}
