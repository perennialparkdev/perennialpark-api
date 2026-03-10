/**
 * @fileoverview Modelo Meeting (reuniones asociadas a un tipo).
 * Keys: name, location, time, period (YYYY-MM-DD), idType.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');
const { periodField } = require('./common-fields');

const meetingSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    location: { type: String, default: null },
    time: { type: String, default: null },
    period: periodField(),
    /** status: 1 = activo, 2 = anulado */
    status: { type: Number, default: 1 },
    idType: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Meeting', meetingSchema);
