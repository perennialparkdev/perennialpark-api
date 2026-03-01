# 📂 API de Roles - Documentación

## Índice
- [Seguridad](#-seguridad-y-autenticación)
- [Resumen de endpoints](#-resumen-de-endpoints)
- [Endpoints detallados](#-endpoints-detallados)
- [Estructura de datos](#-estructura-de-datos)
- [Guía backend](#-guía-backend)
- [Guía frontend](#-guía-frontend)
- [Registro de cambios](#-registro-de-cambios-y-agregaciones)

---

## 🔐 Seguridad y autenticación

| Aspecto | Detalle |
|--------|---------|
| **Auth** | **Todas** las rutas de roles requieren **Firebase ID Token** y que el usuario sea un **owner (husband o wife) con idRol de administrador**. |
| **Token** | Header `Authorization: Bearer <idToken>`. El token se obtiene en `POST /api/owners/login`. |
| **Rol admin** | Solo owners (OwnerHusbandUser u OwnerWifeUser) cuyo `idRol` sea el ObjectId del rol administrador (`69a4797d16285f80b89cb60b` o `ADMIN_ROL_ID` en .env) pueden acceder al CRUD de roles. |
| **Headers** | `Content-Type: application/json` para body; `Authorization: Bearer <token>` obligatorio. |

---

## 🚀 Resumen de endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/roles` | Crear rol (body: name, description, status). | Sí (Owner Admin) |
| `GET` | `/api/roles` | Listar roles (opcional `?status=1` o `?status=2`). | Sí (Owner Admin) |
| `GET` | `/api/roles/:id` | Obtener un rol por ID. | Sí (Owner Admin) |
| `PATCH` | `/api/roles/:id` | Editar rol. | Sí (Owner Admin) |
| `PATCH` | `/api/roles/:id/activate` | Activar rol (status = 1). | Sí (Owner Admin) |
| `PATCH` | `/api/roles/:id/anular` | Anular rol (status = 2). | Sí (Owner Admin) |

Todas las respuestas de la API están en **inglés**.

---

## 🔧 Endpoints detallados

### 1. Crear rol (create)

- **Método**: `POST`
- **Ruta**: `/api/roles`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <token>`

Crea un rol con `name` (requerido), `description` y `status`. Si ya existe un rol con el mismo nombre (insensible a mayúsculas), responde 409.

#### Request body

```json
{
  "name": "Manager",
  "description": "Can manage units and view reports",
  "status": 1
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | string | Sí | Nombre del rol (único). |
| `description` | string | No | Descripción del rol. |
| `status` | number | No | `1` = active, `2` = inactive (default 1). |

#### Response 201 — Role created

```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "_id": "674a1b2c3d4e5f6789012345",
    "name": "Manager",
    "description": "Can manage units and view reports",
    "status": 1,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 400 — name required

```json
{
  "success": false,
  "message": "name is required"
}
```

#### Response 409 — Role name duplicate

```json
{
  "success": false,
  "message": "A role with this name already exists"
}
```

#### Response 401 / 403

Missing or invalid token, or user is not an admin owner.

```json
{
  "success": false,
  "message": "Authentication token required"
}
```

```json
{
  "success": false,
  "message": "Access denied. Only administrators can perform this action."
}
```

---

### 2. Listar roles (list)

- **Método**: `GET`
- **Ruta**: `/api/roles`
- **Query**: `status` (opcional) — `1` active, `2` inactive.

Devuelve un array de roles ordenados por `createdAt` descendente. Si se envía `?status=1` o `?status=2`, solo se listan roles con ese estado.

#### Response 200

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Admin",
      "description": "Full access",
      "status": 1,
      "createdAt": "...",
      "updatedAt": "..."
    },
    {
      "_id": "...",
      "name": "Manager",
      "description": "Can manage units",
      "status": 1,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### 3. Obtener rol por ID (getById)

- **Método**: `GET`
- **Ruta**: `/api/roles/:id`

#### Response 200

Role object.

```json
{
  "success": true,
  "data": {
    "_id": "674a1b2c3d4e5f6789012345",
    "name": "Admin",
    "description": "Full access",
    "status": 1,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 404

```json
{
  "success": false,
  "message": "Role not found"
}
```

---

### 4. Editar rol (update)

- **Método**: `PATCH`
- **Ruta**: `/api/roles/:id`
- **Body**: Campos a actualizar (`name`, `description`, `status`).

#### Request body (ejemplo)

```json
{
  "name": "Supervisor",
  "description": "Updated description",
  "status": 1
}
```

#### Response 200

```json
{
  "success": true,
  "message": "Role updated",
  "data": {
    "_id": "...",
    "name": "Supervisor",
    "description": "Updated description",
    "status": 1,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 404

```json
{
  "success": false,
  "message": "Role not found"
}
```

---

### 5. Activar rol (activate)

- **Método**: `PATCH`
- **Ruta**: `/api/roles/:id/activate`

Establece `status = 1` (active).

#### Response 200

```json
{
  "success": true,
  "message": "Role activated",
  "data": {
    "_id": "...",
    "name": "Manager",
    "description": "...",
    "status": 1,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 404

```json
{
  "success": false,
  "message": "Role not found"
}
```

---

### 6. Anular rol (anular)

- **Método**: `PATCH`
- **Ruta**: `/api/roles/:id/anular`

Establece `status = 2` (inactive).

#### Response 200

```json
{
  "success": true,
  "message": "Role deactivated",
  "data": {
    "_id": "...",
    "name": "Manager",
    "description": "...",
    "status": 2,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 404

```json
{
  "success": false,
  "message": "Role not found"
}
```

---

## 📦 Estructura de datos

### Rol (colección rol)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Nombre del rol (único, case-insensitive en create). |
| `description` | string | Descripción del rol. |
| `status` | number | `1` = active, `2` = inactive (default 1). |
| `createdAt`, `updatedAt` | Date | Timestamps. |

Modelo: `src/models/rol.model.js`. El rol administrador usado para proteger Units y Roles tiene `_id`: `69a4797d16285f80b89cb60b` (o el definido en `ADMIN_ROL_ID`).

---

## 📘 Guía backend

- **Rutas**: `src/routes/roles.route.js` — todas protegidas con `requireOwnerAdmin` (verifyFirebaseToken + verifyOwnerAdmin).
- **Controlador**: `src/controllers/roles.controller.js` — create (name requerido, nombre único), list (filtro opcional por status), getById, update, activate, anular. Todas las respuestas en inglés.
- **Middleware**: `src/middlewares/verify-owner-admin.js` — comprueba que el usuario sea OwnerHusbandUser u OwnerWifeUser con `idRol` = ADMIN_ROL_ID (`69a4797d16285f80b89cb60b` o variable de entorno).
- **Modelo**: Rol (`src/models/rol.model.js`), colección `rol`. Campos: name, description, status.
- **Montaje**: En `app.js`, `app.use('/api/roles', rolesRoutes)`.

---

## 📗 Guía frontend

### Requisito previo

El usuario debe haber hecho **login** como owner con rol administrador y guardar el token. Todas las peticiones deben incluir `Authorization: Bearer <token>`.

### Crear rol

```javascript
const token = localStorage.getItem('token');

const { data } = await axios.post(
  `${API_URL}/api/roles`,
  {
    name: 'Manager',
    description: 'Can manage units and view reports',
    status: 1,
  },
  {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }
);

if (data.success) {
  console.log('Role created:', data.data._id);
}
```

### Listar roles

```javascript
const config = { headers: { Authorization: `Bearer ${token}` } };

const all = await axios.get(`${API_URL}/api/roles`, config);
const activeOnly = await axios.get(`${API_URL}/api/roles?status=1`, config);
const inactiveOnly = await axios.get(`${API_URL}/api/roles?status=2`, config);
```

### Obtener un rol

```javascript
const rol = await axios.get(`${API_URL}/api/roles/${id}`, config);
```

### Editar rol

```javascript
await axios.patch(
  `${API_URL}/api/roles/${id}`,
  { name: 'Supervisor', description: 'Updated', status: 1 },
  config
);
```

### Activar / Anular

```javascript
await axios.patch(`${API_URL}/api/roles/${id}/activate`, {}, config);
await axios.patch(`${API_URL}/api/roles/${id}/anular`, {}, config);
```

---

## 📝 Registro de cambios y agregaciones

| Fecha / contexto | Cambio |
|------------------|--------|
| **CRUD Roles** | Rutas en `src/routes/roles.route.js`, controlador en `src/controllers/roles.controller.js`. Solo accesible por owners con idRol administrador (verifyFirebaseToken + verifyOwnerAdmin). |
| **Rol model** | Campo `status` (1 = active, 2 = inactive), default 1. |
| **POST /api/roles** | Crear rol. Body: name (requerido), description, status. 409 si el nombre ya existe (case-insensitive). Respuestas en inglés. |
| **GET /api/roles** | Listar roles. Query opcional `?status=1` o `?status=2`. Orden por createdAt descendente. |
| **GET /api/roles/:id** | Obtener rol por ID. 404 si no existe. |
| **PATCH /api/roles/:id** | Actualizar name, description, status. |
| **PATCH /api/roles/:id/activate** | status = 1. |
| **PATCH /api/roles/:id/anular** | status = 2. |
