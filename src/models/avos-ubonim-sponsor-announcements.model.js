/**
 * @fileoverview Modelo AvosUBonimSponsorMeeting (sponsors de Avos U'Bonim).
 * Keys: name, period (YYYY-MM-DD), idType.
 */

const mongoose = require('mongoose');
const { periodField } = require('./common-fields');

const avosUBonimSponsorMeetingSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Avos U'Bonim Sponsor" },
    name: { type: String, default: null },
    period: periodField(),
    /** status: 1 = activo, 2 = anulado */
    status: { type: Number, default: 1 },
    idType: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', default: null },
  },
  { timestamps: true, collection: 'avos_ubonim_sponsor_meetings' }
);

module.exports = mongoose.model('AvosUBonimSponsorMeeting', avosUBonimSponsorMeetingSchema);