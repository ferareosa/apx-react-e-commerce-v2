const SESSION_CACHE = 'supabase-session-cache';
const SESSION_KEY_URL = '/__supabase_session__';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function writeSession(session) {
  const cache = await caches.open(SESSION_CACHE);
  const payload = session ? JSON.stringify(session) : 'null';
  await cache.put(SESSION_KEY_URL, new Response(payload, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  }));
}

async function readSession() {
  const cache = await caches.open(SESSION_CACHE);
  const response = await cache.match(SESSION_KEY_URL);
  if (!response) {
    return null;
  }
  try {
    return await response.json();
  } catch (_) {
    return null;
  }
}

async function clearSession() {
  const cache = await caches.open(SESSION_CACHE);
  await cache.delete(SESSION_KEY_URL);
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'STORE_SUPABASE_SESSION':
      event.waitUntil(writeSession(payload));
      break;
    case 'CLEAR_SUPABASE_SESSION':
      event.waitUntil(clearSession());
      break;
    case 'GET_SUPABASE_SESSION':
      event.waitUntil(
        readSession().then((session) => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ session });
          }
        })
      );
      break;
    default:
      break;
  }
});
