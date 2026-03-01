# 📚 Documentación API PerennialPark

Índice de la documentación disponible para desarrolladores frontend y backend.

---

## Documentos

| Documento | Descripción |
|-----------|-------------|
| [**OWNERS.md**](./OWNERS.md) | API de **Owners**: check-unit, signup, login, complete-profile, invitación (validate + complete). Flujo de registro y autenticación por unidad y propietarios (husband/wife). |
| [**UNITS.md**](./UNITS.md) | API de **Units**: CRUD de unidades (crear, listar, obtener, editar, eliminar, activar, anular). Incluye preliminar_owner, unlink, reset-password y send-invitation para administradores. Solo accesible por owners con idRol administrador. |
| [**ROLES.md**](./ROLES.md) | API de **Roles**: CRUD de roles (crear, listar, obtener, editar, activar, anular). Respuestas en inglés. Solo accesible por owners con idRol administrador. |

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
