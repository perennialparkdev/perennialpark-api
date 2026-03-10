/**
 * @fileoverview Mapeo Type (category + name + weekDay) → modelKey y campos.
 * Permite al frontend y al CRUD saber qué modelo y qué campos usar por cada Type.
 */

const Meeting = require('../models/meeting.model');
const ShabbosMevorchimMeeting = require('../models/shabbos-mevorchim-meeting.model');
const DafYomiMeeting = require('../models/daf-yomi-meeting.model');
const AdditionalShiurimMeeting = require('../models/additional-shiurim-meeting.model');
const AnnouncementsNotesMeeting = require('../models/announcements-notes-meeting.model');
const PirkeiAvisShiurMeeting = require('../models/pirkei-avis-shiur-announcements.model');
const MazelTovAnnouncementsMeeting = require('../models/mazel-tov-announcements.model');
const AvosUBonimSponsorMeeting = require('../models/avos-ubonim-sponsor-announcements.model');

/** Clave: "categoryName|typeName|weekDay" (weekDay null → "null"). Valor: { modelKey, fields } */
const TYPE_TO_MODEL = {
  // Minyanim → Meeting
  'Minyanim|Shachris|Monday-thursday': { modelKey: 'meeting', fields: ['name', 'location', 'time', 'period', 'status', 'idType'] },
  'Minyanim|Mincha|Monday-thursday': { modelKey: 'meeting', fields: ['name', 'location', 'time', 'period', 'status', 'idType'] },
  'Minyanim|Maariv|Monday-thursday': { modelKey: 'meeting', fields: ['name', 'location', 'time', 'period', 'status', 'idType'] },
  'Minyanim|Shachris|Friday': { modelKey: 'meeting', fields: ['name', 'location', 'time', 'period', 'status', 'idType'] },
  'Minyanim|Shachris|Sunday': { modelKey: 'meeting', fields: ['name', 'location', 'time', 'period', 'status', 'idType'] },
  'Minyanim|Mincha|Sunday': { modelKey: 'meeting', fields: ['name', 'location', 'time', 'period', 'status', 'idType'] },
  'Minyanim|Maariv|Sunday': { modelKey: 'meeting', fields: ['name', 'location', 'time', 'period', 'status', 'idType'] },
  // Shabbos → Meeting (4) o ShabbosMevorchimMeeting (1)
  'Shabbos|Kabolas Shabbos|wednesday-friday': { modelKey: 'meeting', fields: ['name', 'location', 'time', 'period', 'status', 'idType'] },
  'Shabbos|Shachris|wednesday-friday': { modelKey: 'meeting', fields: ['name', 'location', 'time', 'period', 'status', 'idType'] },
  'Shabbos|Mincha|wednesday-friday': { modelKey: 'meeting', fields: ['name', 'location', 'time', 'period', 'status', 'idType'] },
  'Shabbos|Motzei Shabbos Maariv|wednesday-friday': { modelKey: 'meeting', fields: ['name', 'location', 'time', 'period', 'status', 'idType'] },
  // En la BD actual el Type \"Shabbos Mevorchim\" quedó con weekDay = \"wednesday-friday\",
  // por eso usamos ese valor aquí para que getStructure asigne correctamente el modelo.
  'Shabbos|Shabbos Mevorchim|wednesday-friday': {
    modelKey: 'shabbos-mevorchim-meeting',
    fields: ['time', 'location', 'notes', 'period', 'status', 'idType'],
  },
  // Shiurim
  'Shiurim|Daf Yomi|wednesday-friday': { modelKey: 'daf-yomi-meeting', fields: ['time', 'period', 'status', 'idType'] },
  'Shiurim|Additional Shiurim|wednesday-friday': { modelKey: 'additional-shiurim-meeting', fields: ['name', 'time', 'description', 'period', 'status', 'idType'] },
  // Announcements (weekDay null)
  'Announcements|Pirkei Avis Shiur|null': { modelKey: 'pirkei-avis-shiur-announcements', fields: ['title', 'name', 'period', 'status', 'idType'] },
  'Announcements|Mazel Tov Announcements|null': { modelKey: 'mazel-tov-announcements', fields: ['title', 'description', 'period', 'status', 'idType'] },
  "Announcements|Avos U'Bonim Sponsor|null": { modelKey: 'avos-ubonim-sponsor-announcements', fields: ['title', 'name', 'period', 'status', 'idType'] },
  'Announcements|Announcements Notes|null': { modelKey: 'announcements-notes-meeting', fields: ['title', 'additionalNotes', 'period', 'status', 'idType'] },
};

/** modelKey → Mongoose Model (para CRUD) */
const MODELS_BY_KEY = {
  'meeting': Meeting,
  'shabbos-mevorchim-meeting': ShabbosMevorchimMeeting,
  'daf-yomi-meeting': DafYomiMeeting,
  'additional-shiurim-meeting': AdditionalShiurimMeeting,
  'announcements-notes-meeting': AnnouncementsNotesMeeting,
  'pirkei-avis-shiur-announcements': PirkeiAvisShiurMeeting,
  'mazel-tov-announcements': MazelTovAnnouncementsMeeting,
  'avos-ubonim-sponsor-announcements': AvosUBonimSponsorMeeting,
};

const STATUS = { ACTIVE: 1, INACTIVE: 2 };

function typeKey(categoryName, typeName, weekDay) {
  const w = weekDay == null ? 'null' : String(weekDay);
  return `${categoryName}|${typeName}|${w}`;
}

function getModelInfo(categoryName, typeName, weekDay) {
  return TYPE_TO_MODEL[typeKey(categoryName, typeName, weekDay)] || null;
}

function getModelByKey(modelKey) {
  return MODELS_BY_KEY[modelKey] || null;
}

function getAllModelKeys() {
  return Object.keys(MODELS_BY_KEY);
}

/** modelKey → lista de campos permitidos (para buildDoc en create/update) */
const FIELDS_BY_MODEL_KEY = {
  'meeting': ['name', 'location', 'time', 'period', 'status', 'idType'],
  'shabbos-mevorchim-meeting': ['time', 'location', 'notes', 'period', 'status', 'idType'],
  'daf-yomi-meeting': ['time', 'period', 'status', 'idType'],
  'additional-shiurim-meeting': ['name', 'time', 'description', 'period', 'status', 'idType'],
  'announcements-notes-meeting': ['title', 'additionalNotes', 'period', 'status', 'idType'],
  'pirkei-avis-shiur-announcements': ['title', 'name', 'period', 'status', 'idType'],
  'mazel-tov-announcements': ['title', 'description', 'period', 'status', 'idType'],
  'avos-ubonim-sponsor-announcements': ['title', 'name', 'period', 'status', 'idType'],
};

function getFieldsForModelKey(modelKey) {
  return FIELDS_BY_MODEL_KEY[modelKey] || [];
}

module.exports = {
  TYPE_TO_MODEL,
  MODELS_BY_KEY,
  FIELDS_BY_MODEL_KEY,
  STATUS,
  typeKey,
  getModelInfo,
  getModelByKey,
  getAllModelKeys,
  getFieldsForModelKey,
};
