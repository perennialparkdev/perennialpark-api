/**
 * @fileoverview Configuración central de la API Express.
 * Middlewares, rutas y manejo global de errores.
 * @see .cursorrules - app.js: Main application configuration (middleware, routes mount).
 */

const express = require('express');
const cors = require('cors');

require('dotenv').config();

const { connectDB } = require('./database/database');
const { initFirebase, getAuth, getInitError } = require('./src/config/firebase');
const indexRoutes = require('./src/routes/index.route');
const ownersRoutes = require('./src/routes/owners.route');
const unitsRoutes = require('./src/routes/units.route');
const rolesRoutes = require('./src/routes/roles.route');
const meetingsRoutes = require('./src/routes/meetings.route');
const rsvpRoutes = require('./src/routes/rsvp.route');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  connectDB().catch((err) => {
    console.error('Error inicial al conectar a MongoDB:', err.message);
  });
  initFirebase();
}

app.use('/api', indexRoutes);
app.use('/api/owners', ownersRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/rsvps', rsvpRoutes);

/** Diagnóstico de Firebase (solo en desarrollo): GET /api/debug/firebase devuelve { ok, error? } */
if (process.env.NODE_ENV === 'development') {
  app.get('/api/debug/firebase', (req, res) => {
    const auth = getAuth();
    res.status(200).json({
      ok: !!auth,
      error: auth ? null : getInitError() || 'Firebase no inicializado',
      hint: auth ? null : 'Revisa GOOGLE_APPLICATION_CREDENTIALS en .env (ruta al JSON de cuenta de servicio).',
    });
  });
}

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'API PerennialPark is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'El cuerpo de la petición es demasiado grande.',
    });
  }
  console.error('Error no manejado:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

module.exports = app;
