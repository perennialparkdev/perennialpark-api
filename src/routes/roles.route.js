/**
 * @fileoverview Routes for Roles CRUD. Only owners with admin idRol.
 * Middleware: verifyFirebaseToken + verifyOwnerAdmin.
 */

const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/roles.controller');
const { verifyFirebaseToken } = require('../middlewares/verify-firebase-token');
const { verifyOwnerAdmin } = require('../middlewares/verify-owner-admin');

const requireOwnerAdmin = [verifyFirebaseToken, verifyOwnerAdmin];

router.use(requireOwnerAdmin);

router.post('/', rolesController.create);
router.get('/', rolesController.list);
router.patch('/:id/activate', rolesController.activate);
router.patch('/:id/anular', rolesController.anular);
router.get('/:id', rolesController.getById);
router.patch('/:id', rolesController.update);

module.exports = router;
