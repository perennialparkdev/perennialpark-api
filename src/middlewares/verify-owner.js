/**
 * @fileoverview Middleware que verifica que el usuario autenticado sea un owner (husband o wife),
 * sin importar su rol. Debe usarse después de verifyFirebaseToken.
 */

const OwnerHusbandUser = require('../models/owner-husband-user.model');
const OwnerWifeUser = require('../models/owner-wife-user.model');

const verifyOwner = async (req, res, next) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Use verifyFirebaseToken before verifyOwner.',
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

    req.owner = owner;
    next();
  } catch (error) {
    console.error('Error en verifyOwner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify owner permissions',
    });
  }
};

module.exports = { verifyOwner };

