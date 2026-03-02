/**
 * @fileoverview Modelo AdditionalShiurimMeeting (reuniones especiales del tipo Additional Shiurim).
 * Keys: name, time, description, period, idType. Referencia Type igual que Meeting.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

const additionalShiurimMeetingSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    time: { type: String, default: null },
    description: { type: String, default: null },
    period: { type: String, default: null },
    /** status: 1 = activo, 2 = anulado */
    status: { type: Number, default: 1 },
    idType: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', default: null },
  },
  { timestamps: true, collection: 'additional_shiurim_meetings' }
);

module.exports = mongoose.model('AdditionalShiurimMeeting', additionalShiurimMeetingSchema);
