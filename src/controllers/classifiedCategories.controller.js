/**
 * @fileoverview List classified categories (classified_categories).
 * Used so the frontend can load categories for classified posts. All responses in English.
 */

const ClassifiedCategory = require('../models/classified-category.model');

const classifiedCategoriesCtrl = {};

classifiedCategoriesCtrl.list = async (req, res) => {
  try {
    const list = await ClassifiedCategory.find().sort({ name: 1 }).lean();
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = classifiedCategoriesCtrl;
