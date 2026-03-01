/**
 * @fileoverview Middleware que verifica que el usuario sea un owner (husband o wife) con idRol de administrador.
 * Debe usarse después de verifyFirebaseToken.
 */

const OwnerHusbandUser = require('../models/owner-husband-user.model');
const OwnerWifeUser = require('../models/owner-wife-user.model');

const ADMIN_ROL_ID = process.env.ADMIN_ROL_ID || '69a4797d16285f80b89cb60b';

const verifyOwnerAdmin = async (req, res, next) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Use verifyFirebaseToken before verifyOwnerAdmin.',
      });
    }

    const [husband, wife] = await Promise.all([
      OwnerHusbandUser.findOne({ firebase_uid: uid }),
      OwnerWifeUser.findOne({ firebase_uid: uid }),
    ]);
    const owner = husband || wife;
    if (!owner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be a registered owner.',
      });
    }

    const rolId = owner.idRol ? owner.idRol.toString() : null;
    if (rolId !== ADMIN_ROL_ID) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can perform this action.',
      });
    }

    req.owner = owner;
    next();
  } catch (error) {
    console.error('Error en verifyOwnerAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify permissions',
    });
  }
};

module.exports = { verifyOwnerAdmin, ADMIN_ROL_ID };
