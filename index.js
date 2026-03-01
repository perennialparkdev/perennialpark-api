/**
 * @fileoverview Entry point de la API.
 * Inicializa app y servidor HTTP.
 * @see .cursorrules - index.js: API entry point.
 */

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
