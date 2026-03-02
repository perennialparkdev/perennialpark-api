/**
 * @fileoverview Modelo PirkeiAvisShiurMeeting (anuncios especiales del tipo Pirkei Avis Shiur).
 * Keys: name, period, idType.
 */

const mongoose = require('mongoose');

const pirkeiAvisShiurMeetingSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    period: { type: String, default: null },
    /** status: 1 = activo, 2 = anulado */
    status: { type: Number, default: 1 },
    idType: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', default: null },
  },
  { timestamps: true, collection: 'pirkei_avis_shiur_meetings' }
);

module.exports = mongoose.model('PirkeiAvisShiurMeeting', pirkeiAvisShiurMeetingSchema);