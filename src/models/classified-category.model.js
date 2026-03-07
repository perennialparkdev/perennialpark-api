/**
 * @fileoverview Modelo ClassifiedCategory (categorías de clasificados).
 * Colección: classified_categories. Campo: name.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

const classifiedCategorySchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
  },
  { timestamps: true, collection: 'classified_categories' }
);

module.exports = mongoose.model('ClassifiedCategory', classifiedCategorySchema);
