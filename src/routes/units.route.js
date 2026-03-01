/**
 * @fileoverview Rutas CRUD de units. Solo owners con idRol administrador.
 * Middleware: verifyFirebaseToken + verifyOwnerAdmin.
 */

const express = require('express');
const router = express.Router();
const unitsController = require('../controllers/units.controller');
const { verifyFirebaseToken } = require('../middlewares/verify-firebase-token');
const { verifyOwnerAdmin } = require('../middlewares/verify-owner-admin');

const requireOwnerAdmin = [verifyFirebaseToken, verifyOwnerAdmin];

router.use(requireOwnerAdmin);

router.post('/', unitsController.create);
router.get('/', unitsController.list);
router.patch('/:id/unlink', unitsController.unlink);
router.patch('/:id/activate', unitsController.activate);
router.patch('/:id/anular', unitsController.anular);
router.post('/:id/owners/reset-password', unitsController.resetPassword);
router.post('/:id/owners/send-invitation', unitsController.sendInvitation);
router.get('/:id', unitsController.getById);
router.patch('/:id', unitsController.update);
router.delete('/:id', unitsController.remove);

module.exports = router;
