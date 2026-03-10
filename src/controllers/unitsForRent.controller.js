/**
 * @fileoverview CRUD for UnitForRent (units_for_rent).
 * Create, list, getById, update, remove. Owner info (name, email, phone) and linked unit in response.
 */

const mongoose = require('mongoose');
const UnitForRent = require('../models/unit-for-rent.model');

const unitsForRentCtrl = {};

function trim(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function parseDate(val) {
  if (val == null || val === '') return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildDocFromBody(body) {
  const out = {};
  if (body.startDate !== undefined) out.startDate = parseDate(body.startDate);
  if (body.endDate !== undefined) out.endDate = parseDate(body.endDate);
  if (body.notes !== undefined) out.notes = trim(body.notes);
  if (body.only_my_colony !== undefined) out.only_my_colony = Boolean(body.only_my_colony);
  return out;
}

const POPULATE_OWNER_HUSBAND = {
  path: 'createdByIdOwnerHusbandUser',
  select: 'husband_first last_name husband_email husband_phone unitId',
  populate: { path: 'unitId', select: 'unit_number' },
};
const POPULATE_OWNER_WIFE = {
  path: 'createdByIdOwnerWifeUser',
  select: 'wife_first last_name wife_email wife_phone unitId',
  populate: { path: 'unitId', select: 'unit_number' },
};

/** Build unified owner from populated doc (husband or wife): name, email, phone, unit. */
function buildOwner(doc) {
  const husband = doc.createdByIdOwnerHusbandUser;
  const wife = doc.createdByIdOwnerWifeUser;
  const getUnit = (owner) => {
    const unit = owner && owner.unitId;
    if (!unit || typeof unit !== 'object') return null;
    return { unit_number: unit.unit_number ?? null };
  };
  if (husband && typeof husband === 'object') {
    const first = husband.husband_first ?? '';
    const last = husband.last_name ?? '';
    return {
      type: 'husband',
      id: husband._id,
      name: [first, last].filter(Boolean).join(' ').trim() || null,
      email: husband.husband_email ?? null,
      phone: husband.husband_phone ?? null,
      unit: getUnit(husband),
    };
  }
  if (wife && typeof wife === 'object') {
    const first = wife.wife_first ?? '';
    const last = wife.last_name ?? '';
    return {
      type: 'wife',
      id: wife._id,
      name: [first, last].filter(Boolean).join(' ').trim() || null,
      email: wife.wife_email ?? null,
      phone: wife.wife_phone ?? null,
      unit: getUnit(wife),
    };
  }
  return null;
}

function withOwner(doc) {
  const out = { ...doc };
  out.owner = buildOwner(doc);
  return out;
}

unitsForRentCtrl.create = async (req, res) => {
  try {
    const body = req.body || {};
    const doc = buildDocFromBody(body);
    if (req.owner && req.owner._id) {
      if (req.owner.husband_email !== undefined) {
        doc.createdByIdOwnerHusbandUser = req.owner._id;
      } else {
        doc.createdByIdOwnerWifeUser = req.owner._id;
      }
    }

    const created = await UnitForRent.create(doc);
    const populated = await UnitForRent.findById(created._id)
      .populate(POPULATE_OWNER_HUSBAND)
      .populate(POPULATE_OWNER_WIFE)
      .lean();
    res.status(201).json({
      success: true,
      message: 'Unit for rent created successfully',
      data: withOwner(populated),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

unitsForRentCtrl.list = async (req, res) => {
  try {
    const filter = {};
    if (req.query.only_my_colony !== undefined) {
      filter.only_my_colony = req.query.only_my_colony === 'true' || req.query.only_my_colony === true;
    }

    const list = await UnitForRent.find(filter)
      .populate(POPULATE_OWNER_HUSBAND)
      .populate(POPULATE_OWNER_WIFE)
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: list.map(withOwner) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

unitsForRentCtrl.getById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid id',
      });
    }
    const doc = await UnitForRent.findById(id)
      .populate(POPULATE_OWNER_HUSBAND)
      .populate(POPULATE_OWNER_WIFE)
      .lean();
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Unit for rent not found',
      });
    }
    res.status(200).json({ success: true, data: withOwner(doc) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

unitsForRentCtrl.update = async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid id',
      });
    }

    const update = buildDocFromBody(body);
    const updated = await UnitForRent.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate(POPULATE_OWNER_HUSBAND)
      .populate(POPULATE_OWNER_WIFE)
      .lean();
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Unit for rent not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Unit for rent updated',
      data: withOwner(updated),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

unitsForRentCtrl.remove = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid id',
      });
    }
    const deleted = await UnitForRent.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Unit for rent not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Unit for rent deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = unitsForRentCtrl;
