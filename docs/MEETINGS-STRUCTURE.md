# 📂 API de Meetings & Announcements - Documentación

Documentación de la API de **reuniones y anuncios** basada en la jerarquía  
**Category → Type → Meeting (o modelo especial)**.

Incluye:
- Cómo se asegura y quién puede usar las rutas.
- Resumen de endpoints.
- Detalle de `/structure` y del CRUD por `modelKey`.
- Estructura de datos (Categories, Types, modelos y seed).
- Guía backend y guía frontend.

---

## Índice

- [Seguridad y autenticación](#-seguridad-y-autenticación)
- [Resumen de endpoints](#-resumen-de-endpoints)
- [Endpoints detallados](#-endpoints-detallados)
- [Estructura de datos](#-estructura-de-datos)
- [Guía backend](#-guía-backend)
- [Guía frontend](#-guía-frontend)
- [Orden del flujo (ejemplo)](#-orden-del-flujo-ejemplo)
- [Registro de cambios](#-registro-de-cambios)

---

## 🔐 Seguridad y autenticación

| Aspecto | Detalle |
|--------|---------|
| **Base URL** | `/api/meetings` |
| **Auth** | **Todas** las rutas requieren token Firebase + rol **owner admin o gabaim** (Manage Davening Times). |
| **Token** | Se envía en header `Authorization: Bearer <idToken>` igual que en Units/Roles. |
| **Roles** | El middleware `verifyOwnerAdminOrGabaim` comprueba que el owner (husband o wife) tenga `idRol` de **administrador** o **gabaim** (Davening Times Only). |
| **Headers** | `Content-Type: application/json` para los endpoints con body. |

### Formato del campo `period` (semana)

Para que API y frontend coincidan, **`period`** se define así:

- **Formato:** `YYYY-MM-DD` (año-mes-día separado por guión; fecha en ISO).
- **Significado:** Fecha del **lunes** de la semana. La semana va de **lunes a domingo**.
- **Ejemplo:** `2026-03-02` = semana del lunes 2 de marzo al domingo 8 de marzo de 2026.

En backend, el campo `period` está formalizado en todos los modelos de meetings y announcements mediante la definición compartida en `src/models/common-fields.js` (`periodField()`), que valida que el valor sea `null`, vacío o una cadena en formato `YYYY-MM-DD`.

Todas las operaciones que usen semana (list con filtro `period`, create/update con `period`, delete por semana) deben usar el mismo valor para una misma semana (el lunes en `YYYY-MM-DD`).

---

## 🚀 Resumen de endpoints

### Estructura de tipos (para front)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/meetings/structure` | Devuelve **todas las categorías** con sus **types**, y para cada type: `_id`, `name`, `weekDay`, `modelKey` y `fields`. Es la “guía” para saber qué modelo usar y qué campos mostrar. | Sí (Bearer + admin o gabaim) |

### CRUD genérico por `modelKey`

Todas estas rutas usan un **`modelKey`** que identifica el modelo/colección que se va a usar.  
El `modelKey` es el que devuelve `/structure` para cada Type.

ModelKeys permitidos actualmente:

`meeting`, `shabbos-mevorchim-meeting`, `daf-yomi-meeting`,  
`additional-shiurim-meeting`, `announcements-notes-meeting`,  
`pirkei-avis-shiur-announcements`, `mazel-tov-announcements`,  
`avos-ubonim-sponsor-announcements`.

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/meetings/:modelKey` | Lista registros de ese modelo. Query opcionales: `status`, `idType`, `period` (YYYY-MM-DD, lunes de la semana). | Sí |
| `DELETE` | `/api/meetings/period/:period` | Elimina **todos** los registros (todos los modelKeys) cuya semana sea `period` (YYYY-MM-DD). Devuelve conteo por modelo. | Sí |
| `POST` | `/api/meetings/:modelKey` | Crea un nuevo registro en la colección asociada al `modelKey`. Requiere `idType` + campos del modelo. | Sí |
| `GET` | `/api/meetings/:modelKey/:id` | Obtiene un registro por `_id`. | Sí |
| `PATCH` | `/api/meetings/:modelKey/:id` | Actualiza campos permitidos del modelo. | Sí |
| `PATCH` | `/api/meetings/:modelKey/:id/activate` | Activa el registro (`status = 1`). | Sí |
| `PATCH` | `/api/meetings/:modelKey/:id/anular` | Anula/inhabilita el registro (`status = 2`). | Sí |

---

## 🔧 Endpoints detallados

### 1. Obtener estructura de categorías y tipos — `/structure`

- **Método**: `GET`  
- **Ruta**: `/api/meetings/structure`  
- **Headers**: `Authorization: Bearer <idToken>`

Devuelve todas las **categorías** con sus **types**.  
Para cada Type incluye:
- `_id`
- `name`
- `weekDay`
- `modelKey`
- `fields`

El **frontend** usa esta información para:
- Saber qué **type** (por `_id`) usar como `idType` al crear registros.
- Saber qué **modelKey** corresponde (qué ruta CRUD usar).
- Saber qué **fields** tiene que mostrar en el formulario de creación/edición.

#### Ejemplo de respuesta (fragmento)

```json
{
  "success": true,
  "data": [
    {
      "_id": "69a521a9f8c0fd1685c98bc2",
      "name": "Minyanim",
      "types": [
        {
          "_id": "69a521a9f8c0fd1685c98bc6",
          "name": "Shachris",
          "weekDay": "Monday-thursday",
          "modelKey": "meeting",
          "fields": ["name", "location", "time", "period", "status", "idType"]
        }
      ]
    }
  ]
}
```

#### Errores

| Código | Caso |
|--------|------|
| `401` | Token faltante o inválido (middleware `verifyFirebaseToken`). |
| `403` | El usuario no es owner admin ni gabaim (`verifyOwnerAdminOrGabaim`). |
| `500` | Error interno al leer categorías/types. |

---

### 2. Listar registros por `modelKey`

- **Método**: `GET`  
- **Ruta**: `/api/meetings/:modelKey`  
- **Headers**: `Authorization: Bearer <idToken>`

Lista registros de la colección asociada al `modelKey`.  
Opciones de filtrado:
- `status` (1 = activo, 2 = inactivo/anulado).
- `idType` (ObjectId de Type).
- `period` (YYYY-MM-DD: lunes de la semana; ver [Formato del campo period](#formato-del-campo-period-semana)).

#### Query params

| Param | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `status` | number | No | Filtra por estado (`1` activo, `2` inactivo). |
| `idType` | string (ObjectId) | No | Filtra solo los registros de un Type concreto. |
| `period` | string (YYYY-MM-DD) | No | Filtra por semana (lunes de la semana). Ej.: `2026-03-02`. |

#### Ejemplo de petición

```http
GET /api/meetings/meeting?status=1&idType=69a521a9f8c0fd1685c98bc6&period=2026-03-02
Authorization: Bearer <token>
```

#### Respuesta 200 — Lista de registros

```json
{
  "success": true,
  "data": [
    {
      "_id": "abc123...",
      "name": "Shachris 7:00 AM",
      "location": "Main Shul",
      "time": "07:00",
      "period": "2026-03-02",
      "status": 1,
      "idType": "69a521a9f8c0fd1685c98bc6"
    }
  ]
}
```

#### Errores

| Código | Caso |
|--------|------|
| `400` | `modelKey` inválido, o `period` con formato distinto de YYYY-MM-DD. |
| `401` / `403` | Auth/rol fallido. |
| `500` | Error interno. |

---

### 3. Eliminar todos los registros de una semana — `DELETE /period/:period`

- **Método**: `DELETE`  
- **Ruta**: `/api/meetings/period/:period`  
- **Headers**: `Authorization: Bearer <idToken>`

Elimina **todos** los registros (en todas las colecciones de meetings y announcements) cuya semana sea la indicada.  
`period` debe ser la fecha del **lunes** de la semana en formato **YYYY-MM-DD** (mismo criterio que el filtro de list y el campo `period` al crear/editar).

#### Parámetro path

| Param | Tipo | Descripción |
|-------|------|-------------|
| `period` | string | Lunes de la semana en YYYY-MM-DD. Ej.: `2026-03-02`. |

#### Respuesta 200

```json
{
  "success": true,
  "message": "All records for period 2026-03-02 have been deleted.",
  "data": {
    "period": "2026-03-02",
    "deletedByModel": {
      "meeting": 12,
      "shabbos-mevorchim-meeting": 1,
      "daf-yomi-meeting": 1,
      "additional-shiurim-meeting": 3,
      "announcements-notes-meeting": 1,
      "pirkei-avis-shiur-announcements": 1,
      "mazel-tov-announcements": 0,
      "avos-ubonim-sponsor-announcements": 1
    },
    "totalDeleted": 20
  }
}
```

#### Errores

| Código | Caso |
|--------|------|
| `400` | `period` inválido (formato distinto de YYYY-MM-DD o fecha no válida). |
| `401` / `403` | Auth o rol (debe ser admin o gabaim). |
| `500` | Error interno. |

---

### 4. Crear registro por `modelKey`

- **Método**: `POST`  
- **Ruta**: `/api/meetings/:modelKey`  
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <idToken>`

Se usa para crear **tanto meetings como announcements**.  
La estructura del body depende del `modelKey` y de sus `fields`, pero **siempre** debe incluir `idType`.

#### Campos generales

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `idType` | string (ObjectId) | Sí | `_id` del Type, obtenido desde `/structure`. |
| Resto | según `fields` | Sí/No | Depende del modelo. Ver tabla siguiente. |

#### Campos por `modelKey` (resumen)

| modelKey | Colección | Campos principales |
|----------|-----------|--------------------|
| `meeting` | `meetings` | `name`, `location`, `time`, `period`, `status`, `idType` |
| `shabbos-mevorchim-meeting` | `shabbos_mevorchim_meetings` | `time`, `location`, `notes`, `period`, `status`, `idType` |
| `daf-yomi-meeting` | `daf_yomi_meetings` | `time`, `period`, `status`, `idType` |
| `additional-shiurim-meeting` | `additional_shiurim_meetings` | `name`, `time`, `description`, `period`, `status`, `idType` |
| `pirkei-avis-shiur-announcements` | `pirkei_avis_shiur_meetings` | `name`, `period`, `status`, `idType` |
| `mazel-tov-announcements` | `mazel_tov_announcements_meetings` | `description`, `period`, `status`, `idType` |
| `avos-ubonim-sponsor-announcements` | `avos_ubonim_sponsor_meetings` | `name`, `period`, `status`, `idType` |
| `announcements-notes-meeting` | `announcements_notes_meetings` | `additionalNotes`, `period`, `status`, `idType` |

#### Ejemplo — Crear un Minyan de Shachris

1. Front llama a `/api/meetings/structure`, localiza:
   - Category: `Minyanim`
   - Type: `Shachris` (`weekDay: "Monday-thursday"`)
   - Obtiene su `_id` (ej. `69a521a9f8c0fd1685c98bc6`) y `modelKey: "meeting"`.

2. Para crear el registro:

```http
POST /api/meetings/meeting
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "idType": "69a521a9f8c0fd1685c98bc6",
  "name": "Shachris 7:00 AM",
  "location": "Main Shul",
  "time": "07:00",
  "period": "Weekly"
}
```

> `status` no es obligatorio en el body; por defecto se crea con `1` (activo).

#### Respuesta 201 — Created

```json
{
  "success": true,
  "message": "Created successfully",
  "data": {
    "_id": "abc123...",
    "idType": "69a521a9f8c0fd1685c98bc6",
    "name": "Shachris 7:00 AM",
    "location": "Main Shul",
    "time": "07:00",
    "period": "2026-03-02",
    "status": 1
  }
}
```

#### Errores

| Código | Caso |
|--------|------|
| `400` | `modelKey` inválido, falta `idType` o `idType` no es ObjectId válido. |
| `401` / `403` | Auth/rol fallido. |
| `500` | Error interno. |

---

### 5. Obtener, actualizar, activar y anular

#### Obtener por id

- **Método**: `GET`  
- **Ruta**: `/api/meetings/:modelKey/:id`

Devuelve un documento completo del modelo asociado al `modelKey`.

#### Actualizar

- **Método**: `PATCH`  
- **Ruta**: `/api/meetings/:modelKey/:id`

Body con los campos que se quieran actualizar (solo se aplican los que están en `fields` para ese `modelKey`).

#### Activar

- **Método**: `PATCH`  
- **Ruta**: `/api/meetings/:modelKey/:id/activate`

Pone `status = 1`.

#### Anular

- **Método**: `PATCH`  
- **Ruta**: `/api/meetings/:modelKey/:id/anular`

Pone `status = 2`.

En todos los casos:

| Código | Caso |
|--------|------|
| `400` | `modelKey` inválido o `id` no es ObjectId válido. |
| `404` | Documento no encontrado. |
| `401` / `403` | Auth/rol fallido. |
| `500` | Error interno. |

---

## 📦 Estructura de datos

### Resumen jerárquico

```text
Category (ej. Minyanim, Shabbos, Shiurim, Announcements)
    └── Type (ej. Shachris + Monday-thursday, Daf Yomi + wednesday-friday)
            └── Modelo: Meeting | ShabbosMevorchimMeeting | DafYomiMeeting | ... (según el tipo)
```

- Una **reunión** o **anuncio** siempre pertenece a un **Type** (`idType`).
- Un **Type** siempre pertenece a una **Category** (`idCategory`).
- Algunos Types usan el modelo genérico **Meeting**; otros usan un modelo específico (ShabbosMevorchimMeeting, DafYomiMeeting, etc.).

### Category

- **Modelo:** `Category`  
- **Archivo:** `src/models/category.model.js`  
- **Colección:** `categories`

| Campo   | Tipo   | Descripción |
|---------|--------|-------------|
| `name`  | String | Nombre de la categoría. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

Categorías creadas por el seed:

| name | Descripción breve |
|------|-------------------|
| **Minyanim** | Rezos (Shachris, Mincha, Maariv). |
| **Shabbos** | Rezos/eventos de Shabbos (+ tipo especial Shabbos Mevorchim). |
| **Shiurim** | Clases (Daf Yomi, Additional Shiurim). |
| **Announcements** | Anuncios de distintos tipos. |

### Type

- **Modelo:** `Type`  
- **Archivo:** `src/models/type.model.js`  
- **Colección:** `types`

| Campo       | Tipo   | Descripción |
|------------|--------|-------------|
| `name`     | String | Nombre del tipo (ej. "Shachris"). |
| `weekDay`  | String | Día o rango de días (`"Monday-thursday"`, `"Friday"`, `"wednesday-friday"`) o `null` para anuncios. |
| `idCategory` | ObjectId (ref `Category`) | Categoría a la que pertenece. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

**Índice único:** `(name, weekDay, idCategory)` para no duplicar types.

Types por categoría (según seed) ya están en el bloque original; se mantienen como referencia.

### Modelos de reuniones/anuncios (resumen)

Todos tienen al menos **`idType`** (ref `Type`) y **`status`** (`1` activo, `2` anulado).

| Modelo | Archivo | Colección | Uso |
|--------|---------|-----------|-----|
| `Meeting` | `src/models/meeting.model.js` | `meetings` | Minyanim + tipos estándar de Shabbos. |
| `ShabbosMevorchimMeeting` | `src/models/shabbos-mevorchim-meeting.model.js` | `shabbos_mevorchim_meetings` | Shabbos Mevorchim. |
| `DafYomiMeeting` | `src/models/daf-yomi-meeting.model.js` | `daf_yomi_meetings` | Daf Yomi. |
| `AdditionalShiurimMeeting` | `src/models/additional-shiurim-meeting.model.js` | `additional_shiurim_meetings` | Additional Shiurim. |
| `PirkeiAvisShiurMeeting` | `src/models/pirkei-avis-shiur-meeting.model.js` | `pirkei_avis_shiur_meetings` | Pirkei Avis Shiur. |
| `MazelTovAnnouncementsMeeting` | `src/models/mazel-tov-announcements-meeting.model.js` | `mazel_tov_announcements_meetings` | Mazel Tov Announcements. |
| `AvosUBonimSponsorMeeting` | `src/models/avos-ubonim-sponsor-meeting.model.js` | `avos_ubonim_sponsor_meetings` | Avos U'Bonim Sponsor. |
| `AnnouncementsNotesMeeting` | `src/models/announcements-notes-meeting.model.js` | `announcements_notes_meetings` | Notas generales de anuncios. |

> La relación Type → modelo específico está codificada en  
> `src/config/meetingModels.config.js` (mapa `TYPE_TO_MODEL` y `MODELS_BY_KEY`).

### Script de seed

- **Archivo:** `scripts/seed-meetings-structure.js`  
- **Uso:** `node scripts/seed-meetings-structure.js`

Crea (si no existen):
1. Category **Minyanim** + 7 Types (Shachris/Mincha/Maariv con diferentes weekDay).  
2. Category **Shabbos** + 4 Types estándar + Type especial **Shabbos Mevorchim**.  
3. Category **Shiurim** + 2 Types (Daf Yomi, Additional Shiurim).  
4. Category **Announcements** + 4 Types (Pirkei Avis, Mazel Tov, Avos U'Bonim Sponsor, Announcements Notes).

El script **no crea registros** en las colecciones de meetings/announcements, solo Category + Type.

---

## 📘 Guía backend

- **Rutas**: `src/routes/meetings.route.js`
  - `GET /structure` — usa `meetingStructure.controller.getStructure`.
  - `GET /:modelKey` — lista registros (`meetings.controller.list`); query opcionales: `status`, `idType`, `period` (YYYY-MM-DD).
  - `DELETE /period/:period` — elimina todos los registros de esa semana en todos los modelos (`meetings.controller.deleteByPeriod`).
  - `POST /:modelKey` — crea registro (`meetings.controller.create`).
  - `GET /:modelKey/:id` — obtiene registro (`meetings.controller.getById`).
  - `PATCH /:modelKey/:id` — actualiza (`meetings.controller.update`).
  - `PATCH /:modelKey/:id/activate` — activa (`meetings.controller.activate`).
  - `PATCH /:modelKey/:id/anular` — anula (`meetings.controller.anular`).

- **Middlewares**:
  - `verifyFirebaseToken` — valida el token y pone `req.user = { uid, email }`.
  - `verifyOwnerAdminOrGabaim` — comprueba que el owner (husband/wife) tenga rol **admin** o **gabaim** (Davening Times). ID gabaim: `69a4fe4c1c49fa661fecae13` (o `GABAIM_ROL_ID` en .env).
  - En `meetings.route.js` se usa `router.use([verifyFirebaseToken, verifyOwnerAdminOrGabaim])`.

- **Controladores**:
  - `src/controllers/meetingStructure.controller.js`:
    - Lee `Category` y `Type`, y con `getModelInfo` agrega `modelKey` y `fields`.
  - `src/controllers/meetings.controller.js`:
    - Usa `getModelByKey` y `MODELS_BY_KEY` para resolver modelos.
    - **list**: acepta query `period` (YYYY-MM-DD); valida con `isValidPeriod`.
    - **deleteByPeriod**: recibe `period` por path, valida formato y ejecuta `deleteMany({ period })` en todos los modelos de `MODELS_BY_KEY`.
    - Implementa lógica genérica de list/get/create/update/activate/anular.

- **Config de mapeo**:
  - `src/config/meetingModels.config.js`:
    - `TYPE_TO_MODEL`: `(categoryName, typeName, weekDay)` → `{ modelKey, fields }`.
    - `MODELS_BY_KEY`: `modelKey` → Modelo Mongoose.
    - `FIELDS_BY_MODEL_KEY`: `modelKey` → lista de campos permitidos.

---

## 📗 Guía frontend

### 1. Obtener estructura de tipos

```javascript
const API_URL = 'http://localhost:5000';
const token = localStorage.getItem('token'); // idToken de Firebase

const { data } = await axios.get(`${API_URL}/api/meetings/structure`, {
  headers: { Authorization: `Bearer ${token}` },
});

if (data.success) {
  const categories = data.data; // array de categorías
  // Ejemplo: buscar un type específico
  const minyanim = categories.find((c) => c.name === 'Minyanim');
  const shachrisType = minyanim.types.find(
    (t) => t.name === 'Shachris' && t.weekDay === 'Monday-thursday'
  );
  // shachrisType.modelKey === 'meeting'
  // shachrisType.fields === ['name', 'location', 'time', 'period', 'status', 'idType']
}
```

### 2. Crear un registro según Type seleccionado

```javascript
const type = shachrisType; // del ejemplo anterior
const modelKey = type.modelKey; // 'meeting'
const idType = type._id;       // ObjectId del Type

const body = {
  idType,
  name: 'Shachris 7:00 AM',
  location: 'Main Shul',
  time: '07:00',
  period: 'Weekly',
};

const { data: created } = await axios.post(
  `${API_URL}/api/meetings/${modelKey}`,
  body,
  {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }
);
```

Para otros types (Announcements, Shiurim, Shabbos Mevorchim, etc.) el **modelo de front** es igual:  
1) el usuario selecciona un Type,  
2) lees `modelKey` y `fields`,  
3) dibujas el formulario dinámicamente,  
4) haces POST a `/api/meetings/:modelKey` con `idType` + esos campos.

### 3. Listar y filtrar por type y por semana (period)

```javascript
// Por type (y opcionalmente por semana)
const period = '2026-03-02'; // lunes de la semana (YYYY-MM-DD)
const { data } = await axios.get(
  `${API_URL}/api/meetings/meeting`,
  {
    params: { status: 1, idType, period }, // period opcional
    headers: { Authorization: `Bearer ${token}` },
  }
);

const meetings = data.data; // registros de ese type/modelKey (y semana si se envió period)
```

Para obtener **todos** los datos de una semana en el front, se pueden hacer varias llamadas a `GET /:modelKey` con el mismo `period` y distintos `modelKey`/`idType`, o una por cada tipo que se necesite.

### 4. Activar / anular / editar

```javascript
// Activar
await axios.patch(
  `${API_URL}/api/meetings/meeting/${meetingId}/activate`,
  {},
  { headers: { Authorization: `Bearer ${token}` } }
);

// Anular
await axios.patch(
  `${API_URL}/api/meetings/meeting/${meetingId}/anular`,
  {},
  { headers: { Authorization: `Bearer ${token}` } }
);

// Editar (solo campos permitidos en fields)
await axios.patch(
  `${API_URL}/api/meetings/meeting/${meetingId}`,
  { time: '07:15' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### 5. Eliminar todos los registros de una semana

```javascript
const period = '2026-03-02'; // lunes de la semana (YYYY-MM-DD)
const { data } = await axios.delete(
  `${API_URL}/api/meetings/period/${encodeURIComponent(period)}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

if (data.success) {
  console.log('Deleted:', data.data.totalDeleted, data.data.deletedByModel);
}
```

---

## 🔄 Orden del flujo (ejemplo)

1. **Frontend carga estructura** con `GET /api/meetings/structure`.
2. El usuario elige:
   - Category (ej. Minyanim).
   - Type (ej. Shachris, Monday-thursday).
3. El front toma de ese Type:
   - `modelKey` (ej. `meeting`).
   - `fields` (ej. `['name','location','time','period','status','idType']`).
4. Dibuja un formulario con esos campos (excepto `status`, que puede ser oculto o por defecto).
5. Al enviar, hace `POST /api/meetings/:modelKey` con:
   - `idType` = `_id` del Type.
   - Valores de los campos del formulario.
6. Para mostrar en pantalla, usa:
   - `GET /api/meetings/:modelKey?idType=<idType>&status=1`.
7. Para mantener la estructura (enable/disable), usa:
   - `PATCH /api/meetings/:modelKey/:id/activate` o `.../anular`.

Con esto, **no hay ambigüedad** entre Type y modelo/colección:  
todo se resuelve vía `structure` → `modelKey` → rutas CRUD.

---

## 📝 Registro de cambios

| Fecha / contexto | Cambio |
|------------------|--------|
| **Módulo Meetings & Announcements** | Creación de `Category`, `Type` y modelos de meetings/announcements (Meeting, ShabbosMevorchimMeeting, DafYomiMeeting, AdditionalShiurimMeeting, PirkeiAvisShiurMeeting, MazelTovAnnouncementsMeeting, AvosUBonimSponsorMeeting, AnnouncementsNotesMeeting). |
| **Script seed** | `scripts/seed-meetings-structure.js` siembra categorías y types (Minyanim, Shabbos, Shiurim, Announcements). |
| **Endpoint `/api/meetings/structure`** | Devuelve categorías con types, incluyendo `modelKey` y `fields` para que el frontend sepa qué modelo y campos usar. |
| **CRUD por `modelKey`** | `src/controllers/meetings.controller.js` y `src/routes/meetings.route.js` permiten crear/listar/editar/activar/anular registros de todos los modelos a través de un único patrón de rutas. |
| **Auth admin o gabaim** | Rutas de meetings protegidas con `verifyOwnerAdminOrGabaim` (admin o rol gabaim `69a4fe4c1c49fa661fecae13`). Middleware en `src/middlewares/verify-owner-admin-or-gabaim.js`. |
| **Campo `period` y filtro por semana** | Formato: `YYYY-MM-DD` (lunes de la semana; semana lunes–domingo). List acepta query `period`; create/update envían `period` en body. Documentado en esta guía. |
| **DELETE /api/meetings/period/:period** | Elimina todos los registros (todos los modelKeys) cuya semana sea la indicada. Respuesta incluye `deletedByModel` y `totalDeleted`. |
