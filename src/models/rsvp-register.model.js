/**
 * @fileoverview Modelo RsvpRegister (registros de RSVP / citas).
 * status: Coming | Maybe | Not Coming. Referencias a OwnerHusbandUser y Unit.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

const STATUS_VALUES = ['Coming', 'Maybe', 'Not Coming'];

const rsvpRegisterSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: null,
    },
    date: { type: Date, default: null },
    howManyMen: { type: Number, default: 0, min: 0 },
    guests: { type: Number, default: 0, min: 0 },
    checks: [
      {
        check: { type: String, default: null },
      },
    ],
    idOwnerHusbandUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OwnerHusbandUser',
      default: null,
    },
    idUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      default: null,
    },
  },
  { timestamps: true, collection: 'rsvp_registers' }
);

module.exports = mongoose.model('RsvpRegister', rsvpRegisterSchema);
