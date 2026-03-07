/**
 * @fileoverview CRUD for ClassifiedPost (classified_posts).
 * Create, list, getById, update, remove. All responses in English.
 */

const mongoose = require('mongoose');
const ClassifiedPost = require('../models/classified-post.model');
const ClassifiedCategory = require('../models/classified-category.model');

const classifiedPostsCtrl = {};

function trim(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function buildPostFromBody(body) {
  const out = {};
  if (body.title !== undefined) out.title = trim(body.title);
  if (body.description !== undefined) out.description = trim(body.description);
  if (body.contact_info !== undefined) out.contact_info = trim(body.contact_info);
  if (body.price !== undefined) out.price = body.price === '' || body.price === null ? null : Number(body.price);
  if (body.visible_to_other_colonies !== undefined) out.visible_to_other_colonies = Boolean(body.visible_to_other_colonies);
  if (body.category !== undefined) {
    out.category = body.category && mongoose.Types.ObjectId.isValid(body.category) ? new mongoose.Types.ObjectId(body.category) : null;
  }
  return out;
}

const POPULATE_CATEGORY = { path: 'category', select: 'name' };
const POPULATE_CREATOR_HUSBAND = {
  path: 'createdByIdOwnerHusbandUser',
  select: 'husband_first last_name husband_email unitId',
  populate: { path: 'unitId', select: 'unit_number' },
};
const POPULATE_CREATOR_WIFE = {
  path: 'createdByIdOwnerWifeUser',
  select: 'wife_first last_name wife_email unitId',
  populate: { path: 'unitId', select: 'unit_number' },
};

/** Build unified creator from populated doc (husband or wife), including unit_number. */
function buildCreator(doc) {
  const husband = doc.createdByIdOwnerHusbandUser;
  const wife = doc.createdByIdOwnerWifeUser;
  const getUnitNumber = (owner) => {
    const unit = owner && owner.unitId;
    return unit && typeof unit === 'object' ? unit.unit_number : null;
  };
  if (husband && typeof husband === 'object') {
    return {
      type: 'husband',
      id: husband._id,
      first: husband.husband_first,
      last_name: husband.last_name,
      email: husband.husband_email,
      unit_number: getUnitNumber(husband),
    };
  }
  if (wife && typeof wife === 'object') {
    return {
      type: 'wife',
      id: wife._id,
      first: wife.wife_first,
      last_name: wife.last_name,
      email: wife.wife_email,
      unit_number: getUnitNumber(wife),
    };
  }
  return null;
}

/** Add creator to doc and optionally strip raw refs from response. */
function withCreator(doc) {
  const out = { ...doc };
  out.creator = buildCreator(doc);
  return out;
}

classifiedPostsCtrl.create = async (req, res) => {
  try {
    const body = req.body || {};
    const title = trim(body.title);
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'title is required',
      });
    }

    if (body.category && mongoose.Types.ObjectId.isValid(body.category)) {
      const cat = await ClassifiedCategory.findById(body.category).lean();
      if (!cat) {
        return res.status(400).json({
          success: false,
          message: 'category not found',
        });
      }
    }

    const doc = buildPostFromBody(body);
    doc.title = title;
    if (req.owner && req.owner._id) {
      if (req.owner.husband_email !== undefined) {
        doc.createdByIdOwnerHusbandUser = req.owner._id;
      } else {
        doc.createdByIdOwnerWifeUser = req.owner._id;
      }
    }

    const created = await ClassifiedPost.create(doc);
    const populated = await ClassifiedPost.findById(created._id)
      .populate(POPULATE_CATEGORY)
      .populate(POPULATE_CREATOR_HUSBAND)
      .populate(POPULATE_CREATOR_WIFE)
      .lean();
    res.status(201).json({
      success: true,
      message: 'Classified post created successfully',
      data: withCreator(populated),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

classifiedPostsCtrl.list = async (req, res) => {
  try {
    const filter = {};
    const categoryId = req.query.category;
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.category = categoryId;
    }
    if (req.query.visible_to_other_colonies !== undefined) {
      filter.visible_to_other_colonies = req.query.visible_to_other_colonies === 'true' || req.query.visible_to_other_colonies === true;
    }

    const list = await ClassifiedPost.find(filter)
      .populate(POPULATE_CATEGORY)
      .populate(POPULATE_CREATOR_HUSBAND)
      .populate(POPULATE_CREATOR_WIFE)
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: list.map(withCreator) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

classifiedPostsCtrl.getById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid id',
      });
    }
    const doc = await ClassifiedPost.findById(id)
      .populate(POPULATE_CATEGORY)
      .populate(POPULATE_CREATOR_HUSBAND)
      .populate(POPULATE_CREATOR_WIFE)
      .lean();
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Classified post not found',
      });
    }
    res.status(200).json({ success: true, data: withCreator(doc) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

classifiedPostsCtrl.update = async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid id',
      });
    }

    if (body.category !== undefined && body.category && mongoose.Types.ObjectId.isValid(body.category)) {
      const cat = await ClassifiedCategory.findById(body.category).lean();
      if (!cat) {
        return res.status(400).json({
          success: false,
          message: 'category not found',
        });
      }
    }

    const update = buildPostFromBody(body);
    const updated = await ClassifiedPost.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate(POPULATE_CATEGORY)
      .populate(POPULATE_CREATOR_HUSBAND)
      .populate(POPULATE_CREATOR_WIFE)
      .lean();
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Classified post not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Classified post updated',
      data: withCreator(updated),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

classifiedPostsCtrl.remove = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid id',
      });
    }
    const deleted = await ClassifiedPost.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Classified post not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Classified post deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = classifiedPostsCtrl;
