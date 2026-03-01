/**
 * @fileoverview Modelo Children (hijos asociados a una unidad).
 * Keys: unitId, name, age, genre.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

const childrenSchema = new mongoose.Schema(
  {
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
    name: { type: String, default: null },
    age: { type: Number, default: null },
    genre: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Children', childrenSchema);
