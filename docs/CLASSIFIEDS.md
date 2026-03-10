# 📂 API de Classifieds (Clasificados) - Documentación

API para **avisos/clasificados** (classifieds): listado de **categorías** y CRUD de **posts**.

- **Categorías** (`classified_categories`): se listan con `GET /api/classified-categories` (orden por nombre). Son necesarias para el selector de categoría al crear o editar un post; las categorías en sí no tienen CRUD desde esta API (solo listado).
- **Posts** (`classified_posts`): crear, listar, obtener por ID, actualizar y eliminar en `/api/classified-posts`.

Todas las rutas requieren usuario autenticado (owner con cualquier rol).

---

## Índice

- [Seguridad](#-seguridad-y-autenticación)
- [Resumen de endpoints](#-resumen-de-endpoints)
- [Flujo recomendado](#-flujo-recomendado)
- [Endpoints detallados](#-endpoints-detallados)
- [Estructura de datos](#-estructura-de-datos)
- [Guía backend](#-guía-backend)
- [Guía frontend](#-guía-frontend)
- [Registro de cambios](#-registro-de-cambios)

---

## 🔐 Seguridad y autenticación

| Aspecto | Detalle |
|--------|---------|
| **Base URLs** | `/api/classified-categories` (listar categorías), `/api/classified-posts` (CRUD de avisos). |
| **Auth** | **Todas** las rutas requieren **Firebase ID Token** y que el usuario sea un **owner registrado** (husband o wife), **cualquier rol** (admin, gabaim o regular). |
| **Token** | Header `Authorization: Bearer <idToken>` (obtenido en `POST /api/owners/login`). |
| **Headers** | `Content-Type: application/json` para los endpoints con body. |

---

## 🚀 Resumen de endpoints

### Categorías

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/classified-categories` | Listar todas las categorías de clasificados. Orden por `name` ascendente. Necesario para mostrar selector de categoría al crear/editar posts. | Sí (Owner, cualquier rol) |

### Posts (avisos/clasificados)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/classified-posts` | Crear aviso/clasificado. Body: `title` (requerido), `category`, `description`, `price`, `contact_info`, `visible_to_other_colonies`. Valida que `category` exista si se envía. | Sí (Owner, cualquier rol) |
| `GET` | `/api/classified-posts` | Listar posts. Query opcionales: `category` (ObjectId), `visible_to_other_colonies` (true/false). Orden por `createdAt` desc. Incluye `category` poblado (name). | Sí |
| `GET` | `/api/classified-posts/:id` | Obtener un post por ID. Incluye `category` poblado. | Sí |
| `PATCH` | `/api/classified-posts/:id` | Actualizar post (campos parciales). Valida `category` si se envía. | Sí |
| `DELETE` | `/api/classified-posts/:id` | Eliminar post. | Sí |

Todas las respuestas están en **inglés**.

---

## 🔄 Flujo recomendado

1. **Login** — El usuario inicia sesión (`POST /api/owners/login`) y guarda el `idToken`.
2. **Cargar categorías** — `GET /api/classified-categories` para obtener la lista de categorías (ordenada por `name`). Usar esta lista en el **selector/dropdown de categoría** al crear o editar un post.
3. **Crear/editar post** — En el body de `POST /api/classified-posts` o `PATCH /api/classified-posts/:id`, enviar `category` con el `_id` de una de las categorías obtenidas en el paso 2.
4. **Listar / ver / eliminar** — Usar `GET /api/classified-posts`, `GET /api/classified-posts/:id` y `DELETE /api/classified-posts/:id` según la pantalla.

Sin el listado de categorías, el front no puede mostrar opciones válidas para el campo `category` de un post.

---

## 🔧 Endpoints detallados

### 1. Listar categorías (classified-categories)

- **Método**: `GET`
- **Ruta**: `/api/classified-categories`
- **Headers**: `Authorization: Bearer <idToken>`

Devuelve todas las categorías de la colección `classified_categories`, ordenadas por **name** ascendente. El frontend usa esta lista para el selector de categoría al crear o editar un clasificado.

#### Response 200

```json
{
  "success": true,
  "data": [
    { "_id": "...", "name": "For Sale", "createdAt": "...", "updatedAt": "..." },
    { "_id": "...", "name": "Wanted", "createdAt": "...", "updatedAt": "..." }
  ]
}
```

#### Response 401 / 403

- Sin token o token inválido (401).
- Usuario no es owner registrado (403).

---

### 2. Crear clasificado (create)

- **Método**: `POST`
- **Ruta**: `/api/classified-posts`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <idToken>`

Crea un aviso/clasificado. El campo **title** es obligatorio. Si se envía **category**, debe ser un ObjectId válido de un documento existente en `classified_categories`. El **creador** se asigna automáticamente con el owner autenticado (husband o wife) y se expone en la respuesta como `creator`.

#### Request body

```json
{
  "title": "Bike for sale",
  "category": "674a1b2c3d4e5f6789012345",
  "description": "Mountain bike, good condition.",
  "price": 150,
  "contact_info": "unit 42, or email@example.com",
  "visible_to_other_colonies": true
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `title` | string | Sí | Título del aviso. |
| `category` | string (ObjectId) | No | ID de ClassifiedCategory. Si se envía, debe existir. |
| `description` | string | No | Descripción del aviso. |
| `price` | number | No | Precio (puede ser `null` si no aplica). |
| `contact_info` | string | No | Información de contacto. |
| `visible_to_other_colonies` | boolean | No | Si el aviso es visible para otras colonias (default `false`). |

#### Response 201 — Created

El campo **creator** se rellena con el owner autenticado que creó el post (no se envía en el body).

```json
{
  "success": true,
  "message": "Classified post created successfully",
  "data": {
    "_id": "...",
    "title": "Bike for sale",
    "category": { "_id": "674a1b2c3d4e5f6789012345", "name": "For Sale" },
    "description": "Mountain bike, good condition.",
    "price": 150,
    "contact_info": "unit 42, or email@example.com",
    "visible_to_other_colonies": true,
    "creator": {
      "type": "husband",
      "id": "...",
      "first": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "unit_number": "42"
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 400

- Falta `title`: `"title is required"`.
- `category` no encontrada: `"category not found"`.

#### Response 401 / 403

- Sin token o token inválido (401).
- Usuario no es owner registrado (403).

---

### 3. Listar clasificados (list)

- **Método**: `GET`
- **Ruta**: `/api/classified-posts`
- **Headers**: `Authorization: Bearer <idToken>`

Lista avisos. Opcionalmente filtra por **category** (ObjectId) y **visible_to_other_colonies** (true/false). Orden: `createdAt` descendente. Cada ítem incluye **category** poblado (`_id`, `name`).

#### Query params

| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `category` | string (ObjectId) | No | Filtra por categoría. |
| `visible_to_other_colonies` | boolean | No | Filtra por visibilidad (query `true` o `false`). |

#### Ejemplo

```http
GET /api/classified-posts?category=674a1b2c3d4e5f6789012345&visible_to_other_colonies=true
Authorization: Bearer <token>
```

#### Response 200

Cada ítem incluye **category** poblado (name) y **creator** (owner que creó el post: nombre, email, unidad).

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Bike for sale",
      "category": { "_id": "...", "name": "For Sale" },
      "description": "...",
      "price": 150,
      "contact_info": "...",
      "visible_to_other_colonies": true,
      "creator": {
        "type": "husband",
        "id": "...",
        "first": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "unit_number": "42"
      },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

| Campo en cada ítem | Descripción |
|--------------------|-------------|
| `_id` | ID del post. |
| `title` | Título. |
| `category` | Objeto con `_id` y `name` (categoría poblada). |
| `description` | Descripción (puede ser `null`). |
| `price` | Precio (puede ser `null`). |
| `contact_info` | Información de contacto (puede ser `null`). |
| `visible_to_other_colonies` | Boolean. |
| `creator` | Objeto con `type` (husband/wife), `id`, `first`, `last_name`, `email`, `unit_number`. Puede ser `null` si el post no tiene creador guardado. |
| `createdAt`, `updatedAt` | Timestamps. |

---

### 4. Obtener por ID (getById)

- **Método**: `GET`
- **Ruta**: `/api/classified-posts/:id`
- **Headers**: `Authorization: Bearer <idToken>`

Devuelve un único post con **category** poblado.

#### Response 200

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "Bike for sale",
    "category": { "_id": "...", "name": "For Sale" },
    "description": "...",
    "price": 150,
    "contact_info": "...",
    "visible_to_other_colonies": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 400 / 404

- `400`: `"Invalid id"` (id no es ObjectId válido).
- `404`: `"Classified post not found"`.

---

### 5. Actualizar clasificado (update)

- **Método**: `PATCH`
- **Ruta**: `/api/classified-posts/:id`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <idToken>`

Actualiza solo los campos enviados en el body. Si se envía **category**, debe existir en `classified_categories`.

#### Request body (ejemplo parcial)

```json
{
  "title": "Bike for sale - updated",
  "price": 120
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `title` | string | Título. |
| `category` | string (ObjectId) | ID de categoría (se valida existencia). |
| `description` | string | Descripción. |
| `price` | number | Precio. |
| `contact_info` | string | Contacto. |
| `visible_to_other_colonies` | boolean | Visibilidad. |

#### Response 200

```json
{
  "success": true,
  "message": "Classified post updated",
  "data": { ... }
}
```

#### Response 404

`"Classified post not found"` si el id no existe.

---

### 6. Eliminar clasificado (remove)

- **Método**: `DELETE`
- **Ruta**: `/api/classified-posts/:id`
- **Headers**: `Authorization: Bearer <idToken>`

Elimina el documento. No requiere body.

#### Response 200

```json
{
  "success": true,
  "message": "Classified post deleted successfully"
}
```

#### Response 404

`"Classified post not found"`.

---

## 📊 Estructura de datos

### ClassifiedCategory

- **Modelo**: `ClassifiedCategory`
- **Archivo**: `src/models/classified-category.model.js`
- **Colección**: `classified_categories`
- **Uso en API**: listado con `GET /api/classified-categories` (orden por `name`). No hay endpoints de creación/edición/eliminación de categorías en esta API.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | String | Nombre de la categoría (default `null`). |
| `createdAt`, `updatedAt` | Date | Timestamps. |

### ClassifiedPost

- **Modelo**: `ClassifiedPost`
- **Archivo**: `src/models/classified-post.model.js`
- **Colección**: `classified_posts`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `title` | String | Título del aviso. |
| `category` | ObjectId (ref `ClassifiedCategory`) | Categoría del clasificado. |
| `description` | String | Descripción. |
| `price` | Number | Precio (puede ser `null`). |
| `contact_info` | String | Información de contacto. |
| `visible_to_other_colonies` | Boolean | Visible para otras colonias (default `false`). |
| `createdByIdOwnerHusbandUser` | ObjectId (ref `OwnerHusbandUser`) | Owner husband que creó el post (uno de los dos refs se rellena al crear). |
| `createdByIdOwnerWifeUser` | ObjectId (ref `OwnerWifeUser`) | Owner wife que creó el post. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

En las respuestas de la API, el creador se expone como objeto unificado **`creator`**: `{ type: 'husband' | 'wife', id, first, last_name, email, unit_number }`. **unit_number** es el número de unidad del owner (desde `Unit` referenciada por el owner). Se rellena automáticamente al **crear** el post con el owner autenticado (`req.owner`); no es enviable en el body.

---

## 📘 Guía backend

- **Rutas categorías**: `src/routes/classified-categories.route.js`
  - `GET /` → list (todas las categorías, orden por name). Middleware: `requireOwnerAnyRole`.
- **Rutas posts**: `src/routes/classified-posts.route.js`
  - Todas bajo `requireOwnerAnyRole` = `[verifyFirebaseToken, verifyOwner]`.
  - `POST /` → create.
  - `GET /` → list (query: category, visible_to_other_colonies).
  - `GET /:id` → getById.
  - `PATCH /:id` → update.
  - `DELETE /:id` → remove.

- **Controlador categorías**: `src/controllers/classifiedCategories.controller.js`
  - **list**: find().sort({ name: 1 }).lean().
- **Controlador posts**: `src/controllers/classifiedPosts.controller.js`
  - **create**: exige `title`; valida que `category` exista si se envía; devuelve documento con `category` poblado.
  - **list**: filtra por `category` y `visible_to_other_colonies`; orden `createdAt` desc; populate category (name).
  - **getById**: findById con populate; 404 si no existe.
  - **update**: actualización parcial; valida `category` si se envía.
  - **remove**: findByIdAndDelete.

- **Montaje**: En `app.js`, `app.use('/api/classified-posts', classifiedPostsRoutes)` y `app.use('/api/classified-categories', classifiedCategoriesRoutes)`.

---

## 📗 Guía frontend

### Obtener token

El usuario debe estar logueado (p. ej. `POST /api/owners/login`). Guardar el `token` (idToken) para enviarlo en `Authorization: Bearer <token>`.

### Listar categorías (para selector al crear/editar post)

```javascript
const token = localStorage.getItem('token');
const { data } = await axios.get(`${API_URL}/api/classified-categories`, {
  headers: { Authorization: `Bearer ${token}` },
});
const categories = data.data; // [{ _id, name, createdAt, updatedAt }, ...]
```

### Crear clasificado

```javascript
const token = localStorage.getItem('token');
const { data } = await axios.post(
  `${API_URL}/api/classified-posts`,
  {
    title: 'Bike for sale',
    category: '674a1b2c3d4e5f6789012345',
    description: 'Mountain bike, good condition.',
    price: 150,
    contact_info: 'unit 42',
    visible_to_other_colonies: true,
  },
  {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }
);
if (data.success) console.log('Created:', data.data._id);
```

### Listar

```javascript
const { data } = await axios.get(`${API_URL}/api/classified-posts`, {
  params: { category: categoryId, visible_to_other_colonies: true },
  headers: { Authorization: `Bearer ${token}` },
});
const posts = data.data;
```

### Obtener por ID

```javascript
const { data } = await axios.get(`${API_URL}/api/classified-posts/${postId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const post = data.data;
```

### Actualizar

```javascript
await axios.patch(
  `${API_URL}/api/classified-posts/${postId}`,
  { title: 'New title', price: 100 },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### Eliminar

```javascript
await axios.delete(`${API_URL}/api/classified-posts/${postId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## 📝 Registro de cambios

| Fecha / contexto | Cambio |
|------------------|--------|
| **Modelos** | `ClassifiedCategory` (colección `classified_categories`, campo `name`). `ClassifiedPost` (colección `classified_posts`: title, category ref, description, price, contact_info, visible_to_other_colonies). |
| **CRUD ClassifiedPost** | Controlador `classifiedPosts.controller.js` y rutas en `classified-posts.route.js`. Create (title requerido, category validada), list (filtros category y visible_to_other_colonies), getById, update, remove. Respuestas en inglés. |
| **Auth** | Todas las rutas de `/api/classified-posts` y `/api/classified-categories` protegidas con `verifyFirebaseToken` + `verifyOwner` (cualquier owner, cualquier rol). |
| **GET /api/classified-categories** | Listar categorías. Controlador `classifiedCategories.controller.js`, ruta `classified-categories.route.js`. Orden por name. Necesario para el selector de categoría en posts. |
| **Creador del post** | Al crear se guarda el owner en `createdByIdOwnerHusbandUser` o `createdByIdOwnerWifeUser`. Las respuestas incluyen `creator`: `{ type, id, first, last_name, email, unit_number }` (unit_number desde Unit del owner). |
