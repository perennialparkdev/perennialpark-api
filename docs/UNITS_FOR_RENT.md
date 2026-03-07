# 📂 API de Units for Rent (Unidades en alquiler) - Documentación

API para **unidades en alquiler** (`units_for_rent`): CRUD de anuncios de alquiler de la unidad del owner (fechas, notas, visibilidad solo en mi colonia). El owner que publica se asigna automáticamente y la unidad en alquiler es la enlazada a ese owner.

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
| **Base URL** | `/api/units-for-rent` |
| **Auth** | **Todas** las rutas requieren **Firebase ID Token** y que el usuario sea un **owner registrado** (husband o wife), **cualquier rol**. |
| **Token** | Header `Authorization: Bearer <idToken>` (obtenido en `POST /api/owners/login`). |
| **Headers** | `Content-Type: application/json` para los endpoints con body. |

---

## 🚀 Resumen de endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/units-for-rent` | Crear anuncio de unidad en alquiler. Body: `startDate`, `endDate`, `notes`, `only_my_colony`. El owner se asigna desde el token. | Sí (Owner, cualquier rol) |
| `GET` | `/api/units-for-rent` | Listar anuncios. Query opcional: `only_my_colony` (true/false). Orden por `createdAt` desc. Incluye `owner` (nombre, email, teléfono, unidad). | Sí |
| `GET` | `/api/units-for-rent/:id` | Obtener un anuncio por ID. Incluye `owner` y unidad. | Sí |
| `PATCH` | `/api/units-for-rent/:id` | Actualizar anuncio (campos parciales). | Sí |
| `DELETE` | `/api/units-for-rent/:id` | Eliminar anuncio. | Sí |

Todas las respuestas están en **inglés**.

---

## 🔄 Flujo recomendado

1. **Login** — El usuario inicia sesión (`POST /api/owners/login`) y guarda el `idToken`.
2. **Crear anuncio** — `POST /api/units-for-rent` con `startDate`, `endDate` (opcionales pero recomendados), `notes`, `only_my_colony`. El backend asigna el owner autenticado; la unidad en alquiler es la del owner.
3. **Listar / ver / editar / eliminar** — Usar `GET /api/units-for-rent`, `GET /api/units-for-rent/:id`, `PATCH` y `DELETE` según la pantalla.

---

## 🔧 Endpoints detallados

### 1. Crear unidad en alquiler (create)

- **Método**: `POST`
- **Ruta**: `/api/units-for-rent`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <idToken>`

Crea un anuncio de unidad en alquiler. El **owner** se asigna automáticamente con el owner autenticado (husband o wife). La unidad en alquiler es la enlazada al owner (`owner.unitId`). En la respuesta se expone `owner` (nombre, email, teléfono, unidad).

#### Request body

```json
{
  "startDate": "2025-06-01",
  "endDate": "2025-08-31",
  "notes": "Furnished, utilities included.",
  "only_my_colony": true
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `startDate` | string (fecha ISO) | No | Fecha de inicio del alquiler. Si no es válida se guarda `null`. |
| `endDate` | string (fecha ISO) | No | Fecha de fin del alquiler. Si no es válida se guarda `null`. |
| `notes` | string | No | Notas adicionales (default `null`). |
| `only_my_colony` | boolean | No | Si el anuncio es solo para mi colonia (default `false`). |

#### Response 201 — Created

El campo **owner** se rellena con el owner autenticado que creó el anuncio (no se envía en el body).

```json
{
  "success": true,
  "message": "Unit for rent created successfully",
  "data": {
    "_id": "...",
    "startDate": "2025-06-01T00:00:00.000Z",
    "endDate": "2025-08-31T00:00:00.000Z",
    "notes": "Furnished, utilities included.",
    "only_my_colony": true,
    "owner": {
      "type": "husband",
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "unit": { "unit_number": "42" }
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 401 / 403

- Sin token o token inválido (401).
- Usuario no es owner registrado (403).

---

### 2. Listar unidades en alquiler (list)

- **Método**: `GET`
- **Ruta**: `/api/units-for-rent`
- **Headers**: `Authorization: Bearer <idToken>`

Lista anuncios. Opcionalmente filtra por **only_my_colony** (true/false). Orden: `createdAt` descendente. Cada ítem incluye **owner** (nombre, email, teléfono, unidad).

#### Query params

| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `only_my_colony` | boolean | No | Filtra por visibilidad (query `true` o `false`). |

#### Ejemplo

```http
GET /api/units-for-rent?only_my_colony=true
Authorization: Bearer <token>
```

#### Response 200

Cada ítem incluye **owner** (nombre, email, teléfono, unidad enlazada).

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "startDate": "2025-06-01T00:00:00.000Z",
      "endDate": "2025-08-31T00:00:00.000Z",
      "notes": "Furnished, utilities included.",
      "only_my_colony": true,
      "owner": {
        "type": "husband",
        "id": "...",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "unit": { "unit_number": "42" }
      },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

| Campo en cada ítem | Descripción |
|--------------------|-------------|
| `_id` | ID del anuncio. |
| `startDate`, `endDate` | Fechas de alquiler (pueden ser `null`). |
| `notes` | Notas (puede ser `null`). |
| `only_my_colony` | Boolean. |
| `owner` | Objeto con `type` (husband/wife), `id`, `name`, `email`, `phone`, `unit` (`{ unit_number }`). Puede ser `null` si no hay owner guardado. |
| `createdAt`, `updatedAt` | Timestamps. |

---

### 3. Obtener por ID (getById)

- **Método**: `GET`
- **Ruta**: `/api/units-for-rent/:id`
- **Headers**: `Authorization: Bearer <idToken>`

Devuelve un único anuncio con **owner** poblado (nombre, email, teléfono, unidad).

#### Response 200

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "startDate": "2025-06-01T00:00:00.000Z",
    "endDate": "2025-08-31T00:00:00.000Z",
    "notes": "Furnished, utilities included.",
    "only_my_colony": true,
    "owner": {
      "type": "husband",
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "unit": { "unit_number": "42" }
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 400 / 404

- `400`: `"Invalid id"` (id no es ObjectId válido).
- `404`: `"Unit for rent not found"`.

---

### 4. Actualizar unidad en alquiler (update)

- **Método**: `PATCH`
- **Ruta**: `/api/units-for-rent/:id`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <idToken>`

Actualiza solo los campos enviados en el body.

#### Request body (ejemplo parcial)

```json
{
  "endDate": "2025-09-15",
  "notes": "Extended availability.",
  "only_my_colony": false
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `startDate` | string (fecha ISO) | Fecha de inicio. |
| `endDate` | string (fecha ISO) | Fecha de fin. |
| `notes` | string | Notas. |
| `only_my_colony` | boolean | Solo mi colonia. |

#### Response 200

```json
{
  "success": true,
  "message": "Unit for rent updated",
  "data": { ... }
}
```

#### Response 404

`"Unit for rent not found"` si el id no existe.

---

### 5. Eliminar unidad en alquiler (remove)

- **Método**: `DELETE`
- **Ruta**: `/api/units-for-rent/:id`
- **Headers**: `Authorization: Bearer <idToken>`

Elimina el documento. No requiere body.

#### Response 200

```json
{
  "success": true,
  "message": "Unit for rent deleted successfully"
}
```

#### Response 404

`"Unit for rent not found"`.

---

## 📊 Estructura de datos

### UnitForRent

- **Modelo**: `UnitForRent`
- **Archivo**: `src/models/unit-for-rent.model.js`
- **Colección**: `units_for_rent`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `startDate` | Date | Fecha de inicio del alquiler (default `null`). |
| `endDate` | Date | Fecha de fin del alquiler (default `null`). |
| `notes` | String | Notas adicionales (default `null`). |
| `only_my_colony` | Boolean | Solo visible para mi colonia (default `false`). |
| `createdByIdOwnerHusbandUser` | ObjectId (ref `OwnerHusbandUser`) | Owner husband que publica (uno de los dos refs se rellena al crear). |
| `createdByIdOwnerWifeUser` | ObjectId (ref `OwnerWifeUser`) | Owner wife que publica. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

En las respuestas de la API, el owner se expone como objeto unificado **`owner`**: `{ type: 'husband' | 'wife', id, name, email, phone, unit: { unit_number } }`. La **unidad en alquiler** es la enlazada al owner (`owner.unitId`); no se guarda `unitId` en el schema. Se rellena automáticamente al **crear** con el owner autenticado (`req.owner`); no es enviable en el body.

---

## 📘 Guía backend

- **Rutas**: `src/routes/units-for-rent.route.js`
  - Todas bajo `requireOwnerAnyRole` = `[verifyFirebaseToken, verifyOwner]`.
  - `POST /` → create.
  - `GET /` → list (query: `only_my_colony`).
  - `GET /:id` → getById.
  - `PATCH /:id` → update.
  - `DELETE /:id` → remove.

- **Controlador**: `src/controllers/unitsForRent.controller.js`
  - **create**: asigna owner desde `req.owner`; acepta `startDate`, `endDate` (parseados con `parseDate`), `notes`, `only_my_colony`; devuelve documento con `owner` calculado.
  - **list**: filtra por `only_my_colony`; orden `createdAt` desc; populate owner (husband/wife) + unitId (unit_number).
  - **getById**: findById con populate; 404 si no existe.
  - **update**: actualización parcial con los mismos campos.
  - **remove**: findByIdAndDelete.

- **Montaje**: En `app.js`, `app.use('/api/units-for-rent', unitsForRentRoutes)`.

---

## 📗 Guía frontend

### Obtener token

El usuario debe estar logueado (p. ej. `POST /api/owners/login`). Guardar el `token` (idToken) para enviarlo en `Authorization: Bearer <token>`.

### Crear anuncio de unidad en alquiler

```javascript
const token = localStorage.getItem('token');
const { data } = await axios.post(
  `${API_URL}/api/units-for-rent`,
  {
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    notes: 'Furnished, utilities included.',
    only_my_colony: true,
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
const { data } = await axios.get(`${API_URL}/api/units-for-rent`, {
  params: { only_my_colony: true },
  headers: { Authorization: `Bearer ${token}` },
});
const list = data.data;
```

### Obtener por ID

```javascript
const { data } = await axios.get(`${API_URL}/api/units-for-rent/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const item = data.data;
```

### Actualizar

```javascript
await axios.patch(
  `${API_URL}/api/units-for-rent/${id}`,
  { endDate: '2025-09-15', notes: 'Extended.' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### Eliminar

```javascript
await axios.delete(`${API_URL}/api/units-for-rent/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## 📝 Registro de cambios

| Fecha / contexto | Cambio |
|------------------|--------|
| **Modelo UnitForRent** | Colección `units_for_rent`: startDate, endDate, notes, only_my_colony, createdByIdOwnerHusbandUser, createdByIdOwnerWifeUser. La unidad en alquiler es la del owner (owner.unitId). |
| **CRUD units-for-rent** | Controlador `unitsForRent.controller.js` y rutas en `units-for-rent.route.js`. Create (owner desde req.owner), list (filtro only_my_colony), getById, update, remove. Respuestas en inglés. |
| **Auth** | Todas las rutas de `/api/units-for-rent` protegidas con `verifyFirebaseToken` + `verifyOwner` (cualquier owner, cualquier rol). |
| **Respuesta owner** | Las respuestas incluyen `owner`: `{ type, id, name, email, phone, unit: { unit_number } }` calculado desde el owner poblado y su Unit. |
