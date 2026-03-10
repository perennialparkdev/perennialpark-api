/**
 * @fileoverview Routes for ClassifiedPost CRUD.
 * POST /, GET /, GET /:id, PATCH /:id, DELETE /:id.
 * Require authenticated owner (any role): verifyFirebaseToken + verifyOwner.
 */

const express = require('express');
const router = express.Router();
const classifiedPostsController = require('../controllers/classifiedPosts.controller');
const { verifyFirebaseToken } = require('../middlewares/verify-firebase-token');
const { verifyOwner } = require('../middlewares/verify-owner');

const requireOwnerAnyRole = [verifyFirebaseToken, verifyOwner];

router.use(requireOwnerAnyRole);

router.post('/', classifiedPostsController.create);
router.get('/', classifiedPostsController.list);
router.get('/:id', classifiedPostsController.getById);
router.patch('/:id', classifiedPostsController.update);
router.delete('/:id', classifiedPostsController.remove);

module.exports = router;
