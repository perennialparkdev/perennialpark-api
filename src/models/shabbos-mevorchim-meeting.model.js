/**
 * @fileoverview Modelo ShabbosMevorchimMeeting (reuniones especiales del tipo Shabbos Mevorchim).
 * Keys: time, location, notes, period (YYYY-MM-DD), idType. Sin name; referencia Type igual que Meeting.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');
const { periodField } = require('./common-fields');

const shabbosMevorchimMeetingSchema = new mongoose.Schema(
  {
    time: { type: String, default: null },
    location: { type: String, default: null },
    notes: { type: String, default: null },
    period: periodField(),
    /** status: 1 = activo, 2 = anulado */
    status: { type: Number, default: 1 },
    idType: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', default: null },
  },
  { timestamps: true, collection: 'shabbos_mevorchim_meetings' }
);

module.exports = mongoose.model('ShabbosMevorchimMeeting', shabbosMevorchimMeetingSchema);
