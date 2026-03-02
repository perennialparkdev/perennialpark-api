/**
 * @fileoverview Rutas CRUD de units.
 * - Cualquier owner autenticado (cualquier rol) puede listar unidades, ver detalle y actualizar información.
 * - Solo owners con rol admin pueden crear/eliminar units y gestionar invitaciones/reset de password.
 * Middleware:
 *   - verifyFirebaseToken + verifyOwner       → acceso de owner (cualquier rol)
 *   - verifyFirebaseToken + verifyOwnerAdmin → acceso solo admin
 */

const express = require('express');
const router = express.Router();
const unitsController = require('../controllers/units.controller');
const { verifyFirebaseToken } = require('../middlewares/verify-firebase-token');
const { verifyOwnerAdmin } = require('../middlewares/verify-owner-admin');
const { verifyOwner } = require('../middlewares/verify-owner');

const requireOwnerAdmin = [verifyFirebaseToken, verifyOwnerAdmin];
const requireOwnerAnyRole = [verifyFirebaseToken, verifyOwner];

// Solo admin: crear/eliminar units, unlink, activar/anular, gestionar owners
router.post('/', requireOwnerAdmin, unitsController.create);
router.patch('/:id/unlink', requireOwnerAdmin, unitsController.unlink);
router.patch('/:id/activate', requireOwnerAdmin, unitsController.activate);
router.patch('/:id/anular', requireOwnerAdmin, unitsController.anular);
router.post('/:id/owners/reset-password', requireOwnerAdmin, unitsController.resetPassword);
router.post('/:id/owners/send-invitation', requireOwnerAdmin, unitsController.sendInvitation);
router.delete('/:id', requireOwnerAdmin, unitsController.remove);

// Cualquier owner (cualquier rol): listar units, ver detalle y actualizar información
router.get('/', requireOwnerAnyRole, unitsController.list);
router.get('/:id', requireOwnerAnyRole, unitsController.getById);
router.patch('/:id', requireOwnerAnyRole, unitsController.update);

module.exports = router;
