export type Address = {
  street: string;
  number?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  reference?: string;
};

export type UserPreferences = Record<string, string | boolean>;

export type User = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: Address;
  preferences?: UserPreferences;
  supabaseId?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderStatus =
  | 'pending-payment'
  | 'paid'
  | 'failed'
  | 'in-transit'
  | 'delivered'
  | 'cancelled';

export type OrderEventStatus = OrderStatus | 'packed' | 'shipped';

export type OrderHistoryEntry = {
  status: OrderEventStatus;
  note: string;
  at: string;
};

export type Order = {
  id: string;
  userId: string;
  productId: string;
  status: OrderStatus;
  currency: string;
  total: number;
  paymentProvider: 'mercadopago';
  paymentReference: string;
  paymentUrl: string;
  metadata: Record<string, unknown>;
  history: OrderHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  sku: string;
  title: string;
  summary: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  tags: string[];
  heroImage: string;
  gallery: string[];
  metadata: {
    category: string;
    shippingEstimateDays: number;
    location: string;
    featured: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type SearchResponse = {
  total: number;
  items: Product[];
  offset: number;
  limit: number;
  syncSource: {
    airtableRecords: number;
    filteredForStock: number;
    algoliaHits: number;
    mode: 'algolia' | 'replica';
  };
};

export type OrderListItem = {
  order: Order;
  product: Product;
};

export type SupabaseOrderHistoryEntry = {
  status: string | null;
  note: string | null;
  at: string | null;
  checkpoint?: Record<string, unknown> | null;
};

export type SupabaseOrderItem = {
  orderId: string;
  productId: string | null;
  status: string | null;
  total: number | null;
  currency: string | null;
  history: SupabaseOrderHistoryEntry[];
};

export type SupabaseOrdersResponse = {
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  total: number;
  items: SupabaseOrderItem[];
};

