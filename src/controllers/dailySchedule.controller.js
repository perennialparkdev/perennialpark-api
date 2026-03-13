/**
 * @fileoverview Endpoint para obtener la estructura diaria (por día actual o por fecha)
 * de todos los meetings/shiurim/shabbos/announcements, ordenados según las reglas
 * específicas de categorías y tipos.
 *
 * Respuesta JSON (resumen):
 * {
 *   success: true,
 *   day: "Thursday",
 *   date: "2026-03-12",
 *   week: { start: "2026-03-09", end: "2026-03-15" },
 *   items: [
 *     { category: "Minyanim", types: [ { type: "Shachris", data: [...] }, ... ] },
 *     { category: "Shabbos",  types: [...] },
 *     { category: "Shiurim",  types: [...] },
 *     { category: "Announcements", types: [ { type: "Announcements", data: [...] } ] }
 *   ]
 * }
 */

const mongoose = require('mongoose');
const { MODELS_BY_KEY, STATUS } = require('../config/meetingModels.config');
const { PERIOD_FORMAT } = require('../models/common-fields');

const dailyScheduleCtrl = {};

// --- Utilidades de fecha ----------------------------------------------------

function isValidDateString(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return PERIOD_FORMAT.test(trimmed);
}

function toDateFromYMD(ymd) {
  const [yearStr, monthStr, dayStr] = ymd.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  // Usamos Date.UTC para evitar problemas de zona horaria.
  return new Date(Date.UTC(year, month - 1, day));
}

function toYMDFromDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Devuelve { baseDate (Date UTC), dateStr (YYYY-MM-DD) } a partir de query.date o de "hoy".
 * query.date debe venir en formato YYYY-MM-DD.
 */
function getBaseDate(req) {
  const raw = req.query.date;
  if (raw && isValidDateString(String(raw))) {
    const trim = String(raw).trim();
    return { baseDate: toDateFromYMD(trim), dateStr: trim };
  }
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { baseDate: utcDate, dateStr: toYMDFromDate(utcDate) };
}

/**
 * Calcula el rango de semana lunes–domingo que contiene baseDate.
 * Retorna { weekStart, weekEnd } en formato YYYY-MM-DD.
 */
function getWeekRangeFromDate(baseDate) {
  const dayOfWeek = baseDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const mondayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 para Monday, 6 para Sunday

  const start = new Date(baseDate);
  start.setUTCDate(baseDate.getUTCDate() - mondayIndex);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    weekStart: toYMDFromDate(start),
    weekEnd: toYMDFromDate(end),
  };
}

function getWeekdayName(baseDate) {
  const dayOfWeek = baseDate.getUTCDay(); // 0 = Sunday
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return names[dayOfWeek];
}

// --- Configuración de tipos por día de display -------------------------------

// IDs de Type según descripción del usuario (colección Type).
// Se usan para filtrar por idType en cada modelo.
const TYPE_IDS = {
  // Category: Minyanim (idCategory: 69a521a9f8c0fd1685c98bc2)
  MINYANIM_SHACHRIS_MON_THU: '69a521a9f8c0fd1685c98bc6',
  MINYANIM_MINCHA_MON_THU: '69a521a9f8c0fd1685c98bc9',
  MINYANIM_MAARIV_MON_THU: '69a521a9f8c0fd1685c98bcc',
  MINYANIM_SHACHRIS_FRIDAY: '69a521aaf8c0fd1685c98bcf',
  MINYANIM_SHACHRIS_SUNDAY: '69a521aaf8c0fd1685c98bd2',
  MINYANIM_MINCHA_SUNDAY: '69a521aaf8c0fd1685c98bd5',
  MINYANIM_MAARIV_SUNDAY: '69a521aaf8c0fd1685c98bd8',

  // Category: Shabbos (idCategory: 69a527ec5866a00c49e7d6b3)
  SHABBOS_KABOLAS: '69a527ed5866a00c49e7d6b6',
  SHABBOS_SHACHRIS: '69a527ed5866a00c49e7d6b9',
  SHABBOS_SHABBOS_MEVORCHIM: '69a527ed5866a00c49e7d6bc', // ver nota: en BD real puede ser otro id; el usuario indicó modelo separado
  SHABBOS_MINCHA: '69a527ed5866a00c49e7d6bc',
  SHABBOS_MOTZEI_MAARIV: '69a527ed5866a00c49e7d6bf',

  // Category: Shiurim (idCategory: 69a52f9e91fb1691e5a7e2c4)
  SHIURIM_DAF_YOMI: '69a52f9e91fb1691e5a7e2c7',
  SHIURIM_ADDITIONAL: '69a52f9e91fb1691e5a7e2ca', // placeholder si el usuario tiene otro id real
};

/**
 * Config de slots por día de display.
 * Cada slot define:
 * - category: "Minyanim" | "Shabbos" | "Shiurim"
 * - typeName: string (p.ej. "Shachris")
 * - weekdayKey: string (p.ej. "Monday-thursday", "Friday", "Sunday", "wednesday-friday")
 * - modelKey: string (según meetingModels.config)
 * - idType: string (ObjectId del Type)
 *
 * El orden aquí ES el orden final deseado.
 */
const DAY_SLOTS = {
  Monday: [
    // Minyanim
    {
      category: 'Minyanim',
      typeName: 'Shachris',
      weekdayKey: 'Monday-thursday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_SHACHRIS_MON_THU,
    },
    {
      category: 'Minyanim',
      typeName: 'Mincha',
      weekdayKey: 'Monday-thursday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MINCHA_MON_THU,
    },
    {
      category: 'Minyanim',
      typeName: 'Maariv',
      weekdayKey: 'Monday-thursday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MAARIV_MON_THU,
    },
  ],
  Tuesday: [
    // Igual que Monday
    {
      category: 'Minyanim',
      typeName: 'Shachris',
      weekdayKey: 'Monday-thursday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_SHACHRIS_MON_THU,
    },
    {
      category: 'Minyanim',
      typeName: 'Mincha',
      weekdayKey: 'Monday-thursday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MINCHA_MON_THU,
    },
    {
      category: 'Minyanim',
      typeName: 'Maariv',
      weekdayKey: 'Monday-thursday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MAARIV_MON_THU,
    },
  ],
  Wednesday: [
    // Minyanim
    {
      category: 'Minyanim',
      typeName: 'Shachris',
      weekdayKey: 'Monday-thursday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_SHACHRIS_MON_THU,
    },
    {
      category: 'Minyanim',
      typeName: 'Mincha',
      weekdayKey: 'Monday-thursday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MINCHA_MON_THU,
    },
    {
      category: 'Minyanim',
      typeName: 'Maariv',
      weekdayKey: 'Monday-thursday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MAARIV_MON_THU,
    },
    // Shabbos
    {
      category: 'Shabbos',
      typeName: 'Kabolas Shabbos',
      weekdayKey: 'wednesday-friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.SHABBOS_KABOLAS,
    },
    {
      category: 'Shabbos',
      typeName: 'Shachris',
      weekdayKey: 'wednesday-friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.SHABBOS_SHACHRIS,
    },
    {
      category: 'Shabbos',
      typeName: 'Shabbos Mevorchim',
      weekdayKey: 'wednesday-friday',
      modelKey: 'shabbos-mevorchim-meeting',
      idType: TYPE_IDS.SHABBOS_SHABBOS_MEVORCHIM,
    },
    {
      category: 'Shabbos',
      typeName: 'Mincha',
      weekdayKey: 'wednesday-friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.SHABBOS_MINCHA,
    },
    {
      category: 'Shabbos',
      typeName: 'Motzei Shabbos Maariv',
      weekdayKey: 'wednesday-friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.SHABBOS_MOTZEI_MAARIV,
    },
    // Shiurim
    {
      category: 'Shiurim',
      typeName: 'Daf Yomi',
      weekdayKey: 'wednesday-friday',
      modelKey: 'daf-yomi-meeting',
      idType: TYPE_IDS.SHIURIM_DAF_YOMI,
    },
    {
      category: 'Shiurim',
      typeName: 'Additional Shiurim',
      weekdayKey: 'wednesday-friday',
      modelKey: 'additional-shiurim-meeting',
      idType: TYPE_IDS.SHIURIM_ADDITIONAL,
    },
  ],
  Thursday: [
    // Minyanim Monday-thursday
    {
      category: 'Minyanim',
      typeName: 'Shachris',
      weekdayKey: 'Monday-thursday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_SHACHRIS_MON_THU,
    },
    {
      category: 'Minyanim',
      typeName: 'Mincha',
      weekdayKey: 'Monday-thursday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MINCHA_MON_THU,
    },
    {
      category: 'Minyanim',
      typeName: 'Maariv',
      weekdayKey: 'Monday-thursday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MAARIV_MON_THU,
    },
    // Minyanim Friday (se muestra en Thursday)
    {
      category: 'Minyanim',
      typeName: 'Shachris',
      weekdayKey: 'Friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_SHACHRIS_FRIDAY,
    },
    // Minyanim Sunday (se muestran en Thursday)
    {
      category: 'Minyanim',
      typeName: 'Shachris',
      weekdayKey: 'Sunday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_SHACHRIS_SUNDAY,
    },
    {
      category: 'Minyanim',
      typeName: 'Mincha',
      weekdayKey: 'Sunday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MINCHA_SUNDAY,
    },
    {
      category: 'Minyanim',
      typeName: 'Maariv',
      weekdayKey: 'Sunday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MAARIV_SUNDAY,
    },
    // Shabbos
    {
      category: 'Shabbos',
      typeName: 'Kabolas Shabbos',
      weekdayKey: 'wednesday-friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.SHABBOS_KABOLAS,
    },
    {
      category: 'Shabbos',
      typeName: 'Shachris',
      weekdayKey: 'wednesday-friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.SHABBOS_SHACHRIS,
    },
    {
      category: 'Shabbos',
      typeName: 'Shabbos Mevorchim',
      weekdayKey: 'wednesday-friday',
      modelKey: 'shabbos-mevorchim-meeting',
      idType: TYPE_IDS.SHABBOS_SHABBOS_MEVORCHIM,
    },
    {
      category: 'Shabbos',
      typeName: 'Mincha',
      weekdayKey: 'wednesday-friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.SHABBOS_MINCHA,
    },
    {
      category: 'Shabbos',
      typeName: 'Motzei Shabbos Maariv',
      weekdayKey: 'wednesday-friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.SHABBOS_MOTZEI_MAARIV,
    },
    // Shiurim
    {
      category: 'Shiurim',
      typeName: 'Daf Yomi',
      weekdayKey: 'wednesday-friday',
      modelKey: 'daf-yomi-meeting',
      idType: TYPE_IDS.SHIURIM_DAF_YOMI,
    },
    {
      category: 'Shiurim',
      typeName: 'Additional Shiurim',
      weekdayKey: 'wednesday-friday',
      modelKey: 'additional-shiurim-meeting',
      idType: TYPE_IDS.SHIURIM_ADDITIONAL,
    },
  ],
  Friday: [
    // Minyanim Friday + Sunday (según reglas del usuario)
    {
      category: 'Minyanim',
      typeName: 'Shachris',
      weekdayKey: 'Friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_SHACHRIS_FRIDAY,
    },
    {
      category: 'Minyanim',
      typeName: 'Shachris',
      weekdayKey: 'Sunday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_SHACHRIS_SUNDAY,
    },
    {
      category: 'Minyanim',
      typeName: 'Mincha',
      weekdayKey: 'Sunday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MINCHA_SUNDAY,
    },
    {
      category: 'Minyanim',
      typeName: 'Maariv',
      weekdayKey: 'Sunday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MAARIV_SUNDAY,
    },
    // Shabbos
    {
      category: 'Shabbos',
      typeName: 'Kabolas Shabbos',
      weekdayKey: 'wednesday-friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.SHABBOS_KABOLAS,
    },
    {
      category: 'Shabbos',
      typeName: 'Shachris',
      weekdayKey: 'wednesday-friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.SHABBOS_SHACHRIS,
    },
    {
      category: 'Shabbos',
      typeName: 'Shabbos Mevorchim',
      weekdayKey: 'wednesday-friday',
      modelKey: 'shabbos-mevorchim-meeting',
      idType: TYPE_IDS.SHABBOS_SHABBOS_MEVORCHIM,
    },
    {
      category: 'Shabbos',
      typeName: 'Mincha',
      weekdayKey: 'wednesday-friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.SHABBOS_MINCHA,
    },
    {
      category: 'Shabbos',
      typeName: 'Motzei Shabbos Maariv',
      weekdayKey: 'wednesday-friday',
      modelKey: 'meeting',
      idType: TYPE_IDS.SHABBOS_MOTZEI_MAARIV,
    },
    // Shiurim
    {
      category: 'Shiurim',
      typeName: 'Daf Yomi',
      weekdayKey: 'wednesday-friday',
      modelKey: 'daf-yomi-meeting',
      idType: TYPE_IDS.SHIURIM_DAF_YOMI,
    },
    {
      category: 'Shiurim',
      typeName: 'Additional Shiurim',
      weekdayKey: 'wednesday-friday',
      modelKey: 'additional-shiurim-meeting',
      idType: TYPE_IDS.SHIURIM_ADDITIONAL,
    },
  ],
  Saturday: [
    // Minyanim Sunday (se muestran en Saturday)
    {
      category: 'Minyanim',
      typeName: 'Shachris',
      weekdayKey: 'Sunday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_SHACHRIS_SUNDAY,
    },
    {
      category: 'Minyanim',
      typeName: 'Mincha',
      weekdayKey: 'Sunday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MINCHA_SUNDAY,
    },
    {
      category: 'Minyanim',
      typeName: 'Maariv',
      weekdayKey: 'Sunday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MAARIV_SUNDAY,
    },
  ],
  Sunday: [
    // Minyanim Sunday
    {
      category: 'Minyanim',
      typeName: 'Shachris',
      weekdayKey: 'Sunday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_SHACHRIS_SUNDAY,
    },
    {
      category: 'Minyanim',
      typeName: 'Mincha',
      weekdayKey: 'Sunday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MINCHA_SUNDAY,
    },
    {
      category: 'Minyanim',
      typeName: 'Maariv',
      weekdayKey: 'Sunday',
      modelKey: 'meeting',
      idType: TYPE_IDS.MINYANIM_MAARIV_SUNDAY,
    },
  ],
};

// --- Helpers de consulta ----------------------------------------------------

async function findByModelAndType(modelKey, idType, weekStart, weekEnd) {
  const Model = MODELS_BY_KEY[modelKey];
  if (!Model) return [];
  if (!mongoose.Types.ObjectId.isValid(idType)) return [];
  const idTypeObj = new mongoose.Types.ObjectId(idType);
  return Model.find({
    status: STATUS.ACTIVE,
    idType: idTypeObj,
    period: { $gte: weekStart, $lte: weekEnd },
  })
    .sort({ time: 1, name: 1, createdAt: 1 })
    .lean();
}

/**
 * Obtiene todos los announcements (cualquiera de sus modelos) para la semana indicada.
 * Se agrupan bajo una sola categoría "Announcements" y un solo type "Announcements".
 */
async function findAnnouncementsForWeek(weekStart, weekEnd) {
  const announcementModelKeys = [
    'pirkei-avis-shiur-announcements',
    'mazel-tov-announcements',
    "avos-ubonim-sponsor-announcements",
    'announcements-notes-meeting',
  ];

  const promises = announcementModelKeys.map(async (modelKey) => {
    const Model = MODELS_BY_KEY[modelKey];
    if (!Model) return [];
    const docs = await Model.find({
      status: STATUS.ACTIVE,
      period: { $gte: weekStart, $lte: weekEnd },
    })
      .sort({ createdAt: 1 })
      .lean();
    return docs.map((doc) => {
      const base = {
        ...doc,
        sourceModel: modelKey,
        weekSpanStart: weekStart,
        weekSpanEnd: weekEnd,
      };

      if (modelKey === 'announcements-notes-meeting') {
        return {
          ...base,
          name: doc.name || doc.additionalNotes || null,
        };
      }

      return base;
    });
  });

  const results = await Promise.all(promises);
  return results.flat();
}

// --- Controlador principal ---------------------------------------------------

/**
 * GET /api/meetings/daily-schedule
 * Opcional: ?date=YYYY-MM-DD para forzar el día (útil para pruebas).
 */
dailyScheduleCtrl.getDailySchedule = async (req, res) => {
  try {
    const { baseDate, dateStr } = getBaseDate(req);
    const { weekStart, weekEnd } = getWeekRangeFromDate(baseDate);
    const dayName = getWeekdayName(baseDate);

    const slots = DAY_SLOTS[dayName];
    if (!slots) {
      return res.status(400).json({
        success: false,
        message: `Day ${dayName} is not supported for daily schedule.`,
      });
    }

    // Mantenemos orden de aparición de categorías y types según slots.
    const categoryMap = new Map();
    const categoryListInOrder = [];

    for (const slot of slots) {
      const { category, typeName, weekdayKey, modelKey, idType } = slot;
      let categoryEntry = categoryMap.get(category);
      if (!categoryEntry) {
        categoryEntry = { category, types: [] };
        categoryMap.set(category, categoryEntry);
        categoryListInOrder.push(categoryEntry);
      }

      let typeEntry = categoryEntry.types.find((t) => t.type === typeName);
      if (!typeEntry) {
        typeEntry = { type: typeName, data: [] };
        categoryEntry.types.push(typeEntry);
      }

      const docs = await findByModelAndType(modelKey, idType, weekStart, weekEnd);
      const mappedDocs = docs.map((doc) => ({
        ...doc,
        weekdayKey,
        sourceModel: modelKey,
      }));
      typeEntry.data.push(...mappedDocs);
    }

    // Announcements (siempre al final).
    const announcementsData = await findAnnouncementsForWeek(weekStart, weekEnd);
    const announcementsCategory = {
      category: 'Announcements',
      types: [
        {
          type: 'Announcements',
          data: announcementsData,
        },
      ],
    };

    const items = [...categoryListInOrder, announcementsCategory];

    return res.status(200).json({
      success: true,
      day: dayName,
      date: dateStr,
      week: {
        start: weekStart,
        end: weekEnd,
      },
      items,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in getDailySchedule:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = dailyScheduleCtrl;

