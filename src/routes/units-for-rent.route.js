/**
 * @fileoverview Routes for UnitForRent CRUD.
 * POST /, GET /, GET /:id, PATCH /:id, DELETE /:id.
 * Require authenticated owner (any role): verifyFirebaseToken + verifyOwner.
 */

const express = require('express');
const router = express.Router();
const unitsForRentController = require('../controllers/unitsForRent.controller');
const { verifyFirebaseToken } = require('../middlewares/verify-firebase-token');
const { verifyOwner } = require('../middlewares/verify-owner');

const requireOwnerAnyRole = [verifyFirebaseToken, verifyOwner];

router.use(requireOwnerAnyRole);

router.post('/', unitsForRentController.create);
router.get('/', unitsForRentController.list);
router.get('/:id', unitsForRentController.getById);
router.patch('/:id', unitsForRentController.update);
router.delete('/:id', unitsForRentController.remove);

module.exports = router;
