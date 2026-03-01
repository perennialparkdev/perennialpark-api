/**
 * @fileoverview Middleware que verifica que el usuario tenga un rol autorizado.
 * Debe usarse después de verifyFirebaseToken.
 * Soporta 4 roles en principio; allowedRoleIds puede ser string o array de IDs.
 * @see .cursorrules - Routes: verifyRole middleware
 */

const User = require('../models/user.model');

/** ID del rol Administrador (puede sobreescribirse con ADMIN_ROL_ID en .env) */
const ADMIN_ROL_ID = process.env.ADMIN_ROL_ID || '';

/**
 * Verifica que el usuario autenticado tenga uno de los roles indicados.
 * @param {string|string[]} allowedRoleIds - ID(s) de rol permitido(s), ej. un ID o ['id1','id2','id3','id4']
 */
const verifyRole = (allowedRoleIds) => {
  const ids = Array.isArray(allowedRoleIds) ? allowedRoleIds : [allowedRoleIds];

  return async (req, res, next) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({
          success: false,
          message: 'No autenticado. Use verifyFirebaseToken antes de verifyRole.',
        });
      }

      const user = await User.findOne({ firebase_uid: uid });
      if (!user || !user.isProfileComplete()) {
        return res.status(403).json({
          success: false,
          message: 'Perfil incompleto o usuario no encontrado',
        });
      }

      const userRolId = user.idRol?.toString();
      const hasRole = ids.some((id) => userRolId === id.toString());

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'No tiene permiso para acceder a este recurso',
        });
      }

      req.user.idRol = user.idRol;
      next();
    } catch (error) {
      console.error('Error en verifyRole:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar permisos',
      });
    }
  };
};

module.exports = { verifyRole, ADMIN_ROL_ID };
