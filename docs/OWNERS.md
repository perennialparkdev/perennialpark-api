# 📂 API de Owners - Documentación

## Índice
- [Seguridad](#-seguridad-y-autenticación)
- [Resumen de endpoints](#-resumen-de-endpoints)
- [Endpoints detallados](#-endpoints-detallados)
- [Estructura de datos](#-estructura-de-datos)
- [Guía backend](#-guía-backend)
- [Guía frontend](#-guía-frontend)
- [Orden del flujo](#-orden-del-flujo-resumen)
- [Registro de cambios](#-registro-de-cambios-y-agregaciones)

---

## 🔐 Seguridad y autenticación

| Aspecto | Detalle |
|--------|---------|
| **Auth** | **check-unit**, **signup**, **login**, **invitation/validate** e **invitation/complete** son **públicas**. **complete-profile** requiere `Authorization: Bearer <idToken>`. |
| **Token** | Tras **login** el cliente recibe un `idToken`; debe enviarlo en header `Authorization: Bearer <token>` en **complete-profile**. El middleware `verifyFirebaseToken` valida el token y expone `req.user = { uid, email }`. |
| **Headers** | `Content-Type: application/json` para body; en **complete-profile** además `Authorization: Bearer <token>`. |

---

## 🚀 Resumen de endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/owners/check-unit` | Validar acceso por número de unidad (usuario/contrasena = unit_number). Si la unidad ya tiene owner(s), no puede ingresar. | No |
| `POST` | `/api/owners/signup` | Registrar usuario en Firebase Auth (email + contraseña). Devuelve `email` y `uid`. | No |
| `POST` | `/api/owners/login` | Iniciar sesión con email y contraseña. Devuelve `token` (idToken) para usar en `Authorization: Bearer`. | No |
| `POST` | `/api/owners/complete-profile` | Formulario primario: unit, husband, wife, children. El email del token debe coincidir con husband_email o wife_email. Crea owner activo (status 1) y opcionalmente pendiente (status -1) con invitación por correo. | Sí (Bearer) |
| `POST` | `/api/owners/invitation/validate` | Valida email + token de invitación; devuelve `missingFields` para el formulario dinámico del co-propietario. | No |
| `POST` | `/api/owners/invitation/complete` | Completa perfil del owner pendiente: actualiza campos, crea usuario en Firebase y activa (status 1). | No |

---

## 🔧 Endpoints detallados

### 1. Validar acceso por unidad (check-unit)

- **Método**: `POST`
- **Ruta**: `/api/owners/check-unit`
- **Content-Type**: `application/json`

Permite comprobar si un número de unidad puede “ingresar”: se envían **usuario** y **contrasena** con el mismo valor (el `unit_number`). La API verifica que exista la unidad y que **no** tenga ningún propietario registrado (OwnerHusbandUser u OwnerWifeUser con ese `unitId`). Si ya hay owner(s), responde que no puede ingresar.

#### Request body

```json
{
  "usuario": "101",
  "contrasena": "101"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `usuario` | string | Sí | Número de unidad (debe coincidir con `unit_number` en Unit). |
| `contrasena` | string | Sí | Debe ser **igual** a `usuario` (mismo valor que el número de unidad). |

#### Response 200 — Access granted

Unit exists and has **no** registered owners.

```json
{
  "success": true,
  "message": "Access granted",
  "data": {
    "unitId": "674a1b2c3d4e5f6789012345",
    "unit_number": "101"
  }
}
```

#### Response 400 — Invalid username/password

Missing fields or values do not match.

```json
{
  "success": false,
  "message": "username and password are required"
}
```

```json
{
  "success": false,
  "message": "username and password must match the unit number"
}
```

#### Response 404 — Unit not found

No Unit exists with that `unit_number`.

```json
{
  "success": false,
  "message": "Unit not found"
}
```

#### Response 403 — Access denied

The unit already has at least one owner (husband or wife) registered.

```json
{
  "success": false,
  "message": "Access denied: this unit already has owner(s) registered."
}
```

#### Response 500

Internal error (e.g. database).

```json
{
  "success": false,
  "message": "<error message>"
}
```

---

### 2. Registro de usuario (signup)

- **Método**: `POST`
- **Ruta**: `/api/owners/signup`
- **Content-Type**: `application/json`

Crea un usuario en **Firebase Auth** con correo y contraseña. El usuario podrá luego hacer login en `/api/owners/login`. Si el correo ya está registrado en Firebase, la API responde con error.

#### Request body

```json
{
  "email": "propietario@ejemplo.com",
  "contrasena": "miPassword123"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | Sí | Correo electrónico (formato válido). |
| `contrasena` | string | Sí | Contraseña (mínimo 6 caracteres). |

#### Response 201 — User created

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "email": "propietario@ejemplo.com",
    "uid": "abc123firebaseUid456"
  }
}
```

#### Response 400 — Validation

Missing fields, empty email, password &lt; 6 characters, invalid email or weak password.

```json
{
  "success": false,
  "message": "email and password are required"
}
```

```json
{
  "success": false,
  "message": "Password must be at least 6 characters"
}
```

#### Response 409 — Email already exists

```json
{
  "success": false,
  "message": "An account with this email address already exists."
}
```

#### Response 503 — Firebase unavailable

Firebase Admin credentials not configured or invalid.

```json
{
  "success": false,
  "message": "Authentication service unavailable. Please check your Firebase configuration.",
  "error": "<detail only when NODE_ENV=development>"
}
```

---

### 3. Iniciar sesión (login)

- **Método**: `POST`
- **Ruta**: `/api/owners/login`
- **Content-Type**: `application/json`

Autentica con Firebase (email + contraseña) y devuelve un **idToken**. El cliente debe guardar ese `token` y enviarlo en el header `Authorization: Bearer <token>` en todas las rutas protegidas. El middleware `verifyFirebaseToken` validará el token y dejará `req.user = { uid, email }`.

#### Request body

```json
{
  "email": "propietario@ejemplo.com",
  "contrasena": "miPassword123"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | Sí | Correo del usuario. |
| `contrasena` | string | Sí | Contraseña del usuario. |

#### Response 200 — Signed in successfully

```json
{
  "success": true,
  "message": "Signed in successfully",
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "3600",
    "uid": "abc123firebaseUid456",
    "email": "propietario@ejemplo.com"
  }
}
```

| Campo en `data` | Descripción |
|-----------------|-------------|
| `token` | **idToken** de Firebase. Enviar en `Authorization: Bearer <token>` en rutas protegidas. |
| `expiresIn` | Segundos hasta que el token expire (ej. 3600 = 1 hora). |
| `uid` | Identificador del usuario en Firebase. |
| `email` | Correo del usuario. |

#### Response 400 — Validation

```json
{
  "success": false,
  "message": "email and password are required"
}
```

#### Response 401 — Invalid credentials

```json
{
  "success": false,
  "message": "Invalid email or password."
}
```

#### Response 503 — Login not configured

Missing `FIREBASE_WEB_API_KEY` in `.env`.

```json
{
  "success": false,
  "message": "Login not configured. Missing FIREBASE_WEB_API_KEY in .env"
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

### 4. Completar perfil (formulario primario) — complete-profile

- **Método**: `POST`
- **Ruta**: `/api/owners/complete-profile`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <idToken>`
- **Auth**: Requerido (token obtenido en login).

Recibe el formulario primario con datos de **unit**, **husband**, **wife** y **children**. El correo del usuario autenticado (`req.user.email`) debe coincidir con **husband_email** o **wife_email**; ese owner se crea con **status 1** (activo). El otro propietario (si se envía su correo) se crea con **status -1** (pendiente), se genera un **invitationToken** y se le envía un correo de invitación en inglés. Si no se envía correo para el otro propietario, no se crea ese owner. Se crea o busca la Unit por `unit_number` y se crean los registros de Children.

#### Request body

```json
{
  "unit": {
    "unit_number": "101",
    "address": "123 Main Street",
    "city": "Brooklyn",
    "state": "NY",
    "zip": "11201",
    "colony_name": "Downtown",
    "notes": "Second floor"
  },
  "husband": {
    "husband_first": "John",
    "husband_email": "propietario@ejemplo.com",
    "husband_phone": "+1 555 123 4567",
    "last_name": "Smith",
    "password": "MiPassword123"
  },
  "wife": {
    "wife_first": "Mary",
    "wife_email": "mary@ejemplo.com",
    "wife_phone": "+1 555 987 6543",
    "last_name": "Smith",
    "password": ""
  },
  "children": [
    { "name": "Emma", "age": 10, "genre": "Girl" },
    { "name": "James", "age": 7, "genre": "Boy" }
  ]
}
```

| Sección | Campo | Tipo | Requerido | Descripción |
|---------|-------|------|-----------|-------------|
| unit | `unit_number` | string | Sí | Número de unidad (debe existir o se crea). |
| unit | `address`, `city`, `state`, `zip`, `colony_name`, `notes` | string | No | Datos de la unidad. |
| husband | `husband_first`, `husband_email`, `husband_phone`, `last_name`, `password` | string | Según rol | Uno de **husband_email** o **wife_email** debe ser el correo del token (usuario activo). |
| wife | `wife_first`, `wife_email`, `wife_phone`, `last_name`, `password` | string | Según rol | El otro correo (si se envía) crea owner pendiente; recibe invitación por correo. |
| children | array de `{ name, age, genre }` | array | No | Lista de hijos; puede ser `[]`. |

#### Response 201 — Profile created

```json
{
  "success": true,
  "message": "Unit and owner profiles created successfully.",
  "data": {
    "unitId": "674a1b2c3d4e5f6789012345"
  }
}
```

#### Response 400 — Email does not match token

The email in the form (husband_email or wife_email) is not the one the user signed in with.

```json
{
  "success": false,
  "message": "The email in the form (husband_email or wife_email) must match the one you used to register in Firebase. Use that email in the form."
}
```

#### Response 409 — Email already registered

One of the emails is already registered as an owner for another unit.

```json
{
  "success": false,
  "message": "One of these emails is already registered as an owner for another unit. Use the email you signed in with and a different email for the other owner (if applicable)."
}
```

#### Response 401 — Missing or invalid token

```json
{
  "success": false,
  "message": "Valid authentication token required."
}
```

---

### 5. Validar invitación (formulario dinámico) — invitation/validate

- **Método**: `POST`
- **Ruta**: `/api/owners/invitation/validate`
- **Content-Type**: `application/json`
- **Auth**: No (público).

El co-propietario que recibió el correo de invitación envía su **email** y el **token** (código del correo). La API devuelve si la invitación es válida y la lista **missingFields** de campos que faltan para ese owner, para construir un formulario dinámico en el front.

#### Request body

```json
{
  "email": "mary@ejemplo.com",
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | Sí | Correo del propietario pendiente (el que recibió la invitación). |
| `token` | string | Sí | Código de invitación (invitationToken) enviado en el correo. |

#### Response 200 — Invitación válida

```json
{
  "success": true,
  "data": {
    "valid": true,
    "ownerType": "wife",
    "unitId": "674a1b2c3d4e5f6789012345",
    "missingFields": ["password", "wife_phone"]
  }
}
```

| Campo en `data` | Descripción |
|-----------------|-------------|
| `ownerType` | `"husband"` o `"wife"`. |
| `missingFields` | Nombres de campos que están vacíos y debe completar el usuario (ej. `password`, `husband_first`, `last_name`). |

#### Response 400 — Account already activated

```json
{
  "success": false,
  "message": "This account has already been activated."
}
```

#### Response 404 — Invitation not found

```json
{
  "success": false,
  "message": "Invitation not found or invalid code. Please check the email and code."
}
```

---

### 6. Completar invitación (activar cuenta) — invitation/complete

- **Método**: `POST`
- **Ruta**: `/api/owners/invitation/complete`
- **Content-Type**: `application/json`
- **Auth**: No (público).

El co-propietario envía **email**, **token** y los campos que faltan (incluida **password**). La API crea el usuario en Firebase con ese email y contraseña, actualiza el owner en MongoDB con `firebase_uid`, **status 1** y borra el `invitationToken`. A partir de ahí puede hacer login normalmente.

#### Request body

```json
{
  "email": "mary@ejemplo.com",
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  "password": "MaryPassword456",
  "wife_first": "Mary",
  "wife_phone": "+1 555 987 6543",
  "last_name": "Smith"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | Sí | Mismo correo de la invitación. |
| `token` | string | Sí | Código de invitación. |
| `password` | string | Sí | Mínimo 6 caracteres; se usa para crear el usuario en Firebase. |
| Resto | string | Según missingFields | Campos que devolvió `missingFields` en validate (ej. `wife_first`, `wife_phone`, `last_name` para wife; `husband_first`, `husband_phone`, `last_name` para husband). |

#### Response 200 — Profile completed

```json
{
  "success": true,
  "message": "Profile completed. You can now sign in with your email and password.",
  "data": {
    "uid": "xyz789firebaseUid",
    "email": "mary@ejemplo.com"
  }
}
```

#### Response 404 — Invitation not found

```json
{
  "success": false,
  "message": "Invitation not found or invalid code."
}
```

#### Response 409 — Email already has Firebase account

```json
{
  "success": false,
  "message": "An account with this email already exists. Sign in or reset your password."
}
```

---

## 📦 Estructura de datos

### Relación Unit ↔ Owners

- **Unit** tiene `unit_number` (string). No guarda referencias a owners.
- **OwnerHusbandUser** y **OwnerWifeUser** tienen `unitId` (ObjectId ref: `'Unit'`).
- Para saber si una unidad “tiene owners”, se buscan documentos en ambas colecciones con `unitId` igual al `_id` de la Unit.

### Modelos implicados

| Modelo | Archivo | Uso en check-unit |
|--------|---------|-------------------|
| Unit | `src/models/unit.model.js` | Búsqueda por `unit_number`. |
| OwnerHusbandUser | `src/models/owner-husband-user.model.js` | Comprobar si existe registro con ese `unitId`. |
| OwnerWifeUser | `src/models/owner-wife-user.model.js` | Comprobar si existe registro con ese `unitId`. |

---

## 📘 Guía backend

- **Rutas**: `src/routes/owners.route.js`:
  - Públicas: `POST /check-unit`, `POST /signup`, `POST /login`, `POST /invitation/validate`, `POST /invitation/complete`.
  - Protegida con `verifyFirebaseToken`: `POST /complete-profile`.
- **Controlador**: `src/controllers/owners.controller.js`:
  - **checkUnitAccess**: valida `usuario`/`contrasena` = unit_number, busca Unit y owners; 200 si puede ingresar, 403 si ya tiene owners.
  - **signUp**: crea usuario en Firebase Auth; devuelve email y uid; 409 si el correo ya existe.
  - **login**: Firebase REST API `signInWithPassword`; devuelve `token`, `expiresIn`, `uid`, `email`.
  - **completeProfile**: exige que `req.user.email` coincida con husband_email o wife_email; crea Unit (o la busca), owner activo (status 1), opcionalmente owner pendiente (status -1) con `invitationToken` y envío de correo (Nodemailer), y Children.
  - **validateInvitation**: busca owner por email + invitationToken; devuelve `missingFields` para formulario dinámico.
  - **completeInvitation**: actualiza owner con datos enviados, crea usuario en Firebase (email + password), pone status 1 y invalida invitationToken.
- **Correo de invitación**: `src/services/mail.service.js` — `sendOwnerInvitationEmail(toEmail, recipientName, invitationToken)` (inglés, personalizado).
- **Montaje**: En `app.js`, `app.use('/api/owners', ownersRoutes)`.

---

## 📗 Guía frontend

### Validar acceso por unidad (check-unit)

```javascript
const API_URL = 'http://localhost:5000'; // o tu base URL

const unitNumber = '101'; // valor del input (número de unidad)

const { data } = await axios.post(
  `${API_URL}/api/owners/check-unit`,
  {
    usuario: unitNumber,
    contrasena: unitNumber,
  },
  { headers: { 'Content-Type': 'application/json' } }
);

if (data.success) {
  // Access granted: save data.data.unitId and data.data.unit_number for registration flow
  console.log('Unit ID:', data.data.unitId, 'Unit number:', data.data.unit_number);
} else {
  // data.message: "Unit not found" | "Access denied: ..." | validation message
  console.error(data.message);
}
```

Manejo por código de estado:

```javascript
try {
  const res = await axios.post(`${API_URL}/api/owners/check-unit`, {
    usuario: unitNumber,
    contrasena: unitNumber,
  });
  if (res.status === 200 && res.data.success) {
    const { unitId, unit_number } = res.data.data;
    // Redirigir a formulario de registro de owner con unitId
  }
} catch (err) {
  if (err.response?.status === 403) {
    // Unit already has owner(s)
  }
  if (err.response?.status === 404) {
    // Unit not found
  }
  if (err.response?.status === 400) {
    // Validación: faltan campos o no coinciden
  }
}
```

### Registro (signup)

```javascript
const { data } = await axios.post(
  `${API_URL}/api/owners/signup`,
  { email: 'propietario@ejemplo.com', contrasena: 'miPassword123' },
  { headers: { 'Content-Type': 'application/json' } }
);

if (data.success) {
  const { email, uid } = data.data;
  // Usuario creado en Firebase; redirigir a login o a completar perfil
}
// 409: data.message === "An account with this email address already exists."
```

### Login y uso del token en rutas protegidas

```javascript
// 1. Login
const { data } = await axios.post(
  `${API_URL}/api/owners/login`,
  { email: 'propietario@ejemplo.com', contrasena: 'miPassword123' },
  { headers: { 'Content-Type': 'application/json' } }
);

if (data.success) {
  const token = data.data.token;  // idToken
  const expiresIn = data.data.expiresIn;

  // Guardar token (ej. en estado, localStorage o memoria) para enviarlo en cada petición protegida
  localStorage.setItem('token', token);

  // 2. Llamar a una ruta protegida
  const res = await axios.get(`${API_URL}/api/algun-recurso-protegido`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // El backend (verifyFirebaseToken) habrá validado el token y puesto req.user = { uid, email }
}
```

Ejemplo de configuración de axios con token global:

```javascript
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
// A partir de aquí todas las peticiones llevan el token
```

### Completar perfil (formulario primario)

```javascript
const token = localStorage.getItem('token'); // o el que obtuviste en login

const { data } = await axios.post(
  `${API_URL}/api/owners/complete-profile`,
  {
    unit: {
      unit_number: '101',
      address: '123 Main St',
      city: 'Brooklyn',
      state: 'NY',
      zip: '11201',
      colony_name: 'Downtown',
      notes: '',
    },
    husband: {
      husband_first: 'John',
      husband_email: 'propietario@ejemplo.com',  // debe ser el email del token
      husband_phone: '+1 555 123 4567',
      last_name: 'Smith',
      password: 'MiPassword123',
    },
    wife: {
      wife_first: 'Mary',
      wife_email: 'mary@ejemplo.com',
      wife_phone: '+1 555 987 6543',
      last_name: 'Smith',
      password: '',
    },
    children: [
      { name: 'Emma', age: 10, genre: 'Girl' },
    ],
  },
  {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }
);

if (data.success) {
  console.log('Unit creada:', data.data.unitId);
}
```

### Validar invitación (co-propietario)

```javascript
const { data } = await axios.post(
  `${API_URL}/api/owners/invitation/validate`,
  { email: 'mary@ejemplo.com', token: 'codigo_del_correo' },
  { headers: { 'Content-Type': 'application/json' } }
);

if (data.success && data.data.valid) {
  const { ownerType, missingFields } = data.data;
  // Mostrar formulario solo con los campos en missingFields (ej. password, wife_phone)
}
```

### Completar invitación (activar cuenta)

```javascript
const { data } = await axios.post(
  `${API_URL}/api/owners/invitation/complete`,
  {
    email: 'mary@ejemplo.com',
    token: 'codigo_del_correo',
    password: 'MaryPassword456',
    wife_first: 'Mary',
    wife_phone: '+1 555 987 6543',
    last_name: 'Smith',
  },
  { headers: { 'Content-Type': 'application/json' } }
);

if (data.success) {
  // Redirigir a login; ya puede iniciar sesión con email y password
}
```

---

## 🔄 Orden del flujo (resumen)

1. **POST /api/owners/check-unit** — Usuario envía unit_number como usuario y contraseña; si la unidad puede ingresar, continúa.
2. **POST /api/owners/signup** — Registra correo y contraseña en Firebase.
3. **POST /api/owners/login** — Obtiene `token`; guardarlo para el siguiente paso.
4. **POST /api/owners/complete-profile** — Con header `Authorization: Bearer <token>`, envía unit, husband, wife, children. El email del token debe ser husband_email o wife_email.
5. *(Solo co-propietario)* **POST /api/owners/invitation/validate** — Con email y código del correo, obtiene `missingFields`.
6. *(Solo co-propietario)* **POST /api/owners/invitation/complete** — Con email, token, password y campos faltantes; activa la cuenta y puede hacer login.

---

## 📝 Registro de cambios y agregaciones

| Fecha / contexto | Cambio |
|------------------|--------|
| **Módulo Owners** | Rutas en `src/routes/owners.route.js`, controlador en `src/controllers/owners.controller.js`. |
| **POST /api/owners/check-unit** | Validación de acceso por `unit_number` enviado como `usuario` y `contrasena`; consulta a Unit, OwnerHusbandUser y OwnerWifeUser; 200 si puede ingresar, 403 si ya tiene owners, 404 si la unidad no existe. |
| **POST /api/owners/signup** | Registro en Firebase Auth (email + contraseña). Devuelve `email` y `uid`. 201 creado, 409 correo ya existe, 400 validación, 503 Firebase no disponible. |
| **POST /api/owners/login** | Login vía Firebase REST API (signInWithPassword). Devuelve `token` (idToken), `expiresIn`, `uid`, `email`. El token se envía en `Authorization: Bearer <token>` para rutas protegidas con `verifyFirebaseToken`. |
| **POST /api/owners/complete-profile** | Formulario primario (unit, husband, wife, children). Requiere token. El email del token debe ser husband_email o wife_email. Crea Unit, owner activo (status 1), opcionalmente owner pendiente (status -1) con invitationToken y correo de invitación (Nodemailer), y Children. |
| **POST /api/owners/invitation/validate** | Valida email + token; devuelve missingFields para formulario dinámico del co-propietario. Público. |
| **POST /api/owners/invitation/complete** | Completa perfil del owner pendiente: actualiza campos, crea usuario en Firebase, activa (status 1), invalida invitationToken. Público. |
| **Modelos** | OwnerHusbandUser y OwnerWifeUser: campo `invitationToken` para el código de invitación. Children y Unit usados en complete-profile. |
