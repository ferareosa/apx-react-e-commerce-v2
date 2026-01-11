import type {
  Address,
  Order,
  OrderListItem,
  Product,
  SearchResponse,
  SupabaseOrdersResponse,
  User
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'https://apx-react-e-commerce-v2-back.onrender.com').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type FetchOptions = RequestInit & { token?: string };

type TokenResponse = {
  token: string;
  expiresIn: string;
};

type CodeResponse = {
  message: string;
  expiresAt: string;
};

function buildUrl(path: string) {
  if (path.startsWith('http')) {
    return path;
  }
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}) {
  const headers = new Headers(options.headers ?? {});

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const isJsonBody = options.body && !(options.body instanceof FormData);
  if (isJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers
  });

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const message = typeof data === 'object' && data && 'message' in data
      ? (data as { message: string }).message
      : 'Error inesperado';
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

function safeJsonParse(payload: string) {
  try {
    return JSON.parse(payload);
  } catch (_) {
    return payload;
  }
}

export const api = {
  requestLoginCode(email: string) {
    return apiFetch<CodeResponse>('/auth', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },
  exchangeCodeForToken(email: string, code: string) {
    return apiFetch<TokenResponse>('/auth/token', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
  },
  getProfile(token: string) {
    return apiFetch<{ user: User }>('/me', {
      headers: { Accept: 'application/json' },
      token
    });
  },
  updateProfile(token: string, payload: Partial<User> & { preferences?: Record<string, string | boolean> }) {
    return apiFetch<{ user: User }>('/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
      token
    });
  },
  updateAddress(token: string, address: Address) {
    return apiFetch<{ user: User }>('/me/address', {
      method: 'PATCH',
      body: JSON.stringify(address),
      token
    });
  },
  listOrders(token: string) {
    return apiFetch<{ items: OrderListItem[]; total: number }>('/me/orders', {
      token
    });
  },
  listSupabaseOrders(email: string, token: string) {
    const params = new URLSearchParams({ email, token });
    return apiFetch<SupabaseOrdersResponse>(`/pedidos?${params.toString()}`);
  },
  createOrder(token: string, productId: string) {
    return apiFetch<{
      orderId: string;
      paymentUrl: string;
      status: Order['status'];
      paymentReference: string;
      preferenceId: string;
      product: Product;
    }>('/order', {
      method: 'POST',
      body: JSON.stringify({ productId }),
      token
    });
  },
  getOrder(token: string, orderId: string) {
    return apiFetch<{ order: Order; product: Product }>(`/order/${orderId}`, {
      token
    });
  },
  searchProducts(query: string, offset = 0, limit = 6) {
    const params = new URLSearchParams({ q: query, offset: String(offset), limit: String(limit) });
    return apiFetch<SearchResponse>(`/search?${params.toString()}`);
  },
  getProduct(productId: string) {
    return apiFetch<{ product: Product }>(`/products/${productId}`);
  }
};

export function getApiBaseUrl() {
  return API_BASE;
}
