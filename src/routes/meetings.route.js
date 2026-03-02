/**
 * @fileoverview Rutas de meeting-structure y CRUD por modelKey.
 * GET /structure devuelve categorías con tipos, modelKey y campos.
 * CRUD bajo /:modelKey (list, create) y /:modelKey/:id (get, update, activate, anular).
 * Protegidas por verifyFirebaseToken + verifyOwnerAdmin.
 */

const express = require('express');
const router = express.Router();
const meetingStructureController = require('../controllers/meetingStructure.controller');
const meetingsController = require('../controllers/meetings.controller');
const { verifyFirebaseToken } = require('../middlewares/verify-firebase-token');
const { verifyOwnerAdmin } = require('../middlewares/verify-owner-admin');

const requireOwnerAdmin = [verifyFirebaseToken, verifyOwnerAdmin];

router.use(requireOwnerAdmin);

/** Estructura: categorías → tipos → modelKey + fields (debe ir antes de /:modelKey) */
router.get('/structure', meetingStructureController.getStructure);

/** CRUD por modelKey */
router.get('/:modelKey', meetingsController.list);
router.post('/:modelKey', meetingsController.create);
router.get('/:modelKey/:id', meetingsController.getById);
router.patch('/:modelKey/:id/activate', meetingsController.activate);
router.patch('/:modelKey/:id/anular', meetingsController.anular);
router.patch('/:modelKey/:id', meetingsController.update);

module.exports = router;
