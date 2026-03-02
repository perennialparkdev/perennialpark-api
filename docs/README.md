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

- **Todas protegidas** por Firebase Token + rol owner administrador.
- **GET `/api/meetings/structure`**: devuelve categorías con tipos; cada tipo incluye `modelKey` y `fields` para que el frontend sepa qué modelo y campos usar.
- **CRUD por modelKey:** `GET/POST /api/meetings/:modelKey`, `GET/PATCH /api/meetings/:modelKey/:id`, `PATCH .../activate`, `PATCH .../anular`. ModelKeys: `meeting`, `shabbos-mevorchim-meeting`, `daf-yomi-meeting`, `additional-shiurim-meeting`, `announcements-notes-meeting`, `pirkei-avis-shiur-announcements`, `mazel-tov-announcements`, `avos-ubonim-sponsor-announcements`. Ver [MEETINGS-STRUCTURE.md](./MEETINGS-STRUCTURE.md).

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
