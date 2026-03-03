# 📂 API de RSVP - Documentación

Registros de citas RSVP: crear, listar por rango de fecha, obtener por ID, editar y eliminar (solo administradores).

---

## Índice

- [Seguridad](#-seguridad-y-autenticación)
- [Resumen de endpoints](#-resumen-de-endpoints)
- [Endpoints detallados](#-endpoints-detallados)
- [Estructura de datos](#-estructura-de-datos)
- [Guía backend](#-guía-backend)
- [Guía frontend](#-guía-frontend)
- [Registro de cambios](#-registro-de-cambios)

---

## 🔐 Seguridad y autenticación

| Aspecto | Detalle |
|--------|---------|
| **Auth** | **Create**, **list** (GET), **getById** y **update** (PATCH) son **públicas**. **Delete** requiere **Firebase ID Token** y que el usuario sea un **owner (husband o wife) con idRol de administrador** (ObjectId `69a4797d16285f80b89cb60b` o `ADMIN_ROL_ID`). |
| **Token** | Para **DELETE** se envía en header `Authorization: Bearer <idToken>` (obtenido en `POST /api/owners/login`). |
| **Headers** | `Content-Type: application/json` para los endpoints con body. |

---

## 🚀 Resumen de endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/rsvps` | Crear registro RSVP. Body: status, howManyMen, guests, checks, idOwnerHusbandUser, idUnit (y opcional date). Valida que el owner exista y pertenezca a la unidad. | No |
| `GET` | `/api/rsvps?from=...&to=...` | Listar por rango de fecha (createdAt). Query obligatorio: `from` y `to`. Devuelve comings, maybes, totales (howManyMen + guests para Coming). Incluye populate de owner y unit y array checks. | No |
| `GET` | `/api/rsvps/unit/:unitId?from=...&to=...` | Listar registros RSVP de una unidad específica (`unitId`) en un rango de fechas (createdAt) usando `from` y `to`. Devuelve el array plano de registros con populate de owner y unit. | No |
| `GET` | `/api/rsvps/:id` | Obtener un RSVP por ID. Incluye populate (owner: husband_first, husband_email, last_name; unit: unit_number) y array checks. | No |
| `PATCH` | `/api/rsvps/:id` | Editar RSVP (status, howManyMen, guests, checks, date, y opcionalmente idOwnerHusbandUser/idUnit con validación owner→unit). | No |
| `DELETE` | `/api/rsvps/:id` | Eliminar RSVP. **Solo** owners con rol administrador. | Sí (Owner Admin) |

Todas las respuestas están en **inglés**.

---

## 🔧 Endpoints detallados

### 1. Crear RSVP (create)

- **Método**: `POST`
- **Ruta**: `/api/rsvps`
- **Headers**: `Content-Type: application/json`

Crea un registro de RSVP. El **owner** (idOwnerHusbandUser) debe existir y su `unitId` debe coincidir con **idUnit**. La **unit** debe existir.

#### Request body

```json
{
  "status": "Coming",
  "howManyMen": 2,
  "guests": 1,
  "checks": [
    { "check": "Kosher" },
    { "check": "Vegetarian" }
  ],
  "idOwnerHusbandUser": "674a1b2c3d4e5f6789012345",
  "idUnit": "674a1b2c3d4e5f6789012346",
  "date": "2026-04-10T19:00:00.000Z"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `idOwnerHusbandUser` | ObjectId | Sí | ID del OwnerHusbandUser. Debe existir y pertenecer a la unidad indicada. |
| `idUnit` | ObjectId | Sí | ID de la Unit. Debe existir. |
| `status` | string | No | Uno de: `Coming`, `Maybe`, `Not Coming`. |
| `howManyMen` | number | No | Entero ≥ 0 (default 0). |
| `guests` | number | No | Entero ≥ 0 (default 0). |
| `checks` | array | No | Array de objetos `{ check: string }`. |
| `date` | Date/string | No | Fecha (para uso futuro). |

#### Response 201 — RSVP created

```json
{
  "success": true,
  "message": "RSVP created successfully",
  "data": {
    "_id": "...",
    "status": "Coming",
    "date": null,
    "howManyMen": 2,
    "guests": 1,
    "checks": [{ "check": "Kosher" }, { "check": "Vegetarian" }],
    "idOwnerHusbandUser": "...",
    "idUnit": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 400 — Validación

```json
{
  "success": false,
  "message": "idOwnerHusbandUser is required and must be a valid ObjectId"
}
```

```json
{
  "success": false,
  "message": "Owner does not belong to this unit"
}
```

#### Response 404 — Owner o Unit no encontrados

```json
{
  "success": false,
  "message": "Owner not found"
}
```

```json
{
  "success": false,
  "message": "Unit not found"
}
```

---

### 2. Listar RSVP por rango de fecha (list)

- **Método**: `GET`
- **Ruta**: `/api/rsvps?from=YYYY-MM-DD&to=YYYY-MM-DD`
- **Query params**: `from` y `to` son **obligatorios** (fechas en formato ISO o interpretables por `Date`). El filtro se aplica sobre **createdAt**.

Devuelve los registros cuyo `createdAt` está entre `from` y `to`, separados en dos arrays (**comings** y **maybes**) y totales solo para los de status **Coming**:
- **totalHowManyMenComing**: suma de `howManyMen` de los Coming.
- **totalGuestsComing**: suma de `guests` de los Coming.
- **total**: totalHowManyMenComing + totalGuestsComing.

Cada registro incluye **populate** de `idOwnerHusbandUser` (husband_first, husband_email, last_name) y de `idUnit` (unit_number), y el array **checks**.

#### Ejemplo de petición

```
GET /api/rsvps?from=2026-01-01&to=2026-12-31
```

#### Response 200

```json
{
  "success": true,
  "data": {
    "comings": [
      {
        "_id": "...",
        "status": "Coming",
        "date": null,
        "howManyMen": 2,
        "guests": 1,
        "checks": [{ "check": "Kosher" }],
        "idOwnerHusbandUser": {
          "_id": "...",
          "husband_first": "John",
          "husband_email": "john@example.com",
          "last_name": "Smith"
        },
        "idUnit": { "_id": "...", "unit_number": "101" },
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "maybes": [
      {
        "_id": "...",
        "status": "Maybe",
        "howManyMen": 0,
        "guests": 0,
        "checks": [],
        "idOwnerHusbandUser": { "husband_first": "Jane", "husband_email": "jane@example.com", "last_name": "Doe" },
        "idUnit": { "unit_number": "102" },
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "totalHowManyMenComing": 2,
    "totalGuestsComing": 1,
    "total": 3
  }
}
```

#### Response 400 — Faltan from/to o fechas inválidas

```json
{
  "success": false,
  "message": "Query params \"from\" and \"to\" (date range) are required"
}
```

```json
{
  "success": false,
  "message": "Invalid date format for \"from\" or \"to\""
}
```

---

### 3. Listar RSVP de una unidad por rango de fecha (listByUnit)

- **Método**: `GET`
- **Ruta**: `/api/rsvps/unit/:unitId?from=YYYY-MM-DD&to=YYYY-MM-DD`
- **Params**:
  - `unitId` (path param): **obligatorio**, ObjectId de la unidad.
  - `from` y `to` (query): **obligatorios**, fechas en formato ISO o interpretables por `Date`. El filtro se aplica sobre **createdAt**.

Devuelve los registros cuyo `idUnit` coincide con `unitId` y cuyo `createdAt` está entre `from` y `to`, como un **array plano** (sin agregación de totales). Cada registro incluye **populate** de `idOwnerHusbandUser` (husband_first, husband_email, last_name) y de `idUnit` (unit_number), y el array **checks**.

#### Ejemplo de petición

```
GET /api/rsvps/unit/674a1b2c3d4e5f6789012346?from=2026-01-01&to=2026-12-31
```

#### Response 200

```json
{
  "success": true,
  "data": [
    {
      "_id": "674a1b2c3d4e5f6789019999",
      "status": "Coming",
      "date": "2026-04-10T19:00:00.000Z",
      "howManyMen": 2,
      "guests": 1,
      "checks": [{ "check": "Kosher" }],
      "idOwnerHusbandUser": {
        "_id": "674a1b2c3d4e5f6789012345",
        "husband_first": "John",
        "husband_email": "john@example.com",
        "last_name": "Doe"
      },
      "idUnit": {
        "_id": "674a1b2c3d4e5f6789012346",
        "unit_number": "101"
      },
      "createdAt": "2026-03-15T10:00:00.000Z",
      "updatedAt": "2026-03-15T10:00:00.000Z"
    }
  ]
}
```

#### Response 400 — Validación

```json
{
  "success": false,
  "message": "Invalid unit id"
}
```

```json
{
  "success": false,
  "message": "Query params \"from\" and \"to\" (date range) are required"
}
```

```json
{
  "success": false,
  "message": "Invalid date format for \"from\" or \"to\""
}
```

#### Response 500

Internal error.

```json
{
  "success": false,
  "message": "<error message>"
}
```

---

### 4. Obtener RSVP por ID (getById)

- **Método**: `GET`
- **Ruta**: `/api/rsvps/:id`

Devuelve un único registro con **populate** de owner (husband_first, husband_email, last_name) y unit (unit_number), y el array **checks**.

#### Response 200

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "status": "Coming",
    "date": null,
    "howManyMen": 2,
    "guests": 1,
    "checks": [{ "check": "Kosher" }, { "check": "Vegetarian" }],
    "idOwnerHusbandUser": {
      "_id": "...",
      "husband_first": "John",
      "husband_email": "john@example.com",
      "last_name": "Smith"
    },
    "idUnit": { "_id": "...", "unit_number": "101" },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 400 — Invalid id

```json
{
  "success": false,
  "message": "Invalid id"
}
```

#### Response 404

```json
{
  "success": false,
  "message": "RSVP not found"
}
```

---

### 5. Editar RSVP (update)

- **Método**: `PATCH`
- **Ruta**: `/api/rsvps/:id`
- **Headers**: `Content-Type: application/json`

Actualiza los campos enviados en el body. Si se envían `idOwnerHusbandUser` o `idUnit`, se valida que el owner exista y pertenezca a esa unidad.

#### Request body (ejemplo)

```json
{
  "status": "Coming",
  "howManyMen": 3,
  "guests": 2,
  "checks": [
    { "check": "Kosher" },
    { "check": "Wheelchair access" }
  ],
  "date": "2026-04-10T19:00:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | string | Uno de: Coming, Maybe, Not Coming. |
| `howManyMen` | number | Entero ≥ 0. |
| `guests` | number | Entero ≥ 0. |
| `checks` | array | Array de `{ check: string }`. |
| `date` | Date/string | Fecha (opcional). |
| `idOwnerHusbandUser` | ObjectId | Opcional; si se cambia, se valida que pertenezca a idUnit. |
| `idUnit` | ObjectId | Opcional; si se cambia, se valida con el owner. |

#### Response 200

```json
{
  "success": true,
  "message": "RSVP updated successfully",
  "data": {
    "_id": "...",
    "status": "Coming",
    "howManyMen": 3,
    "guests": 2,
    "checks": [{ "check": "Kosher" }, { "check": "Wheelchair access" }],
    "idOwnerHusbandUser": { "husband_first": "John", "husband_email": "john@example.com", "last_name": "Smith" },
    "idUnit": { "unit_number": "101" },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 404

```json
{
  "success": false,
  "message": "RSVP not found"
}
```

---

### 6. Eliminar RSVP (delete)

- **Método**: `DELETE`
- **Ruta**: `/api/rsvps/:id`
- **Headers**: `Authorization: Bearer <idToken>` (obligatorio)
- **Auth**: Solo usuarios que sean **owners con rol administrador** (idRol = `69a4797d16285f80b89cb60b`).

No requiere body.

#### Response 200

```json
{
  "success": true,
  "message": "RSVP deleted successfully"
}
```

#### Response 401 — Sin token o token inválido

```json
{
  "success": false,
  "message": "Not authenticated. Use verifyFirebaseToken before verifyOwnerAdmin."
}
```

#### Response 403 — No es admin

```json
{
  "success": false,
  "message": "Access denied. Only administrators can perform this action."
}
```

#### Response 404

```json
{
  "success": false,
  "message": "RSVP not found"
}
```

---

## 📦 Estructura de datos

### RsvpRegister (colección rsvp_registers)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | string | `Coming`, `Maybe` o `Not Coming`. |
| `date` | Date | Fecha (reservada para uso futuro; el listado filtra por createdAt). |
| `howManyMen` | number | Cantidad de hombres (≥ 0). |
| `guests` | number | Cantidad de invitados (≥ 0). |
| `checks` | array | Lista de objetos `{ check: string }`. |
| `idOwnerHusbandUser` | ObjectId (ref OwnerHusbandUser) | Owner (marido) que registra el RSVP. |
| `idUnit` | ObjectId (ref Unit) | Unidad asociada. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

**Modelo:** `src/models/rsvp-register.model.js`.

### Relaciones

- **idOwnerHusbandUser** → documento en `OwnerHusbandUser`. En create/update se exige que ese owner tenga `unitId` igual a **idUnit**.
- **idUnit** → documento en `Unit`. Debe existir.

En las respuestas de **list** y **getById** se hace **populate**:
- **idOwnerHusbandUser**: solo `husband_first`, `husband_email`, `last_name`.
- **idUnit**: solo `unit_number`.

Cada registro devuelto incluye el array **checks** completo.

---

## 📘 Guía backend

- **Rutas**: `src/routes/rsvp.route.js`
  - `POST /` → create (público).
  - `GET /` → list (query from, to; público).
  - `GET /unit/:unitId` → listByUnit (query from, to; público).
  - `GET /:id` → getById (público).
  - `PATCH /:id` → update (público).
  - `DELETE /:id` → remove con **verifyFirebaseToken** + **verifyOwnerAdmin** (solo admin).
- **Controlador**: `src/controllers/rsvp.controller.js`
  - **create**: valida idOwnerHusbandUser e idUnit, comprueba que el owner exista y que owner.unitId === idUnit, crea documento (incluye date opcional).
  - **list**: filtra por createdAt entre from y to, populate owner y unit, separa comings y maybes, calcula totalHowManyMenComing, totalGuestsComing y total.
  - **listByUnit**: filtra por `idUnit` (path param unitId) y por createdAt entre from y to; devuelve array plano de registros con populate de owner y unit.
  - **getById**: findById con populate y array checks.
  - **update**: actualiza campos permitidos; si se cambian owner/unit, revalida pertenencia.
  - **remove**: findByIdAndDelete (solo accesible por ruta protegida).
- **Middleware**: `src/middlewares/verify-owner-admin.js` (mismo que Units/Roles; rol admin id `69a4797d16285f80b89cb60b`).
- **Modelo**: `src/models/rsvp-register.model.js`, colección `rsvp_registers`. Campos: status, date, howManyMen, guests, checks, idOwnerHusbandUser, idUnit.
- **Montaje**: En `app.js`, `app.use('/api/rsvps', rsvpRoutes)`.

---

## 📗 Guía frontend

### Crear RSVP

```javascript
const API_URL = 'https://perennialpark-api.onrender.com'; // o tu base URL

const { data } = await axios.post(
  `${API_URL}/api/rsvps`,
  {
    status: 'Coming',
    howManyMen: 2,
    guests: 1,
    checks: [{ check: 'Kosher' }, { check: 'Vegetarian' }],
    idOwnerHusbandUser: '674a1b2c3d4e5f6789012345',
    idUnit: '674a1b2c3d4e5f6789012346',
    date: '2026-04-10T19:00:00.000Z',
  },
  { headers: { 'Content-Type': 'application/json' } }
);

if (data.success) {
  console.log('RSVP created:', data.data._id);
}
```

### Listar por rango de fecha

```javascript
const from = '2026-01-01';
const to = '2026-12-31';

const { data } = await axios.get(
  `${API_URL}/api/rsvps?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
);

if (data.success) {
  const { comings, maybes, totalHowManyMenComing, totalGuestsComing, total } = data.data;
  // comings y maybes incluyen populate y array checks
}
```

### Listar RSVP de una unidad por rango de fecha

```javascript
const unitId = '674a1b2c3d4e5f6789012346';
const from = '2026-01-01';
const to = '2026-12-31';

const { data } = await axios.get(
  `${API_URL}/api/rsvps/unit/${unitId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
);

if (data.success) {
  const list = data.data; // array plano de registros RSVP de esa unidad
}
```

### Obtener por ID

```javascript
const { data } = await axios.get(`${API_URL}/api/rsvps/${rsvpId}`);
if (data.success) {
  const rsvp = data.data; // incluye checks, idOwnerHusbandUser e idUnit poblados
}
```

### Editar RSVP

```javascript
await axios.patch(
  `${API_URL}/api/rsvps/${rsvpId}`,
  {
    status: 'Maybe',
    howManyMen: 1,
    guests: 0,
    checks: [{ check: 'Kosher' }],
  },
  { headers: { 'Content-Type': 'application/json' } }
);
```

### Eliminar RSVP (solo admin)

El usuario debe estar logueado como owner con rol administrador. Incluir el token en todas las peticiones de delete.

```javascript
const token = localStorage.getItem('token'); // idToken de Firebase

await axios.delete(`${API_URL}/api/rsvps/${rsvpId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## 📝 Registro de cambios

| Fecha / contexto | Cambio |
|------------------|--------|
| **Módulo RSVP** | Rutas en `src/routes/rsvp.route.js`, controlador en `src/controllers/rsvp.controller.js`. |
| **Modelo RsvpRegister** | Colección `rsvp_registers`. Campos: status (Coming, Maybe, Not Coming), date, howManyMen, guests, checks (array de { check }), idOwnerHusbandUser (ref OwnerHusbandUser), idUnit (ref Unit). |
| **POST /api/rsvps** | Crear RSVP. Valida que el owner exista y pertenezca a la unidad. Body: idOwnerHusbandUser, idUnit (requeridos); status, howManyMen, guests, checks, date (opcionales). Respuestas en inglés. |
| **GET /api/rsvps** | Listar por rango de fecha. Query obligatorio: from, to (filtro por createdAt). Respuesta: comings, maybes, totalHowManyMenComing, totalGuestsComing, total. Populate de owner (husband_first, husband_email, last_name) y unit (unit_number). Incluye array checks en cada registro. |
| **GET /api/rsvps/unit/:unitId** | Listar RSVP de una unidad por ID y rango de fechas. Query obligatorio: from, to (filtro por createdAt). Path param: unitId (ObjectId de la unidad). Respuesta: array plano de registros con populate de owner y unit. Público. |
| **GET /api/rsvps/:id** | Obtener por ID. Populate y array checks incluidos. |
| **PATCH /api/rsvps/:id** | Actualizar campos (status, howManyMen, guests, checks, date, idOwnerHusbandUser, idUnit). Si se cambian owner/unit, se revalida pertenencia. |
| **DELETE /api/rsvps/:id** | Eliminar RSVP. Solo accesible por owners con idRol administrador (verifyFirebaseToken + verifyOwnerAdmin). |
