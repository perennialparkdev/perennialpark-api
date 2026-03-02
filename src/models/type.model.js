/**
 * @fileoverview Modelo Type (tipos de reunión por categoría).
 * Keys: name, weekDay, idCategory. Clave única compuesta: (name, weekDay, idCategory).
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

const typeSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    weekDay: { type: String, default: null },
    idCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  },
  { timestamps: true }
);

typeSchema.index({ name: 1, weekDay: 1, idCategory: 1 }, { unique: true });

module.exports = mongoose.model('Type', typeSchema);
