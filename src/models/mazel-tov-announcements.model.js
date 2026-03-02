/**
 * @fileoverview Modelo MazelTovAnnouncementsMeeting (anuncios de Mazel Tov).
 * Keys: description, period, idType.
 */

const mongoose = require('mongoose');

const mazelTovAnnouncementsMeetingSchema = new mongoose.Schema(
  {
    description: { type: String, default: null },
    period: { type: String, default: null },
    /** status: 1 = activo, 2 = anulado */
    status: { type: Number, default: 1 },
    idType: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', default: null },
  },
  { timestamps: true, collection: 'mazel_tov_announcements_meetings' }
);

module.exports = mongoose.model('MazelTovAnnouncementsMeeting', mazelTovAnnouncementsMeetingSchema);