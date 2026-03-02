/**
 * @fileoverview Devuelve la estructura de categorías y tipos con modelo y campos por tipo.
 * Sirve para que el frontend sepa qué modelo y campos usar al crear/listar meetings o announcements.
 */

const Category = require('../models/category.model');
const Type = require('../models/type.model');
const { getModelInfo } = require('../config/meetingModels.config');

const meetingStructureCtrl = {};

/**
 * GET /api/meetings/structure
 * Devuelve cada categoría con sus tipos; para cada tipo: _id, name, weekDay, modelKey y fields.
 */
meetingStructureCtrl.getStructure = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    const typeIdsByCategory = new Map(categories.map((c) => [c._id.toString(), []]));
    const allTypes = await Type.find({ idCategory: { $in: categories.map((c) => c._id) } }).lean();
    for (const t of allTypes) {
      const catId = t.idCategory && t.idCategory.toString();
      if (catId && typeIdsByCategory.has(catId)) {
        typeIdsByCategory.get(catId).push(t);
      }
    }

    const categoryNames = new Map(categories.map((c) => [c._id.toString(), c.name]));
    const data = categories.map((cat) => {
      const catIdStr = cat._id.toString();
      const types = (typeIdsByCategory.get(catIdStr) || []).map((t) => {
        const categoryName = categoryNames.get(catIdStr) || null;
        const info = getModelInfo(categoryName, t.name, t.weekDay);
        return {
          _id: t._id,
          name: t.name,
          weekDay: t.weekDay,
          modelKey: info ? info.modelKey : null,
          fields: info ? info.fields : [],
        };
      });
      return {
        _id: cat._id,
        name: cat.name,
        types,
      };
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = meetingStructureCtrl;
