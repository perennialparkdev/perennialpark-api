/**
 * @fileoverview Modelo Category (categorías para tipos de reunión).
 * Key: name.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
