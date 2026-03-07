/**
 * @fileoverview Modelo ClassifiedPost (avisos/clasificados).
 * Colección: classified_posts. Incluye refs al owner que lo creó (husband o wife).
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

const classifiedPostSchema = new mongoose.Schema(
  {
    title: { type: String, default: null },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassifiedCategory', default: null },
    description: { type: String, default: null },
    price: { type: Number, default: null },
    contact_info: { type: String, default: null },
    visible_to_other_colonies: { type: Boolean, default: false },
    createdByIdOwnerHusbandUser: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnerHusbandUser', default: null },
    createdByIdOwnerWifeUser: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnerWifeUser', default: null },
  },
  { timestamps: true, collection: 'classified_posts' }
);

module.exports = mongoose.model('ClassifiedPost', classifiedPostSchema);
