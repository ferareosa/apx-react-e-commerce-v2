# Ecommerce Platform

Aplicación full-stack pensada para ensayar un flujo completo de ecommerce: autenticación passwordless, búsqueda de productos, generación de órdenes y confirmación de pagos vía Mercado Pago. El frontend usa React + Vite y el backend es Express + TypeScript con una base en memoria sencilla de extender.

## Colección de Postman

La colección con todos los endpoints y tests está disponible en el [workspace público](https://fer-areosa-9609763.postman.co/workspace/Fernando-Areosa's-Workspace~7dbf83cf-259d-4c22-848d-f09ff7b65052/collection/50834108-fd40475c-f102-4876-88c7-a5aba2682334?action=share&source=copy-link&creator=50834108).

## Características

- Login passwordless con códigos temporales y un código maestro configurable para entornos de prueba.
- Catálogo semilla y motor de búsqueda que replica el flujo Airtable ➜ Algolia o usa un índice real cuando configurás credenciales.
- Checkout que reserva stock, genera una preferencia de pago y almacena el historial de la orden.
- Webhook de Mercado Pago con validación de firma para simular el ciclo de pago completo.
- Colección de Postman con assertions listas para automatizar la verificación del backend.

## Requisitos previos

- Node.js 20+
- pnpm / npm / yarn (usa el que prefieras)

## Puesta en marcha rápida

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar backend y frontend en paralelo
npm run server:dev
npm run dev
```

## Scripts útiles

| Comando                | Descripción                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Levanta el frontend de Vite.                                 |
| `npm run server:dev`   | Levanta el backend con recarga en caliente usando tsx.       |
| `npm run server:build` | Compila los archivos TypeScript del backend a `dist/server`. |
| `npm run server:start` | Ejecuta la versión compilada del backend.                    |

Si preferís un único comando, podés usar `npm run dev` en una terminal y `npm run server:dev` en otra.

## Variables de entorno

Usá `.env.example` como base para `.env`. Las claves principales son:

| Variable                  | Descripción                                                        | Valor por defecto                                                           |
| ------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `PORT`                    | Puerto del frontend (Vite).                                        | `5173`                                                                      |
| `SERVER_PORT`             | Puerto del backend Express.                                        | `4000`                                                                      |
| `AUTH_SECRET`             | Secreto para firmar JWT.                                           | `super-secret`                                                              |
| `LOGIN_CODE_TTL`          | Minutos de vigencia para los códigos enviados por email.           | `10`                                                                        |
| `MP_WEBHOOK_SECRET`       | Firma compartida para validar el webhook de Mercado Pago/IPN.      | `dev-signature`                                                             |
| `MP_ACCESS_TOKEN`         | Access token privado de Mercado Pago usado por el backend.         | _(sin valor)_                                                               |
| `MP_PUBLIC_KEY`           | Public key de Mercado Pago expuesta en el frontend.                | _(sin valor)_                                                               |
| `VITE_MP_PUBLIC_KEY`      | Public key que inicializa el SDK de Mercado Pago en el frontend.   | _(sin valor)_                                                               |
| `MP_SUCCESS_URL`          | URL de retorno cuando el pago se aprueba.                          | `http://localhost:5173/thanks?status=success`                               |
| `MP_FAILURE_URL`          | URL de retorno cuando el pago se rechaza.                          | `http://localhost:5173/thanks?status=failure`                               |
| `MP_PENDING_URL`          | URL de retorno cuando el pago queda pendiente.                     | `http://localhost:5173/thanks?status=pending`                               |
| `MP_NOTIFICATION_URL`     | Endpoint público que recibe notificaciones IPN de Mercado Pago.    | `https://apx-react-e-commerce-v2-back.onrender.com/api/webhook/mercadopago` |
| `VITE_API_URL`            | URL base que consume el frontend de React.                         | `https://apx-react-e-commerce-v2-back.onrender.com`                         |
| `ALGOLIA_APP_ID`          | Identificador de tu aplicación en Algolia.                         | _(sin valor)_                                                               |
| `ALGOLIA_API_KEY`         | API key con permisos de escritura (se usa para indexar).           | _(sin valor)_                                                               |
| `ALGOLIA_INDEX_NAME`      | Nombre del índice donde se publican los productos.                 | _(sin valor)_                                                               |
| `VITE_ALGOLIA_APP_ID`     | App ID expuesto en el frontend para habilitar la búsqueda directa. | _(sin valor)_                                                               |
| `VITE_ALGOLIA_INDEX_NAME` | Índice que consulta la barra de búsqueda.                          | _(sin valor)_                                                               |
| `VITE_ALGOLIA_SEARCH_KEY` | Search-only API key que el frontend puede exponer sin riesgos.     | _(sin valor)_                                                               |

## Deploy en Vercel

1. Crear un proyecto nuevo en Vercel apuntando a este repositorio y seleccionar la carpeta `client` como raíz.
2. En la sección **Environment Variables** agregar las claves necesarias (mismas que en `.env`). Al menos `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MP_PUBLIC_KEY`, `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_SUCCESS_URL`, `MP_FAILURE_URL` y `MP_PENDING_URL`.
3. Guardar y desplegar. El build utiliza `npm run build` y publica en `dist`.
4. Las rutas del router están resueltas con un rewrite (`vercel.json`), así que `/signin`, `/profile`, `/search`, etc. funcionan con deep links.
5. Tras el primer deploy validar callbacks de Mercado Pago apuntando al dominio público final.

Postman utiliza las mismas variables con prefijo `POSTMAN_` en `.env.postman` para sincronizar el runner.

### Integración con Algolia

1. Creá un índice nuevo en tu cuenta de Algolia y copiá `APP ID`, `ADMIN API KEY` y el nombre del índice en `.env`.
2. Marcá `stock`, `price`, `title`, `summary`, `description` y `tags` como atributos buscables/filtrables si querés personalizar el ranking.
3. Opcional: ejecutá `npm run algolia:seed` para poblar el índice con looks de indumentaria listos para usar (incluyen talles, colores, categorías, materiales y datos editoriales).
4. Si querés que el buscador de la tienda consulte Algolia directamente, duplicá `ALGOLIA_APP_ID`/`ALGOLIA_INDEX_NAME` en las variables que empiezan con `VITE_` y generá una search-only key para `VITE_ALGOLIA_SEARCH_KEY`.
5. Reiniciá `npm run server:dev`. El backend detecta las variables, sincroniza automáticamente los productos en stock y loguea la cantidad publicada.
6. Si omitís las credenciales el servicio cae automáticamente al motor local que replica el scoring de Algolia, así que el frontend sigue funcionando.

## API REST

Todas las rutas viven en `server/src/routes` y comparten middlewares de `server/src/middleware`.

| Método + Ruta               | Descripción                                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| `POST /auth`                | Crea/encuentra el usuario por email y envía un código de acceso temporal.        |
| `POST /auth/token`          | Valida email + código y devuelve un JWT (el código se invalida).                 |
| `GET /me`                   | Devuelve el perfil asociado al token.                                            |
| `PATCH /me`                 | Actualiza campos básicos (`name`, `phone`, `preferences`).                       |
| `PATCH /me/address`         | Reemplaza el objeto de dirección completo.                                       |
| `GET /me/orders`            | Lista las órdenes del usuario autenticado.                                       |
| `GET /search?q=...`         | Busca productos aplicando la estrategia Airtable ➜ Algolia con control de stock. |
| `GET /products/:id`         | Devuelve el detalle de un producto.                                              |
| `POST /order?productId=...` | Crea una orden, reserva stock y genera preferencia de pago en MercadoPago.       |
| `GET /order/:orderId`       | Recupera una orden (sólo si pertenece al usuario del token).                     |
| `POST /ipn/mercadopago`     | Webhook para confirmar pagos, enviar emails y disparar avisos internos.          |

### Tokens y autenticación

1. `POST /auth` devuelve `202` y un `expiresAt` para el código enviado.
2. `POST /auth/token` entrega `{ token, expiresIn }`.
3. Las rutas protegidas esperan `Authorization: Bearer <token>`.

### MercadoPago e IPN

- El servicio valida la firma, actualiza el estado (`pending-payment`, `paid`, `failed`), libera stock cuando corresponde, envía emails y registra una notificación interna.

## Estructura relevante

```
client/
  src/
    main.tsx          # Punto de entrada de Vite/React
    App.tsx           # Shell principal
server/
  src/
    app.ts            # Express + middlewares base
    container.ts      # Registro de servicios y dependencias
    routes/           # Auth, me, order, search, products, webhook
    services/         # database, auth, user, product, search, order, email, etc.
    middleware/       # auth + error handler
    types/            # Tipos comunes (HTTP, servicios)
```

## Frontend React

El dashboard vive íntegramente dentro de `client/` y usa React + Vite apuntando al backend Express. Algunas notas:

- **Historial de compras**: la sección final refresca `/me/orders` cada 15 segundos, muestra los estados y expone el link de pago para retomar el checkout.

Para correrlo:

```bash
# en una terminal
npm run server:dev

# en otra
VITE_API_URL=https://apx-react-e-commerce-v2-back.onrender.com npm run dev
```

`VITE_API_URL` puede omitirse si ya lo definiste en un archivo `.env` en la raíz.

Los datos (usuarios, productos, órdenes) se almacenan en `InMemoryDatabase`. Esto permite testear el flujo completo sin una base externa y, al mismo tiempo, tener un punto claro para reemplazar por PostgreSQL, MongoDB u otra solución persistente cuando sea necesario.
