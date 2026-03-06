/**
 * @fileoverview Rutas de meeting-structure y CRUD por modelKey.
 * GET /structure devuelve categorías con tipos, modelKey y campos.
 * CRUD bajo /:modelKey (list, create) y /:modelKey/:id (get, update, activate, anular).
 * DELETE /period/:period elimina todos los registros de esa semana.
 * Protegidas por verifyFirebaseToken + verifyOwnerAdminOrGabaim (admin o gabaim).
 */

const express = require('express');
const router = express.Router();
const meetingStructureController = require('../controllers/meetingStructure.controller');
const meetingsController = require('../controllers/meetings.controller');
const { verifyFirebaseToken } = require('../middlewares/verify-firebase-token');
const { verifyOwnerAdminOrGabaim } = require('../middlewares/verify-owner-admin-or-gabaim');

const requireAdminOrGabaim = [verifyFirebaseToken, verifyOwnerAdminOrGabaim];

router.use(requireAdminOrGabaim);

/** Estructura: categorías → tipos → modelKey + fields (debe ir antes de /:modelKey) */
router.get('/structure', meetingStructureController.getStructure);

/** Eliminar todos los registros de una semana por period (debe ir antes de /:modelKey) */
router.delete('/period/:period', meetingsController.deleteByPeriod);

/** CRUD por modelKey */
router.get('/:modelKey', meetingsController.list);
router.post('/:modelKey', meetingsController.create);
router.get('/:modelKey/:id', meetingsController.getById);
router.patch('/:modelKey/:id/activate', meetingsController.activate);
router.patch('/:modelKey/:id/anular', meetingsController.anular);
router.patch('/:modelKey/:id', meetingsController.update);

module.exports = router;
