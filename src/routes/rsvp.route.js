/**
 * @fileoverview Rutas del módulo RSVP (registros de citas).
 * Create, list (GET con from/to), getById, update. Delete solo para admin.
 */

const express = require('express');
const router = express.Router();
const rsvpController = require('../controllers/rsvp.controller');
const { verifyFirebaseToken } = require('../middlewares/verify-firebase-token');
const { verifyOwnerAdmin } = require('../middlewares/verify-owner-admin');

const requireOwnerAdmin = [verifyFirebaseToken, verifyOwnerAdmin];

router.post('/', rsvpController.create);
router.get('/', rsvpController.list);
router.get('/unit/:unitId', rsvpController.listByUnit);
router.get('/:id', rsvpController.getById);
router.patch('/:id', rsvpController.update);
router.delete('/:id', requireOwnerAdmin, rsvpController.remove);

module.exports = router;
