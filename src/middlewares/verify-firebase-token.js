/**
 * @fileoverview Middleware que verifica el token de Firebase y adjunta el uid en req.user.
 * @see .cursorrules - Routes: verifyToken middleware
 */

const { getAuth } = require('../config/firebase');

/**
 * Verifica el ID token de Firebase y expone uid en req.user.uid.
 * Espera header: Authorization: Bearer <token>
 */
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticación requerido',
    });
  }

  const idToken = authHeader.split('Bearer ')[1];
  const auth = getAuth();

  if (!auth) {
    return res.status(503).json({
      success: false,
      message: 'Servicio de autenticación no disponible',
    });
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = { uid: decodedToken.uid, email: decodedToken.email };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
    });
  }
};

module.exports = { verifyFirebaseToken };
