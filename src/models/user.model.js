/**
 * @fileoverview Modelo de Usuario.
 * Keys: firebase_uid, name, last_name, email, idRol, company_position.
 * Almacena datos de negocio; la autenticación se gestiona con Firebase Auth.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firebase_uid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, default: null },
    last_name: { type: String, default: null },
    email: { type: String, default: null },
    idRol: { type: mongoose.Schema.Types.ObjectId, ref: 'Rol', default: null },
    company_position: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.methods.isProfileComplete = function () {
  return !!(this.name && this.last_name && this.email);
};

module.exports = mongoose.model('User', userSchema);
