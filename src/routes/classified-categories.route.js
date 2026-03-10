/**
 * @fileoverview Routes for ClassifiedCategory.
 * GET / — list all categories. Require authenticated owner (any role).
 */

const express = require('express');
const router = express.Router();
const classifiedCategoriesController = require('../controllers/classifiedCategories.controller');
const { verifyFirebaseToken } = require('../middlewares/verify-firebase-token');
const { verifyOwner } = require('../middlewares/verify-owner');

const requireOwnerAnyRole = [verifyFirebaseToken, verifyOwner];

router.get('/', requireOwnerAnyRole, classifiedCategoriesController.list);

module.exports = router;
