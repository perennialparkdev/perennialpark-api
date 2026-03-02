/**
 * @fileoverview Modelo AvosUBonimSponsorMeeting (sponsors de Avos U'Bonim).
 * Keys: name, period, idType.
 */

const mongoose = require('mongoose');

const avosUBonimSponsorMeetingSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    period: { type: String, default: null },
    /** status: 1 = activo, 2 = anulado */
    status: { type: Number, default: 1 },
    idType: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', default: null },
  },
  { timestamps: true, collection: 'avos_ubonim_sponsor_meetings' }
);

module.exports = mongoose.model('AvosUBonimSponsorMeeting', avosUBonimSponsorMeetingSchema);