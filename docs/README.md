# 📚 Documentación API PerennialPark

Índice de la documentación disponible para desarrolladores frontend y backend.

---

## Documentos

| Documento | Descripción |
|-----------|-------------|
| [**OWNERS.md**](./OWNERS.md) | API de **Owners**: check-unit, signup, login, complete-profile, invitación (validate + complete). Flujo de registro y autenticación por unidad y propietarios (husband/wife). |
| [**UNITS.md**](./UNITS.md) | API de **Units**: CRUD de unidades (crear, listar, obtener, editar, eliminar, activar, anular). Incluye preliminar_owner, unlink, reset-password y send-invitation para administradores. Solo accesible por owners con idRol administrador. |
| [**ROLES.md**](./ROLES.md) | API de **Roles**: CRUD de roles (crear, listar, obtener, editar, activar, anular). Respuestas en inglés. Solo accesible por owners con idRol administrador. |
| [**MEETINGS-STRUCTURE.md**](./MEETINGS-STRUCTURE.md) | Estructura **Categories, Types y reuniones/anuncios**: cómo funcionan los modelos Category, Type, Meeting y modelos especiales (ShabbosMevorchimMeeting, DafYomiMeeting, etc.), a qué Type pertenece cada uno y a qué Category cada Type. Incluye script de seed. |
| [**RSVPS.md**](./RSVPS.md) | API de **RSVP**: CRUD de registros de citas (create, list por rango de fecha, getById, update). Delete solo para owners con rol administrador. Incluye totales para Coming (howManyMen + guests) y array checks. |
| [**CLASSIFIEDS.md**](./CLASSIFIEDS.md) | API de **Classifieds**: CRUD de avisos/clasificados (classified_posts). Categorías en classified_categories. Requiere owner autenticado (cualquier rol). Campos: title, category, description, price, contact_info, visible_to_other_colonies. |
| [**UNITS_FOR_RENT.md**](./UNITS_FOR_RENT.md) | API de **Units for Rent**: CRUD de unidades en alquiler (units_for_rent). Requiere owner autenticado (cualquier rol). Campos: startDate, endDate, notes, only_my_colony; owner y unidad enlazada en respuesta. |

---

## Resumen por módulo

### Owners (`/api/owners`)

- **Públicas:** check-unit, signup, login, invitation/validate, invitation/complete.
- **Protegida (token):** complete-profile (formulario primario con unit, husband, wife, children).
- **Auth:** Firebase ID Token; invitation usa email + token en body.

### Units (`/api/units`)

- **Todas protegidas** por Firebase Token + rol owner administrador.
- **CRUD:** create (con preliminar_owner), list, getById, update, delete, activate, anular.
- **Admin:** unlink (desvincular owners/children/preliminar, unit intacta), reset-password (nueva contraseña = unit_number), send-invitation (reenvío a owners status -1).

### Roles (`/api/roles`)

- **Todas protegidas** por Firebase Token + rol owner administrador.
- **CRUD:** create, list, getById, update, activate, anular. Respuestas en inglés.

### Meetings (`/api/meetings`)

- **Todas protegidas** por Firebase Token + rol **owner admin o gabaim** (Manage Davening Times).
- **GET `/api/meetings/structure`**: devuelve categorías con tipos; cada tipo incluye `modelKey` y `fields`. **List** acepta query `period` (YYYY-MM-DD, lunes de la semana).
- **DELETE `/api/meetings/period/:period`**: elimina todos los registros de esa semana (todos los modelKeys).
- **CRUD por modelKey:** `GET/POST /api/meetings/:modelKey`, `GET/PATCH /api/meetings/:modelKey/:id`, `PATCH .../activate`, `PATCH .../anular`. Ver [MEETINGS-STRUCTURE.md](./MEETINGS-STRUCTURE.md).

### RSVP (`/api/rsvps`)

- **Públicas:** create (POST), list (GET con from/to), getById (GET), update (PATCH).
- **Protegida (solo admin):** delete (DELETE). Requiere Firebase Token + owner con idRol administrador.
- **List:** filtra por `createdAt` entre from y to; devuelve comings, maybes y totales (totalHowManyMenComing, totalGuestsComing, total). Populate de owner y unit; incluye array checks.
- **List by unit:** `GET /api/rsvps/unit/:unitId?from=...&to=...` — registros RSVP de una unidad en un rango de fechas; respuesta array plano con populate. Ver [RSVPS.md](./RSVPS.md).

### Classifieds (`/api/classified-posts`)

- **Todas protegidas** por Firebase Token + **owner (cualquier rol)**.
- **Categorías:** `GET /api/classified-categories` — listar categorías (orden por name) para el selector al crear/editar posts.
- **CRUD posts:** create (title requerido, category opcional y validada), list (filtros category y visible_to_other_colonies), getById, update, delete. Respuestas con `category` poblado (name). Ver [CLASSIFIEDS.md](./CLASSIFIEDS.md).

### Units for Rent (`/api/units-for-rent`)

- **Todas protegidas** por Firebase Token + **owner (cualquier rol)**.
- **CRUD:** create (startDate, endDate, notes, only_my_colony; owner asignado desde token), list (filtro only_my_colony), getById, update, delete. Respuestas con `owner` (name, email, phone, unit). Ver [UNITS_FOR_RENT.md](./UNITS_FOR_RENT.md).

---

## Cómo usar esta documentación

Cada archivo `.md` incluye:

- **Seguridad y autenticación**
- **Resumen de endpoints** (tabla)
- **Endpoints detallados** (request/response, códigos de error)
- **Estructura de datos** (modelos y relaciones)
- **Guía backend** (archivos, controladores, middlewares)
- **Guía frontend** (ejemplos con axios)
- **Registro de cambios** (changelog)

Para integración con Postman o frontend, usar las secciones de request body y headers indicadas en cada endpoint.
