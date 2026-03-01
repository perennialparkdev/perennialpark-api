/**
 * @fileoverview Modelo OwnerHusbandUser (titular marido).
 * Keys movidas desde Unit: husband_first, husband_email, husband_phone + compartidas last_name, username, password.
 * @see .cursorrules - models/: Mongoose schemas
 */

const mongoose = require('mongoose');

/** status: -1 = pending, 0 = anulado, 1 = activo */
const ownerHusbandUserSchema = new mongoose.Schema(
  {
    unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
    firebase_uid: { type: String, default: null },
    status: { type: Number, default: -1 },
    husband_first: { type: String, default: null },
    husband_email: { type: String, default: null },
    husband_phone: { type: String, default: null },
    last_name: { type: String, default: null },
    password: { type: String, default: null },
    invitationToken: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OwnerHusbandUser', ownerHusbandUserSchema);
