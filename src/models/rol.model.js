/**
 * @fileoverview Modelo Rol (roles para owners).
 * Colección: rol. Keys: name, description.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

const rolSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    description: { type: String, default: null },
  },
  { timestamps: true, collection: 'rol' }
);

module.exports = mongoose.model('Rol', rolSchema);
