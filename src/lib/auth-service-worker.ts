const WORKER_URL = '/auth-sw.js';

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function isSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

async function waitForController() {
  if (!isSupported()) {
    return null;
  }

  await registerAuthWorker();
  await navigator.serviceWorker.ready;

  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller;
  }

  return new Promise<ServiceWorker | null>((resolve) => {
    const handleChange = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleChange);
      resolve(navigator.serviceWorker.controller);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleChange);
    // Fallback timeout in case controller never arrives
    setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleChange);
      resolve(navigator.serviceWorker.controller ?? null);
    }, 2000);
  });
}

export function registerAuthWorker() {
  if (!isSupported()) {
    return Promise.resolve(null);
  }

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register(WORKER_URL, { scope: '/' })
      .catch((error) => {
        console.error('No pudimos registrar el service worker de auth', error);
        registrationPromise = null;
        return null;
      });
  }

  return registrationPromise;
}

async function postMessage<T = void>(type: string, payload?: unknown, expectReply = false): Promise<T> {
  if (!isSupported()) {
    return Promise.resolve(undefined as T);
  }

  const controller = await waitForController();
  if (!controller) {
    return Promise.resolve(undefined as T);
  }

  if (!expectReply) {
    controller.postMessage({ type, payload });
    return undefined as T;
  }

  return new Promise<T>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      reject(new Error('Timeout esperando respuesta del service worker.'));
    }, 1500);

    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      resolve(event.data as T);
    };

    controller.postMessage({ type, payload }, [channel.port2]);
  });
}

export async function storeSupabaseSession(session: unknown) {
  await postMessage('STORE_SUPABASE_SESSION', session, false);
}

export async function clearSupabaseSession() {
  await postMessage('CLEAR_SUPABASE_SESSION');
}

export async function loadSupabaseSession<T = unknown>() {
  const response = await postMessage<{ session: T | null }>('GET_SUPABASE_SESSION', undefined, true);
  return response?.session ?? null;
}
