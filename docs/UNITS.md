# 📂 API de Units - Documentación

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
| **Auth** | **Todas** las rutas de units requieren **Firebase ID Token** y que el usuario sea un **owner (husband o wife) con idRol de administrador**. |
| **Token** | Header `Authorization: Bearer <idToken>`. El token se obtiene en `POST /api/owners/login`. |
| **Rol admin** | Solo owners (OwnerHusbandUser u OwnerWifeUser) cuyo `idRol` sea el ObjectId del rol administrador (`69a4797d16285f80b89cb60b` o `ADMIN_ROL_ID` en .env) pueden acceder al CRUD de units. |
| **Headers** | `Content-Type: application/json` para body; `Authorization: Bearer <token>` obligatorio. |

---

## 🚀 Resumen de endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/units` | Crear unidad y preliminar_owner (body: unit + preliminar_owner). | Sí (Owner Admin) |
| `GET` | `/api/units` | Listar unidades con datos vinculados: unit, husband, wife, children, preliminarOwner y message según corresponda (opcional `?status=1` o `?status=2`). | Sí (Owner Admin) |
| `GET` | `/api/units/:id` | Obtener una unidad por ID con husband, wife, children y preliminarOwner (misma estructura que un ítem del list). | Sí (Owner Admin) |
| `PATCH` | `/api/units/:id` | Editar unidad y/o husband, wife y children (body: unit, husband, wife, children; solo se actualizan los bloques enviados). | Sí (Owner Admin) |
| `DELETE` | `/api/units/:id` | Eliminar unidad y todos los registros asociados (owners, children, preliminar_owners). | Sí (Owner Admin) |
| `PATCH` | `/api/units/:id/activate` | Activar unidad (status = 1). | Sí (Owner Admin) |
| `PATCH` | `/api/units/:id/anular` | Anular unidad (status = 2). | Sí (Owner Admin) |
| `PATCH` | `/api/units/:id/unlink` | Desvincular: elimina owners, children y preliminar_owners; la unidad queda intacta (huérfana). | Sí (Owner Admin) |
| `POST` | `/api/units/:id/owners/reset-password` | Resetear contraseña de un owner: nueva contraseña = unit_number (Firebase + MongoDB). Body: `{ email }`. | Sí (Owner Admin) |
| `POST` | `/api/units/:id/owners/send-invitation` | Reenviar correo de invitación a un owner con status -1 usando su invitationToken existente. Body: `{ email }`. | Sí (Owner Admin) |

---

## 🔧 Endpoints detallados

### 1. Crear unidad (create)

- **Método**: `POST`
- **Ruta**: `/api/units`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <token>`

Crea una unidad con todos los campos opcionales excepto `unit_number`. Además crea un **PreliminarOwner** con los datos enviados en `preliminar_owner` (husband_phone, last_name) asociado al `unitId` de la unidad creada. Si ya existe una unidad con ese `unit_number`, responde 409.

#### Request body

Puede enviarse con objeto `unit` y `preliminar_owner` o con los campos de unidad en la raíz y `preliminar_owner` anidado.

```json
{
  "unit": {
    "unit_number": "102",
    "address": "456 Oak Ave",
    "city": "Brooklyn",
    "state": "NY",
    "zip": "11202",
    "colony_name": "North",
    "notes": ""
  },
  "preliminar_owner": {
    "husband_phone": "+1 555 111 2233",
    "last_name": "Doe"
  }
}
```

| Sección | Campo | Tipo | Requerido | Descripción |
|---------|-------|------|-----------|-------------|
| unit (o raíz) | `unit_number` | string | Sí | Número de unidad (único). |
| unit (o raíz) | `address`, `city`, `state`, `zip`, `colony_name`, `notes` | string | No | Datos de la unidad. |
| preliminar_owner | `husband_phone` | string | No | Teléfono para el preliminar owner. |
| preliminar_owner | `last_name` | string | No | Apellido para el preliminar owner. |

#### Response 201 — Unit created

```json
{
  "success": true,
  "message": "Unit created successfully",
  "data": {
    "_id": "674a1b2c3d4e5f6789012345",
    "unit_number": "102",
    "address": "456 Oak Ave",
    "city": "Brooklyn",
    "state": "NY",
    "zip": "11202",
    "colony_name": "North",
    "notes": "",
    "status": 1,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Response 400 — unit_number required

```json
{
  "success": false,
  "message": "unit_number is required"
}
```

#### Response 409 — unit_number duplicate

```json
{
  "success": false,
  "message": "A unit with this unit_number already exists"
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

### 2. Listar unidades (list)

- **Método**: `GET`
- **Ruta**: `/api/units`
- **Query**: `status` (opcional) — `1` activo, `2` inactivo.

Devuelve un array de objetos. Cada objeto incluye la **unit**, los **owners** vinculados por `unitId` (husband y/o wife con nombre, apellido, email, teléfono, password y **status**), los **children** de esa unidad (name, age, genre) y, si la unidad no tiene owners, el **preliminarOwner** (si existe) y un **message** en inglés.

- **Si la unidad tiene al menos un owner (husband o wife):** `husband` y `wife` contienen los datos o `null`; `message` y `preliminarOwner` son `null`.
- **Si la unidad no tiene owners:** se consulta PreliminarOwner; si existe, `preliminarOwner` tiene `husband_phone` y `last_name` y `message` es `"Unit without owners."`; si no existe preliminar, `preliminarOwner` es `null` y `message` es `"No owners, invitees or registered for this unit."`
- **children** es siempre un array (vacío si la unidad no tiene hijos).

#### Response 200

```json
{
  "success": true,
  "data": [
    {
      "unit": {
        "_id": "...",
        "unit_number": "102",
        "address": "456 Oak Ave",
        "city": "Brooklyn",
        "state": "NY",
        "zip": "11202",
        "colony_name": "North",
        "notes": "",
        "status": 1,
        "createdAt": "...",
        "updatedAt": "..."
      },
      "husband": {
        "husband_first": "John",
        "last_name": "Smith",
        "husband_email": "john@example.com",
        "husband_phone": "+1234567890",
        "password": "...",
        "status": 1
      },
      "wife": {
        "wife_first": "Mary",
        "last_name": "Smith",
        "wife_email": "mary@example.com",
        "wife_phone": "+0987654321",
        "password": null,
        "status": -1
      },
      "message": null,
      "preliminarOwner": null,
      "children": [
        { "name": "Emma", "age": 10, "genre": "Girl" },
        { "name": "James", "age": 7, "genre": "Boy" }
      ]
    },
    {
      "unit": { "_id": "...", "unit_number": "103", ... },
      "husband": null,
      "wife": null,
      "message": "No owners, invitees or registered for this unit.",
      "preliminarOwner": null,
      "children": []
    }
  ]
}
```

| Campo en cada ítem de `data` | Descripción |
|-----------------------------|-------------|
| `unit` | Objeto con los datos de la unidad. |
| `husband` | Objeto con `husband_first`, `last_name`, `husband_email`, `husband_phone`, `password`, `status` (-1 pending, 0 anulado, 1 activo) o `null` si no hay husband. |
| `wife` | Objeto con `wife_first`, `last_name`, `wife_email`, `wife_phone`, `password`, `status` (-1 pending, 0 anulado, 1 activo) o `null` si no hay wife. |
| `message` | `null` si hay owners; si no hay owners: `"Unit without owners."` (hay preliminar) o `"No owners, invitees or registered for this unit."` (no hay preliminar). |
| `preliminarOwner` | `null` si hay owners; si no hay owners y existe PreliminarOwner: `{ husband_phone, last_name }`; si no existe: `null`. |
| `children` | Array de `{ name, age, genre }` vinculados por `unitId`; puede ser `[]`. |

---

### 3. Obtener unidad por ID (getById)

- **Método**: `GET`
- **Ruta**: `/api/units/:id`

Devuelve la misma estructura que un ítem del list: **unit**, **husband**, **wife**, **children**, **preliminarOwner** y **message** según corresponda (igual lógica que en list).

#### Response 200

```json
{
  "success": true,
  "data": {
    "unit": { "_id": "...", "unit_number": "102", "address": "...", "city": "...", "state": "...", "zip": "...", "colony_name": "...", "notes": "...", "status": 1, "createdAt": "...", "updatedAt": "..." },
    "husband": { "husband_first": "John", "last_name": "Smith", "husband_email": "john@example.com", "husband_phone": "+1234567890", "password": "...", "status": 1 },
      "wife": { "wife_first": "Mary", "last_name": "Smith", "wife_email": "mary@example.com", "wife_phone": "+0987654321", "password": null, "status": -1 },
    "message": null,
    "preliminarOwner": null,
    "children": [ { "name": "Emma", "age": 10, "genre": "Girl" } ]
  }
}
```

#### Response 404

```json
{
  "success": false,
  "message": "Unit not found"
}
```

---

### 4. Editar unidad (update)

- **Método**: `PATCH`
- **Ruta**: `/api/units/:id`
- **Body**: Se pueden enviar **unit**, **husband**, **wife** y/o **children**. Solo se actualizan los bloques presentes; dentro de cada bloque solo se modifican los campos enviados (actualización parcial). Si se envía `unit_number` y ya existe otra unidad con ese número, responde 409.

#### Request body — bloques opcionales

| Bloque | Campos | Descripción |
|--------|--------|-------------|
| `unit` (o campos en raíz) | `unit_number`, `address`, `city`, `state`, `zip`, `colony_name`, `notes`, `status` | Actualiza la Unit. |
| `husband` | `husband_first`, `last_name`, `husband_email`, `husband_phone`, `password`, `status` | Actualiza o crea (upsert) el OwnerHusbandUser de esta unidad. |
| `wife` | `wife_first`, `last_name`, `wife_email`, `wife_phone`, `password`, `status` | Actualiza o crea (upsert) el OwnerWifeUser de esta unidad. |
| `children` | Array de `{ name, age, genre }` | Reemplaza la lista de hijos: se borran los actuales y se insertan los del array. Enviar `[]` deja la unidad sin hijos. |

#### Request body (ejemplo — solo unidad)

```json
{
  "unit": {
    "address": "789 New Street",
    "city": "Manhattan",
    "notes": "Updated notes"
  }
}
```

#### Request body (ejemplo — unidad + owners + children)

```json
{
  "unit": {
    "unit_number": "101",
    "address": "123 Main St",
    "city": "City",
    "state": "ST",
    "zip": "12345",
    "colony_name": "North",
    "notes": "",
    "status": 1
  },
  "husband": {
    "husband_first": "John",
    "last_name": "Doe",
    "husband_email": "john@example.com",
    "husband_phone": "+1234567890",
    "password": "plain-or-hashed",
    "status": 1
  },
  "wife": {
    "wife_first": "Jane",
    "last_name": "Doe",
    "wife_email": "jane@example.com",
    "wife_phone": "+0987654321",
    "password": "...",
    "status": -1
  },
  "children": [
    { "name": "Child1", "age": 8, "genre": "M" },
    { "name": "Child2", "age": 5, "genre": "F" }
  ]
}
```

#### Response 200

`data` tiene la misma estructura que **getById**: `{ unit, husband, wife, children, preliminarOwner?, message? }`.

```json
{
  "success": true,
  "message": "Unit updated",
  "data": {
    "unit": { ... },
    "husband": { "husband_first": "John", "last_name": "Doe", "husband_email": "john@example.com", "husband_phone": "+1234567890", "password": "...", "status": 1 },
    "wife": { "wife_first": "Jane", "last_name": "Doe", "wife_email": "jane@example.com", "wife_phone": "+0987654321", "password": "...", "status": -1 },
    "message": null,
    "preliminarOwner": null,
    "children": [ { "name": "Child1", "age": 8, "genre": "M" }, { "name": "Child2", "age": 5, "genre": "F" } ]
  }
}
```

#### Response 404

```json
{
  "success": false,
  "message": "Unit not found"
}
```

#### Response 409 — unit_number ya existe

Si se intenta cambiar `unit_number` a un valor que ya tiene otra unidad:

```json
{
  "success": false,
  "message": "A unit with this unit_number already exists"
}
```

---

### 5. Eliminar unidad (remove)

- **Método**: `DELETE`
- **Ruta**: `/api/units/:id`

Elimina la unidad y en cascada todos los registros asociados por `unitId`: **OwnerHusbandUser**, **OwnerWifeUser**, **Children** y **PreliminarOwner**.

#### Response 200

```json
{
  "success": true,
  "message": "Unit and associated data deleted successfully"
}
```

#### Response 404

```json
{
  "success": false,
  "message": "Unit not found"
}
```

---

### 6. Activar unidad (activate)

- **Método**: `PATCH`
- **Ruta**: `/api/units/:id/activate`

Establece `status = 1` (activo).

#### Response 200

```json
{
  "success": true,
  "message": "Unit activated",
  "data": { ... }
}
```

---

### 7. Anular unidad (anular)

- **Método**: `PATCH`
- **Ruta**: `/api/units/:id/anular`

Establece `status = 2` (inactivo).

#### Response 200

```json
{
  "success": true,
  "message": "Unit deactivated",
  "data": { ... }
}
```

---

### 8. Desvincular unidad (unlink)

- **Método**: `PATCH`
- **Ruta**: `/api/units/:id/unlink`

Elimina todos los **OwnerHusbandUser**, **OwnerWifeUser**, **Children** y **PreliminarOwner** asociados a esa unidad por `unitId`. **La Unit no se modifica** (sus datos quedan intactos); la unidad queda "huérfana" y puede volver a vincularse después.

#### Response 200

```json
{
  "success": true,
  "message": "Unit unlinked. Owners, children and preliminary owners have been removed. The unit data remains unchanged."
}
```

#### Response 404

```json
{
  "success": false,
  "message": "Unit not found"
}
```

---

### 9. Resetear contraseña de owner (reset-password)

- **Método**: `POST`
- **Ruta**: `/api/units/:id/owners/reset-password`
- **Body**: `{ "email": "owner@ejemplo.com" }`

El admin puede resetear la contraseña de un owner (husband o wife) de esa unidad. La **nueva contraseña** será el **unit_number** de la unidad. Se busca el owner por `unitId` y `email` (husband_email o wife_email). Si el owner tiene `firebase_uid`, se actualiza la contraseña en **Firebase Auth**; en **MongoDB** se actualiza siempre el campo `password` del owner a `unit_number`.

#### Request body

```json
{
  "email": "propietario@ejemplo.com"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | Sí | Correo del owner (husband_email o wife_email) de esta unidad. |

#### Response 200

```json
{
  "success": true,
  "message": "Password has been reset. The new password is the unit number."
}
```

#### Response 404

```json
{
  "success": false,
  "message": "Unit not found"
}
```

```json
{
  "success": false,
  "message": "No owner found with this email for this unit"
}
```

#### Response 500 (Firebase)

If the owner has a Firebase account and the update fails:

```json
{
  "success": false,
  "message": "Failed to update password in Firebase"
}
```

---

### 10. Reenviar invitación (send-invitation)

- **Método**: `POST`
- **Ruta**: `/api/units/:id/owners/send-invitation`
- **Body**: `{ "email": "pending@ejemplo.com" }`

El admin puede reenviar el correo de invitación a un owner que tenga **status -1** (pendiente). Se usa el **invitationToken** que ya tiene el registro (no se genera uno nuevo). El correo se envía en inglés y personalizado por Nodemailer.

#### Request body

```json
{
  "email": "mary@ejemplo.com"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | Sí | Correo del owner pendiente (husband_email o wife_email) de esta unidad. |

#### Response 200

```json
{
  "success": true,
  "message": "Invitation email sent successfully"
}
```

#### Response 400

Owner is not pending or has no invitationToken:

```json
{
  "success": false,
  "message": "Invitations can only be resent to owners with pending status (-1)"
}
```

```json
{
  "success": false,
  "message": "This owner has no invitation code"
}
```

#### Response 404

```json
{
  "success": false,
  "message": "No owner found with this email for this unit"
}
```

#### Response 500

Failed to send email (Nodemailer).

```json
{
  "success": false,
  "message": "Failed to send email"
}
```

---

## 📦 Estructura de datos

### Unit

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `unit_number` | string | Número de unidad (único). |
| `address`, `city`, `state`, `zip`, `colony_name`, `notes` | string | Datos de la unidad. |
| `status` | number | `1` = activo, `2` = inactivo (default 1). |
| `createdAt`, `updatedAt` | Date | Timestamps. |

### PreliminarOwner (colección preliminar_owners)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `unitId` | ObjectId (ref Unit) | Unidad asociada. |
| `husband_phone` | string | Teléfono. |
| `last_name` | string | Apellido. |

Se crea al crear una unidad y se elimina en cascada al eliminar la unidad.

### Husband / Wife (en list y getById)

En las respuestas de **GET /api/units** y **GET /api/units/:id**, `husband` y `wife` (cuando existen) incluyen: `husband_first`/`wife_first`, `last_name`, `husband_email`/`wife_email`, `husband_phone`/`wife_phone`, `password` y **`status`**. Valores de `status`: `-1` = pendiente, `0` = anulado, `1` = activo.

### Children (en list y getById)

En la respuesta de **GET /api/units** y **GET /api/units/:id**, cada ítem incluye `children`: array de objetos con `name`, `age` y `genre`, vinculados a la unidad por `unitId`. Si la unidad no tiene hijos, `children` es `[]`. Modelo: `src/models/children.model.js`.

### Rol (colección rol)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Nombre del rol. |
| `description` | string | Descripción. |

El rol administrador tiene `_id`: `69a4797d16285f80b89cb60b` (o el definido en `ADMIN_ROL_ID`). Los modelos **OwnerHusbandUser** y **OwnerWifeUser** tienen `idRol` (ref Rol); solo quienes tengan ese idRol pueden acceder al CRUD de units.

### Eliminación en cascada (delete unit)

Al eliminar una unidad se ejecuta:

- `OwnerHusbandUser.deleteMany({ unitId })`
- `OwnerWifeUser.deleteMany({ unitId })`
- `Children.deleteMany({ unitId })`
- `PreliminarOwner.deleteMany({ unitId })`
- `Unit.findByIdAndDelete(unitId)`

### Unlink (desvincular)

Al llamar a **unlink** se eliminan solo los datos vinculados; **la Unit no se borra ni se modifica**:

- `OwnerHusbandUser.deleteMany({ unitId })`
- `OwnerWifeUser.deleteMany({ unitId })`
- `Children.deleteMany({ unitId })`
- `PreliminarOwner.deleteMany({ unitId })`

La unidad queda con sus campos (unit_number, address, etc.) intactos y puede volver a tener owners después.

---

## 📘 Guía backend

- **Rutas**: `src/routes/units.route.js` — todas protegidas con `requireOwnerAdmin` (verifyFirebaseToken + verifyOwnerAdmin).
- **Controlador**: `src/controllers/units.controller.js` — create (Unit + PreliminarOwner), **list** (con filtro status; devuelve por cada unidad: unit, husband, wife —con husband_phone/wife_phone y status—, children, preliminarOwner y message), **getById** (misma estructura que un ítem del list: unit + husband + wife + children + preliminarOwner/message), **update** (acepta unit, husband, wife y children; actualización parcial por bloques; devuelve el ítem completo), remove (cascada), activate, anular, **unlink** (elimina owners/children/preliminar, unit intacta), **resetPassword** (nueva contraseña = unit_number en Firebase y MongoDB), **sendInvitation** (reenvío con invitationToken existente, Nodemailer).
- **Middleware**: `src/middlewares/verify-owner-admin.js` — comprueba que el usuario sea OwnerHusbandUser u OwnerWifeUser con `idRol` = ADMIN_ROL_ID (`69a4797d16285f80b89cb60b` o variable de entorno).
- **Modelos**: Unit (`src/models/unit.model.js`), PreliminarOwner (`src/models/preliminar-owner.model.js`), Rol (`src/models/rol.model.js`). OwnerHusbandUser y OwnerWifeUser tienen `idRol` (ref Rol).
- **Montaje**: En `app.js`, `app.use('/api/units', unitsRoutes)`.

---

## 📗 Guía frontend

### Requisito previo

El usuario debe haber hecho **login** como owner con rol administrador y guardar el token. Todas las peticiones deben incluir `Authorization: Bearer <token>`.

### Crear unidad

```javascript
const token = localStorage.getItem('token'); // o el que obtuviste en login

const { data } = await axios.post(
  `${API_URL}/api/units`,
  {
    unit: {
      unit_number: '102',
      address: '456 Oak Ave',
      city: 'Brooklyn',
      state: 'NY',
      zip: '11202',
      colony_name: 'North',
      notes: '',
    },
    preliminar_owner: {
      husband_phone: '+1 555 111 2233',
      last_name: 'Doe',
    },
  },
  {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }
);

if (data.success) {
  console.log('Unit created:', data.data._id);
}
```

### Listar unidades

Cada ítem de `data` incluye `unit`, `husband`, `wife` (con `status`: -1 pendiente, 0 anulado, 1 activo), `children`, `preliminarOwner` y `message`. Usar `item.unit` para los datos de la unidad, `item.husband` / `item.wife` para owners vinculados y `item.children` para los hijos.

```javascript
const config = { headers: { Authorization: `Bearer ${token}` } };

const { data } = await axios.get(`${API_URL}/api/units`, config);
const soloActivas = await axios.get(`${API_URL}/api/units?status=1`, config);
const soloInactivas = await axios.get(`${API_URL}/api/units?status=2`, config);

// Ejemplo: primer ítem con owners e hijos
if (data.success && data.data.length) {
  const first = data.data[0];
  console.log('Unit:', first.unit.unit_number, first.unit.address);
  console.log('Husband:', first.husband?.husband_first, first.husband?.husband_email, 'status:', first.husband?.status);
  console.log('Wife:', first.wife?.wife_first, first.wife?.wife_email, 'status:', first.wife?.status);
  console.log('Children:', first.children);
  if (first.message) console.log('Message:', first.message);
}
```

### Obtener una unidad

La respuesta tiene la misma estructura que un ítem del list: `data.unit`, `data.husband`, `data.wife`, `data.children`, `data.preliminarOwner`, `data.message`.

```javascript
const { data } = await axios.get(`${API_URL}/api/units/${id}`, config);
if (data.success) {
  console.log('Unit:', data.data.unit);
  console.log('Husband:', data.data.husband?.husband_first, data.data.husband?.status);
  console.log('Wife:', data.data.wife?.wife_first, data.data.wife?.status);
  console.log('Children:', data.data.children);
}
```

### Editar unidad (y/o husband, wife, children)

Puedes enviar solo los bloques que quieras actualizar. La respuesta devuelve el ítem completo (unit + husband + wife + children).

```javascript
// Solo datos de la unidad
await axios.patch(
  `${API_URL}/api/units/${id}`,
  { unit: { address: '789 New St', city: 'Manhattan', notes: 'Updated' } },
  config
);

// Unidad + owners + children
await axios.patch(
  `${API_URL}/api/units/${id}`,
  {
    unit: { unit_number: '101', address: '123 Main St', city: 'City', state: 'ST', zip: '12345', status: 1 },
    husband: { husband_first: 'John', last_name: 'Doe', husband_email: 'john@example.com', husband_phone: '+1234567890', status: 1 },
    wife: { wife_first: 'Jane', last_name: 'Doe', wife_email: 'jane@example.com', wife_phone: '+0987654321', status: -1 },
    children: [ { name: 'Child1', age: 8, genre: 'M' }, { name: 'Child2', age: 5, genre: 'F' } ],
  },
  config
);
```

### Activar / Anular

```javascript
await axios.patch(`${API_URL}/api/units/${id}/activate`, {}, config);
await axios.patch(`${API_URL}/api/units/${id}/anular`, {}, config);
```

### Eliminar unidad

```javascript
await axios.delete(`${API_URL}/api/units/${id}`, config);
// Elimina también owners, children y preliminar_owners asociados
```

### Desvincular unidad (unlink)

```javascript
await axios.patch(`${API_URL}/api/units/${id}/unlink`, {}, config);
// Elimina owners, children y preliminar_owners; la unidad queda intacta
```

### Resetear contraseña de un owner

```javascript
await axios.post(
  `${API_URL}/api/units/${unitId}/owners/reset-password`,
  { email: 'owner@ejemplo.com' },
  { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
);
// Nueva contraseña = unit_number (en Firebase y en MongoDB)
```

### Reenviar invitación a owner pendiente

```javascript
await axios.post(
  `${API_URL}/api/units/${unitId}/owners/send-invitation`,
  { email: 'pending@ejemplo.com' },
  { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
);
// Usa el invitationToken existente del owner (status -1)
```

---

## 📝 Registro de cambios y agregaciones

| Fecha / contexto | Cambio |
|------------------|--------|
| **CRUD Units** | Rutas en `src/routes/units.route.js`, controlador en `src/controllers/units.controller.js`. Solo accesible por owners con idRol administrador (verifyFirebaseToken + verifyOwnerAdmin). |
| **Unit model** | Campo `status` (1 = activo, 2 = inactivo), default 1. |
| **PreliminarOwner** | Modelo `src/models/preliminar-owner.model.js`, colección `preliminar_owners`. Keys: unitId, husband_phone, last_name. Se crea en el create de unidad y se elimina en cascada al borrar la unidad. |
| **Rol** | Modelo `src/models/rol.model.js`, colección `rol`. Keys: name, description. idRol administrador: `69a4797d16285f80b89cb60b`. |
| **OwnerHusbandUser / OwnerWifeUser** | Campo `idRol` (ref Rol) para restringir el CRUD de units a administradores. |
| **DELETE unit** | Elimina en cascada OwnerHusbandUser, OwnerWifeUser, Children y PreliminarOwner con ese unitId. |
| **PATCH /api/units/:id/unlink** | Desvincular: elimina owners, children y preliminar_owners; la Unit no se modifica (queda huérfana). |
| **POST /api/units/:id/owners/reset-password** | Body `{ email }`. Nueva contraseña = unit_number; actualiza Firebase (si tiene firebase_uid) y campo password en MongoDB. |
| **POST /api/units/:id/owners/send-invitation** | Body `{ email }`. Reenvía correo de invitación (inglés, Nodemailer) a owner con status -1 usando su invitationToken existente. |
| **GET /api/units (list)** | Devuelve array de objetos enriquecidos: cada ítem tiene `unit`, `husband`, `wife` (con `status`: -1/0/1), `children`, `preliminarOwner` y `message`. Si no hay owners, se consulta PreliminarOwner y se devuelve mensaje en inglés. |
| **GET /api/units/:id (getById)** | Devuelve la misma estructura que un ítem del list: unit, husband, wife, children, preliminarOwner y message. |
| **PATCH /api/units/:id (update)** | Acepta body con `unit`, `husband`, `wife` y/o `children`; solo actualiza los bloques enviados (parcial). Husband/wife: upsert por unitId (incluye husband_phone, wife_phone). Children: reemplazo completo del array. Respuesta 409 si `unit_number` ya existe en otra unidad. Devuelve el ítem completo en `data`. |
| **Husband / Wife en respuestas** | En list, getById y update, los objetos `husband` y `wife` incluyen `husband_phone` y `wife_phone` además de nombre, email, password y status. |
