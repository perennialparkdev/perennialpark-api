/**
 * @fileoverview Modelo AnnouncementsNotesMeeting (notas generales de anuncios).
 * Keys: additionalNotes, period, idType.
 */

const mongoose = require('mongoose');

const announcementsNotesMeetingSchema = new mongoose.Schema(
  {
    additionalNotes: { type: String, default: null },
    period: { type: String, default: null },
    /** status: 1 = activo, 2 = anulado */
    status: { type: Number, default: 1 },
    idType: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', default: null },
  },
  { timestamps: true, collection: 'announcements_notes_meetings' }
);

module.exports = mongoose.model('AnnouncementsNotesMeeting', announcementsNotesMeetingSchema);