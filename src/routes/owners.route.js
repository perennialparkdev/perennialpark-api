/**
 * @fileoverview Rutas de owners.
 * checkUnitAccess, signUp, login (devuelve token). completeProfile (protegida).
 * invitation/validate y invitation/complete (públicas para formulario secundario).
 * @see .cursorrules - Routes pattern
 */

const express = require('express');
const router = express.Router();
const ownersController = require('../controllers/owners.controller');
const { verifyFirebaseToken } = require('../middlewares/verify-firebase-token');

router.post('/check-unit', ownersController.checkUnitAccess);
router.post('/signup', ownersController.signUp);
router.post('/login', ownersController.login);

router.post('/complete-profile', verifyFirebaseToken, ownersController.completeProfile);

router.post('/invitation/validate', ownersController.validateInvitation);
router.post('/invitation/complete', ownersController.completeInvitation);

module.exports = router;
