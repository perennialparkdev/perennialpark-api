# 🗓 Daily Schedule API (Meetings & Announcements)

> Nueva funcionalidad para obtener la **estructura diaria** (por día actual o por fecha) de todos los meetings / shiurim / shabbos / announcements, en el orden exacto requerido para la semana.

---

## 🎯 Objetivo

Entregar al frontend, en **un solo endpoint**, la lista ordenada de:

- Minyanim
- Shabbos
- Shiurim
- Announcements

para **un día concreto** (por defecto el día actual), pero filtrando siempre por la **semana** en la que cae ese día.

---

## 🔗 Endpoint

- **Método**: `GET`
- **Ruta**: `/api/meetings/daily-schedule`
- **Auth**: Igual que el resto de `/api/meetings`  
  - `Authorization: Bearer <idToken>`  
  - Rol: owner admin o gabaim (Manage Davening Times)

### Query params

- `date` (opcional): `YYYY-MM-DD`
  - Si se envía, se usa como **día base**.
  - Si no se envía, se usa el **día actual del servidor**.

Ejemplos:

- `GET /api/meetings/daily-schedule` → usa hoy.
- `GET /api/meetings/daily-schedule?date=2026-03-12` → fuerza Thursday 12/03/2026.

---

## 📆 Lógica de fechas

1. Se toma la **fecha base**:
   - `query.date` (si está y tiene formato `YYYY-MM-DD`), o
   - la fecha actual del servidor.
2. Se calcula la **semana lunes–domingo** que contiene esa fecha:
   - `week.start`: lunes de esa semana (`YYYY-MM-DD`).
   - `week.end`: domingo de esa semana (`YYYY-MM-DD`).
3. Se obtiene el **nombre del día** (`Monday`, `Tuesday`, …, `Sunday`) a partir de la fecha base.
4. **Todas las consultas a la BD** se filtran por:
   - `status = 1` (activo),
   - `period` `>= week.start` y `<= week.end`.

> Nota: El campo `period` sigue siendo el mismo `YYYY-MM-DD` usado en el resto de la API.  
> Aquí se interpreta como “fecha dentro de la semana”; cualquier día de esa semana es válido.

---

## 🧱 Shape del JSON de respuesta

Respuesta general:

```json
{
  "success": true,
  "day": "Thursday",
  "date": "2026-03-12",
  "week": {
    "start": "2026-03-09",
    "end": "2026-03-15"
  },
  "items": [
    {
      "category": "Minyanim",
      "types": [
        {
          "type": "Shachris",
          "data": [
            {
              "_id": "m1",
              "time": "06:45",
              "location": "Main Shul",
              "period": "2026-03-12",
              "status": 1,
              "idType": "69a521a9f8c0fd1685c98bc6",
              "weekdayKey": "Monday-thursday",
              "sourceModel": "meeting"
            }
          ]
        }
      ]
    },
    {
      "category": "Announcements",
      "types": [
        {
          "type": "Announcements",
          "data": [
            {
              "_id": "a1",
              "title": "Kiddush this Shabbos",
              "period": "2026-03-09",
              "status": 1,
              "idType": "…",
              "sourceModel": "pirkei-avis-shiur-announcements",
              "weekSpanStart": "2026-03-09",
              "weekSpanEnd": "2026-03-15"
            }
          ]
        }
      ]
    }
  ]
}
```

### Campos

- **`day`**: nombre del día calculado a partir de la fecha base (`Monday`…”Sunday”).
- **`date`**: fecha base en formato `YYYY-MM-DD`.
- **`week.start` / `week.end`**: lunes y domingo de la semana en curso.
- **`items`**: array ya **ordenado** con:
  - `category`: `"Minyanim"`, `"Shabbos"`, `"Shiurim"`, `"Announcements"`.
  - `types`: array de tipos dentro de la categoría, en el **orden ya calculado** para ese día.
    - `type`: nombre del type (ej. `"Shachris"`, `"Mincha"`, `"Maariv"`, `"Daf Yomi"`, etc.).
    - `data`: array de registros de ese type para esa semana.

Cada elemento de `data` contiene:

- `_id`: ObjectId del documento.
- Campos propios del modelo (`time`, `location`, `name`, `description`, `notes`, etc.).
- `period`: fecha dentro de la semana actual.
- `status`, `idType`.
- `weekdayKey`: weekday lógico del Type (`Monday-thursday`, `Friday`, `Sunday`, `wednesday-friday`).
- `sourceModel`: `modelKey` del que proviene:
  - `meeting`
  - `daf-yomi-meeting`
  - `shabbos-mevorchim-meeting`
  - `additional-shiurim-meeting`
  - `pirkei-avis-shiur-announcements`
  - `mazel-tov-announcements`
  - `avos-ubonim-sponsor-announcements`
  - `announcements-notes-meeting`

---

## 🧮 Regla especial de Announcements

Categoría: **`Announcements`**.

- Cualquier announcement cuyo `period` caiga entre `week.start` y `week.end`:
  - Debe mostrarse **todos los días** de esa semana.
  - En el JSON aparecerá en la categoría `"Announcements"`, type `"Announcements"`.
- Cada registro lleva:
  - `weekSpanStart`: igual a `week.start`.
  - `weekSpanEnd`: igual a `week.end`.
- En la respuesta, la categoría `"Announcements"` se añade **siempre al final de `items`**, después de:
  - `Minyanim`
  - `Shabbos`
  - `Shiurim`

---

## 📚 Orden por día (resumen)

En todos los casos, el backend ya devuelve las categorías y types **en orden**, el frontend solo itera.

### Monday

- **Categoría `Minyanim`**:
  1. `Shachris` (weekDay: `Monday-thursday`)
  2. `Mincha` (weekDay: `Monday-thursday`)
  3. `Maariv` (weekDay: `Monday-thursday`)
- Luego `Announcements`.

### Tuesday

- Igual que **Monday**:
  1. `Shachris` (Monday–Thursday)
  2. `Mincha` (Monday–Thursday)
  3. `Maariv` (Monday–Thursday)
- Luego `Announcements`.

### Wednesday

1. **Minyanim**:
   - `Shachris` (Monday–Thursday)
   - `Mincha` (Monday–Thursday)
   - `Maariv` (Monday–Thursday)
2. **Shabbos**:
   - `Kabolas Shabbos` (wednesday–friday)
   - `Shachris` (wednesday–friday)
   - `Shabbos Mevorchim` (wednesday–friday, modelo `shabbos-mevorchim-meeting`)
   - `Mincha` (wednesday–friday)
   - `Motzei Shabbos Maariv` (wednesday–friday)
3. **Shiurim**:
   - `Daf Yomi` (wednesday–friday, modelo `daf-yomi-meeting`)
   - `Additional Shiurim` (wednesday–friday, modelo `additional-shiurim-meeting`)
4. **Announcements** (al final).

### Thursday

1. **Minyanim**:
   - `Shachris` (Monday–Thursday)
   - `Mincha` (Monday–Thursday)
   - `Maariv` (Monday–Thursday)
   - `Shachris` (Friday) **mostrado en Thursday**
   - `Shachris` (Sunday) **mostrado en Thursday**
   - `Mincha` (Sunday) **mostrado en Thursday**
   - `Maariv` (Sunday) **mostrado en Thursday**
2. **Shabbos** (igual que Wednesday).
3. **Shiurim** (igual que Wednesday).
4. **Announcements** (al final).

### Friday

1. **Minyanim**:
   - `Shachris` (Friday)
   - `Shachris` (Sunday) **mostrado también en Friday**
   - `Mincha` (Sunday) **mostrado también en Friday**
   - `Maariv` (Sunday) **mostrado también en Friday**
2. **Shabbos** (igual que Wednesday).
3. **Shiurim** (igual que Wednesday).
4. **Announcements** (al final).

### Saturday

1. **Minyanim**:
   - `Shachris` (Sunday) **mostrado en Saturday**
   - `Mincha` (Sunday) **mostrado en Saturday**
   - `Maariv` (Sunday) **mostrado en Saturday**
2. **Announcements** (al final).

### Sunday

1. **Minyanim**:
   - `Shachris` (Sunday)
   - `Mincha` (Sunday)
   - `Maariv` (Sunday)
2. **Announcements** (al final).

---

## 🧩 Implementación backend (resumen técnico)

- Controlador: `src/controllers/dailySchedule.controller.js`
  - `getDailySchedule(req, res)`
  - Usa `MODELS_BY_KEY` y `STATUS` desde `src/config/meetingModels.config.js`.
  - Usa `PERIOD_FORMAT` desde `src/models/common-fields.js`.
- Ruta: `src/routes/meetings.route.js`
  - `GET /api/meetings/daily-schedule` (montada bajo `/api/meetings` en `app.js`).
- Internamente:
  - Define una tabla `DAY_SLOTS` con los **slots por día** (combinación de categoría, typeName, weekdayKey, modelKey, idType).
  - Para el `day` actual:
    - Recorre los slots en orden.
    - Para cada slot hace un `find` filtrando por `status`, `idType` y `period` entre `week.start` y `week.end`.
    - Agrupa resultados en la estructura JSON descrita arriba.
  - Para Announcements:
    - Recorre los modelos de anuncios.
    - Filtra por semana.
    - Añade `weekSpanStart` y `weekSpanEnd`.
    - Los inserta en la categoría `"Announcements"` al final de `items`.

---

## 🖥 Guía rápida frontend

1. Llamar a:

   ```http
   GET /api/meetings/daily-schedule
   Authorization: Bearer <idToken>
   ```

2. Leer:

   - `day`, `date`, `week.start`, `week.end`.
   - Iterar sobre `items`:
     - Mostrar un bloque por `category`.
     - Dentro, iterar `types` en orden.
     - Dentro de cada `type`, iterar `data` (registros).
3. No es necesario volver a ordenar nada: la API ya devuelve todo en el orden de visualización correcto.

