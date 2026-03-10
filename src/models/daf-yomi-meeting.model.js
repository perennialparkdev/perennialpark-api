/**
 * @fileoverview Modelo DafYomiMeeting (reuniones especiales del tipo Daf Yomi).
 * Keys: time, period (YYYY-MM-DD), idType. Referencia Type igual que Meeting.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');
const { periodField } = require('./common-fields');

const dafYomiMeetingSchema = new mongoose.Schema(
  {
    time: { type: String, default: null },
    period: periodField(),
    /** status: 1 = activo, 2 = anulado */
    status: { type: Number, default: 1 },
    idType: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', default: null },
  },
  { timestamps: true, collection: 'daf_yomi_meetings' }
);

module.exports = mongoose.model('DafYomiMeeting', dafYomiMeetingSchema);
