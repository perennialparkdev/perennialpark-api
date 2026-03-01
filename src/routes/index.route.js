/**
 * @fileoverview Rutas base de la API (solo index para prueba de levantamiento).
 * @see .cursorrules - routes/: index.route.js
 */

const express = require('express');
const { getIndex } = require('../controllers/index.controller');

const router = express.Router();

router.get('/', getIndex);

module.exports = router;
