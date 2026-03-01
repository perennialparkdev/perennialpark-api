/**
 * @fileoverview Modelo Unit (unidad/vivienda).
 * Campos derivados de exportaciones Excel Unit_export (columnas únicas unificadas).
 * Referencias a OwnerHusbandUser, OwnerWifeUser y Children.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema(
  {
    id: { type: String, default: null },
    unit_number: { type: String, default: null },
    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    zip: { type: String, default: null },
    colony_name: { type: String, default: null },
    notes: { type: String, default: null },
    created_by: { type: String, default: null },
    created_by_id: { type: String, default: null },
    is_sample: { type: Boolean, default: false },
    account_created_date: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Unit', unitSchema);
