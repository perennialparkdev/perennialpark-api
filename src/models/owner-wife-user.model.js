/**
 * @fileoverview Modelo OwnerWifeUser (titular esposa).
 * Keys movidas desde Unit: wife_first, wife_email, wife_phone + compartidas last_name, username, password.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

/** status: -1 = pending, 0 = anulado, 1 = activo */
const ownerWifeUserSchema = new mongoose.Schema(
  {
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
    idRol: { type: mongoose.Schema.Types.ObjectId, ref: 'Rol', default: null },
    firebase_uid: { type: String, default: null },
    status: { type: Number, default: -1 },
    wife_first: { type: String, default: null },
    wife_email: { type: String, default: null },
    wife_phone: { type: String, default: null },
    last_name: { type: String, default: null },
    password: { type: String, default: null },
    invitationToken: { type: String, default: null },
    resetToken: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OwnerWifeUser', ownerWifeUserSchema);
