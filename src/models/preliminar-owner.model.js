/**
 * @fileoverview Modelo PreliminarOwner (datos preliminares por unidad).
 * Keys: husband_phone, last_name, unitId. Colección: preliminar_owners.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

const preliminarOwnerSchema = new mongoose.Schema(
  {
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
    husband_phone: { type: String, default: null },
    last_name: { type: String, default: null },
  },
  { timestamps: true, collection: 'preliminar_owners' }
);

module.exports = mongoose.model('PreliminarOwner', preliminarOwnerSchema);
