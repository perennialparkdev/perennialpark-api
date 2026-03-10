/**
 * @fileoverview Modelo AnnouncementsNotesMeeting (notas generales de anuncios).
 * Keys: additionalNotes, period (YYYY-MM-DD), idType.
 */

const mongoose = require('mongoose');
const { periodField } = require('./common-fields');

const announcementsNotesMeetingSchema = new mongoose.Schema(
  {
    additionalNotes: { type: String, default: null },
    period: periodField(),
    /** status: 1 = activo, 2 = anulado */
    status: { type: Number, default: 1 },
    idType: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', default: null },
  },
  { timestamps: true, collection: 'announcements_notes_meetings' }
);

module.exports = mongoose.model('AnnouncementsNotesMeeting', announcementsNotesMeetingSchema);