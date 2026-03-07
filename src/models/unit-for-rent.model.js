/**
 * @fileoverview Modelo UnitForRent (unidades en alquiler).
 * Colección: units_for_rent. Campos: startDate, endDate, notes, only_my_colony y refs al owner que publica (husband o wife).
 * La unidad en alquiler es la enlazada al owner (owner.unitId); no se guarda unitId en este schema.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

const unitForRentSchema = new mongoose.Schema(
  {
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    notes: { type: String, default: null },
    only_my_colony: { type: Boolean, default: false },
    createdByIdOwnerHusbandUser: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnerHusbandUser', default: null },
    createdByIdOwnerWifeUser: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnerWifeUser', default: null },
  },
  { timestamps: true, collection: 'units_for_rent' }
);

module.exports = mongoose.model('UnitForRent', unitForRentSchema);
