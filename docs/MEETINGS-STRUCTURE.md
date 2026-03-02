# 📂 Estructura de reuniones y anuncios — Categories, Types y Models

Documentación de la jerarquía **Category → Type → Meeting** (o modelo especial). Incluye cómo funcionan las categorías, los tipos y cada modelo de reunión/anuncio, y a qué Type o Category pertenecen.

---

## Índice

- [Resumen de la jerarquía](#-resumen-de-la-jerarquía)
- [API de reuniones y anuncios](#-api-de-reuniones-y-anuncios)
- [Categories](#-categories)
- [Types](#-types)
- [Modelos de reuniones y anuncios](#-modelos-de-reuniones-y-anuncios)
- [Script de seed](#-script-de-seed)
- [Referencia rápida](#-referencia-rápida)

---

## 🔗 Resumen de la jerarquía

```
Category (ej. Minyanim, Shabbos, Shiurim, Announcements)
    └── Type (ej. Shachris + Monday-thursday, Daf Yomi + wednesday-friday)
            └── Meeting | ShabbosMevorchimMeeting | DafYomiMeeting | ... (según el tipo)
```

- Una **reunión** o **anuncio** siempre pertenece a un **Type** (`idType`).
- Un **Type** siempre pertenece a una **Category** (`idCategory`).
- Algunos tipos usan el modelo genérico **Meeting**; otros usan un **modelo especial** (por ejemplo `ShabbosMevorchimMeeting`, `DafYomiMeeting`) con campos propios.

---

## 🌐 API de reuniones y anuncios

Todas las rutas están bajo **`/api/meetings`** y requieren **Firebase ID Token** + **owner administrador** (mismo middleware que Units y Roles).

### Estructura (frontend ↔ backend)

- **GET `/api/meetings/structure`**  
  Devuelve todas las categorías con sus tipos. Para cada tipo incluye `_id`, `name`, `weekDay`, **`modelKey`** y **`fields`**.  
  El frontend usa `modelKey` para saber a qué ruta CRUD llamar (ej. `meeting`, `shabbos-mevorchim-meeting`, `daf-yomi-meeting`) y `fields` para construir el formulario de creación/edición. Así se evita ambigüedad entre Type y modelo.

**Ejemplo de respuesta (fragmento):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Minyanim",
      "types": [
        {
          "_id": "...",
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

### CRUD por modelKey

Todas las rutas usan el **modelKey** en la URL (el mismo que devuelve `structure` para cada tipo). Valores permitidos:  
`meeting`, `shabbos-mevorchim-meeting`, `daf-yomi-meeting`, `additional-shiurim-meeting`, `announcements-notes-meeting`, `pirkei-avis-shiur-announcements`, `mazel-tov-announcements`, `avos-ubonim-sponsor-announcements`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/meetings/:modelKey` | Listar (query: `status`, `idType` opcionales). |
| POST | `/api/meetings/:modelKey` | Crear (body debe incluir `idType` y los campos del modelo). |
| GET | `/api/meetings/:modelKey/:id` | Obtener uno por id. |
| PATCH | `/api/meetings/:modelKey/:id` | Actualizar. |
| PATCH | `/api/meetings/:modelKey/:id/activate` | Activar (status = 1). |
| PATCH | `/api/meetings/:modelKey/:id/anular` | Anular (status = 2). |

- **Crear:** el body debe incluir al menos `idType` (ObjectId del Type). El resto de campos según el modelo (ver `fields` en `structure`).  
- **Listar:** opcionalmente `?status=1` o `?idType=...` para filtrar.

---

## 📁 Categories

### Cómo funcionan

- **Modelo:** `Category`  
- **Archivo:** `src/models/category.model.js`  
- **Colección MongoDB:** `categories` (por defecto Mongoose).

**Campos:**

| Campo   | Tipo   | Descripción        |
|---------|--------|--------------------|
| `name`  | String | Nombre de la categoría. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

Las categorías agrupan tipos por tema (minyanim, shabbos, shiurim, anuncios). No tienen clave única a nivel de esquema; el nombre es identificador lógico.

### Categorías creadas por el seed

| name           | Descripción breve |
|----------------|-------------------|
| **Minyanim**   | Rezos (Shachris, Mincha, Maariv) por día. |
| **Shabbos**    | Rezos y eventos de Shabbos (+ tipo especial Shabbos Mevorchim). |
| **Shiurim**    | Clases (Daf Yomi, Additional Shiurim). |
| **Announcements** | Anuncios (Pirkei Avis, Mazel Tov, Avos U'Bonim Sponsor, Announcements Notes). |

---

## 📋 Types

### Cómo funcionan

- **Modelo:** `Type`  
- **Archivo:** `src/models/type.model.js`  
- **Colección MongoDB:** `types` (por defecto).

**Campos:**

| Campo       | Tipo     | Descripción |
|------------|----------|-------------|
| `name`     | String   | Nombre del tipo (ej. "Shachris", "Daf Yomi"). |
| `weekDay`  | String   | Día o rango de días (ej. "Monday-thursday", "Friday", "Shabbos"). Puede ser `null` para tipos que no son por día (ej. anuncios). |
| `idCategory` | ObjectId (ref `Category`) | Categoría a la que pertenece el tipo. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

**Clave única compuesta:** `(name, weekDay, idCategory)`. Así se permite, por ejemplo, un tipo "Shachris" para "Monday-thursday" y otro "Shachris" para "Friday" dentro de la misma categoría Minyanim.

### Types por categoría (según el seed)

#### Minyanim

| name     | weekDay          |
|----------|------------------|
| Shachris | Monday-thursday  |
| Mincha   | Monday-thursday  |
| Maariv   | Monday-thursday  |
| Shachris | Friday          |
| Shachris | Sunday          |
| Mincha   | Sunday          |
| Maariv   | Sunday          |

#### Shabbos

| name                | weekDay          |
|---------------------|------------------|
| Kabolas Shabbos     | wednesday-friday |
| Shachris            | wednesday-friday |
| Mincha              | wednesday-friday |
| Motzei Shabbos Maariv | wednesday-friday |
| **Shabbos Mevorchim** | Shabbos        | *(tipo especial; reuniones en `ShabbosMevorchimMeeting`)* |

#### Shiurim

| name               | weekDay          |
|--------------------|------------------|
| Daf Yomi           | wednesday-friday |
| Additional Shiurim | wednesday-friday |

#### Announcements (weekDay = null)

| name                     | weekDay |
|--------------------------|--------|
| Pirkei Avis Shiur        | null   |
| Mazel Tov Announcements | null   |
| Avos U'Bonim Sponsor    | null   |
| Announcements Notes     | null   |

---

## 📄 Modelos de reuniones y anuncios

Todos los modelos que representan una “reunión” o “anuncio” tienen al menos **`idType`** (ref `Type`). Según el tipo, se usa el modelo genérico **Meeting** o uno de los **modelos especiales** listados abajo.

### Modelo genérico: Meeting

- **Archivo:** `src/models/meeting.model.js`  
- **Colección:** `meetings`

**Uso:** Reuniones estándar (nombre, lugar, hora, período).

| Campo     | Tipo   | Descripción |
|----------|--------|-------------|
| `name`   | String | Nombre de la reunión. |
| `location` | String | Lugar. |
| `time`   | String | Hora. |
| `period` | String | Período (ej. semanal, mensual). |
| `idType` | ObjectId (ref `Type`) | Tipo al que pertenece. |

**Pertenecen a este modelo** los tipos que no tienen modelo especial propio, por ejemplo los de **Minyanim** (Shachris, Mincha, Maariv en sus distintos weekDay) y los de **Shabbos** excepto Shabbos Mevorchim (Kabolas Shabbos, Shachris, Mincha, Motzei Shabbos Maariv en wednesday-friday).

---

### ShabbosMevorchimMeeting

- **Archivo:** `src/models/shabbos-mevorchim-meeting.model.js`  
- **Colección:** `shabbos_mevorchim_meetings`

**Uso:** Reuniones especiales del tipo **Shabbos Mevorchim** (Category: Shabbos). Sin campo `name`; incluye `notes`.

| Campo     | Tipo   | Descripción |
|----------|--------|-------------|
| `time`   | String | Hora. |
| `location` | String | Lugar. |
| `notes`  | String | Notas. |
| `period` | String | Período. |
| `idType` | ObjectId (ref `Type`) | Debe ser el Type "Shabbos Mevorchim" (weekDay: Shabbos). |

**Pertenece al Type:** `name: "Shabbos Mevorchim"`, `weekDay: "Shabbos"`, Category: **Shabbos**.

---

### DafYomiMeeting

- **Archivo:** `src/models/daf-yomi-meeting.model.js`  
- **Colección:** `daf_yomi_meetings`

**Uso:** Reuniones/clases del tipo **Daf Yomi** (solo time y period).

| Campo   | Tipo   | Descripción |
|--------|--------|-------------|
| `time` | String | Hora. |
| `period` | String | Período. |
| `idType` | ObjectId (ref `Type`) | Debe ser el Type "Daf Yomi". |

**Pertenece al Type:** `name: "Daf Yomi"`, `weekDay: "wednesday-friday"`, Category: **Shiurim**.

---

### AdditionalShiurimMeeting

- **Archivo:** `src/models/additional-shiurim-meeting.model.js`  
- **Colección:** `additional_shiurim_meetings`

**Uso:** Reuniones/clases del tipo **Additional Shiurim** (nombre, hora, descripción, período).

| Campo         | Tipo   | Descripción |
|--------------|--------|-------------|
| `name`       | String | Nombre. |
| `time`       | String | Hora. |
| `description` | String | Descripción. |
| `period`     | String | Período. |
| `idType`     | ObjectId (ref `Type`) | Debe ser el Type "Additional Shiurim". |

**Pertenece al Type:** `name: "Additional Shiurim"`, `weekDay: "wednesday-friday"`, Category: **Shiurim**.

---

### PirkeiAvisShiurMeeting

- **Archivo:** `src/models/pirkei-avis-shiur-meeting.model.js`  
- **Colección:** `pirkei_avis_shiur_meetings`

**Uso:** Anuncios del tipo **Pirkei Avis Shiur** (Category: Announcements).

| Campo   | Tipo   | Descripción |
|--------|--------|-------------|
| `name` | String | Nombre. |
| `period` | String | Período. |
| `idType` | ObjectId (ref `Type`) | Debe ser el Type "Pirkei Avis Shiur". |

**Pertenece al Type:** `name: "Pirkei Avis Shiur"`, `weekDay: null`, Category: **Announcements**.

---

### MazelTovAnnouncementsMeeting

- **Archivo:** `src/models/mazel-tov-announcements-meeting.model.js`  
- **Colección:** `mazel_tov_announcements_meetings`

**Uso:** Anuncios del tipo **Mazel Tov Announcements**.

| Campo         | Tipo   | Descripción |
|--------------|--------|-------------|
| `description` | String | Descripción del anuncio. |
| `period`     | String | Período. |
| `idType`     | ObjectId (ref `Type`) | Debe ser el Type "Mazel Tov Announcements". |

**Pertenece al Type:** `name: "Mazel Tov Announcements"`, `weekDay: null`, Category: **Announcements**.

---

### AvosUBonimSponsorMeeting

- **Archivo:** `src/models/avos-ubonim-sponsor-meeting.model.js`  
- **Colección:** `avos_ubonim_sponsor_meetings`

**Uso:** Sponsors del tipo **Avos U'Bonim Sponsor**.

| Campo   | Tipo   | Descripción |
|--------|--------|-------------|
| `name` | String | Nombre (ej. del sponsor). |
| `period` | String | Período. |
| `idType` | ObjectId (ref `Type`) | Debe ser el Type "Avos U'Bonim Sponsor". |

**Pertenece al Type:** `name: "Avos U'Bonim Sponsor"`, `weekDay: null`, Category: **Announcements**.

---

### AnnouncementsNotesMeeting

- **Archivo:** `src/models/announcements-notes-meeting.model.js`  
- **Colección:** `announcements_notes_meetings`

**Uso:** Notas generales del tipo **Announcements Notes**.

| Campo            | Tipo   | Descripción |
|-----------------|--------|-------------|
| `additionalNotes` | String | Notas adicionales. |
| `period`        | String | Período. |
| `idType`        | ObjectId (ref `Type`) | Debe ser el Type "Announcements Notes". |

**Pertenece al Type:** `name: "Announcements Notes"`, `weekDay: null`, Category: **Announcements**.

---

## 🌱 Script de seed

- **Archivo:** `scripts/seed-meetings-structure.js`  
- **Uso:** `node scripts/seed-meetings-structure.js` (con MongoDB y `.env` configurados).

El script **solo crea Categories y Types**; no crea documentos en Meeting ni en los modelos especiales.

1. **Minyanim:** categoría + 7 tipos (Shachris, Mincha, Maariv según weekDay).  
2. **Shabbos:** categoría + 4 tipos (Kabolas Shabbos, Shachris, Mincha, Motzei Shabbos Maariv en wednesday-friday) + tipo **Shabbos Mevorchim** (weekDay: Shabbos) asociado por `idCategory` fijo.  
3. **Shiurim:** categoría + 2 tipos (Daf Yomi, Additional Shiurim en wednesday-friday).  
4. **Announcements:** categoría + 4 tipos (Pirkei Avis Shiur, Mazel Tov Announcements, Avos U'Bonim Sponsor, Announcements Notes) con `weekDay: null`.

Es idempotente: se puede ejecutar varias veces sin duplicar categorías ni tipos gracias a la clave compuesta de Type.

---

## 📊 Referencia rápida

| Category      | Type (ejemplos)        | Modelo de datos        |
|---------------|------------------------|-------------------------|
| Minyanim      | Shachris, Mincha, Maariv (varios weekDay) | **Meeting** |
| Shabbos       | Kabolas Shabbos, Shachris, Mincha, Motzei Shabbos Maariv | **Meeting** |
| Shabbos       | Shabbos Mevorchim     | **ShabbosMevorchimMeeting** |
| Shiurim       | Daf Yomi              | **DafYomiMeeting** |
| Shiurim       | Additional Shiurim    | **AdditionalShiurimMeeting** |
| Announcements | Pirkei Avis Shiur     | **PirkeiAvisShiurMeeting** |
| Announcements | Mazel Tov Announcements | **MazelTovAnnouncementsMeeting** |
| Announcements | Avos U'Bonim Sponsor  | **AvosUBonimSponsorMeeting** |
| Announcements | Announcements Notes   | **AnnouncementsNotesMeeting** |

Para crear o listar reuniones/anuncios: obtener el `_id` del **Type** correspondiente (por nombre + weekDay + idCategory) y usarlo en `idType` del modelo indicado.
