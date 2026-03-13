/**
 * @fileoverview Verifica que el usuario sea un owner (husband o wife) con rol admin, gabaim o board member.
 * Usado en rutas de meetings (Manage Davening Times). Debe usarse después de verifyFirebaseToken.
 */

const OwnerHusbandUser = require('../models/owner-husband-user.model');
const OwnerWifeUser = require('../models/owner-wife-user.model');

const ADMIN_ROL_ID = process.env.ADMIN_ROL_ID || '69a4797d16285f80b89cb60b';
const GABAIM_ROL_ID = process.env.GABAIM_ROL_ID || '69a4fe4c1c49fa661fecae13';
const BOARD_MEMBER_ROL_ID = process.env.BOARD_MEMBER_ROL_ID || '69a4fe711c49fa661fecae14';
const ALLOWED_ROL_IDS = [ADMIN_ROL_ID, GABAIM_ROL_ID, ...(BOARD_MEMBER_ROL_ID ? [BOARD_MEMBER_ROL_ID] : [])];

const verifyOwnerAdminOrGabaim = async (req, res, next) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Use verifyFirebaseToken before verifyOwnerAdminOrGabaim.',
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
    const allowed = ALLOWED_ROL_IDS.some((id) => rolId === id);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators, gabaim or board members can perform this action.',
      });
    }

    req.owner = owner;
    next();
  } catch (error) {
    console.error('Error en verifyOwnerAdminOrGabaim:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify permissions',
    });
  }
};

module.exports = { verifyOwnerAdminOrGabaim, ADMIN_ROL_ID, GABAIM_ROL_ID, BOARD_MEMBER_ROL_ID };
