/**
 * @fileoverview Controlador de rutas base /api (health, ping, etc.).
 * @see .cursorrules - controllers/: index para prueba de levantamiento.
 */

/**
 * Respuesta de prueba para verificar que la API responde.
 */
const getIndex = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API PerennialPark - index OK',
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  getIndex,
};
