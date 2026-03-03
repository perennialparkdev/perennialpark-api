/**
 * @fileoverview Controlador RSVP. Create, getById, update, list (por rango de fecha), delete (solo admin).
 * Valida que el owner exista y pertenezca a la unidad.
 */

const mongoose = require('mongoose');
const RsvpRegister = require('../models/rsvp-register.model');
const OwnerHusbandUser = require('../models/owner-husband-user.model');
const Unit = require('../models/unit.model');

const rsvpCtrl = {};

const STATUS_VALUES = ['Coming', 'Maybe', 'Not Coming'];

const POPULATE_OWNER = { path: 'idOwnerHusbandUser', select: 'husband_first husband_email last_name' };
const POPULATE_UNIT = { path: 'idUnit', select: 'unit_number' };

function trim(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function parseChecks(checks) {
  if (!Array.isArray(checks)) return [];
  return checks.map((item) => ({
    check: item && typeof item.check !== 'undefined' ? trim(item.check) : null,
  }));
}

rsvpCtrl.create = async (req, res) => {
  try {
    const body = req.body || {};
    const status = trim(body.status);
    const idOwnerHusbandUser = body.idOwnerHusbandUser;
    const idUnit = body.idUnit;

    if (!idOwnerHusbandUser || !mongoose.Types.ObjectId.isValid(idOwnerHusbandUser)) {
      return res.status(400).json({
        success: false,
        message: 'idOwnerHusbandUser is required and must be a valid ObjectId',
      });
    }
    if (!idUnit || !mongoose.Types.ObjectId.isValid(idUnit)) {
      return res.status(400).json({
        success: false,
        message: 'idUnit is required and must be a valid ObjectId',
      });
    }

    if (status && !STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${STATUS_VALUES.join(', ')}`,
      });
    }

    const howManyMen = body.howManyMen != null ? Math.max(0, parseInt(Number(body.howManyMen), 10) || 0) : 0;
    const guests = body.guests != null ? Math.max(0, parseInt(Number(body.guests), 10) || 0) : 0;

    const owner = await OwnerHusbandUser.findById(idOwnerHusbandUser).lean();
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found',
      });
    }

    const ownerUnitId = owner.unitId && owner.unitId.toString();
    const unitIdStr = new mongoose.Types.ObjectId(idUnit).toString();
    if (!ownerUnitId || ownerUnitId !== unitIdStr) {
      return res.status(400).json({
        success: false,
        message: 'Owner does not belong to this unit',
      });
    }

    const unit = await Unit.findById(idUnit).lean();
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    const doc = {
      status: status || null,
      date: body.date ? new Date(body.date) : null,
      howManyMen,
      guests,
      checks: parseChecks(body.checks),
      idOwnerHusbandUser: new mongoose.Types.ObjectId(idOwnerHusbandUser),
      idUnit: new mongoose.Types.ObjectId(idUnit),
    };

    const created = await RsvpRegister.create(doc);
    res.status(201).json({
      success: true,
      message: 'RSVP created successfully',
      data: created,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

rsvpCtrl.getById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid id',
      });
    }
    const doc = await RsvpRegister.findById(id)
      .populate(POPULATE_OWNER)
      .populate(POPULATE_UNIT)
      .lean();
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'RSVP not found',
      });
    }
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

rsvpCtrl.update = async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid id',
      });
    }
    const existing = await RsvpRegister.findById(id).lean();
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'RSVP not found',
      });
    }

    const update = {};
    if (body.status !== undefined) {
      const status = trim(body.status);
      if (status && !STATUS_VALUES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `status must be one of: ${STATUS_VALUES.join(', ')}`,
        });
      }
      update.status = status || null;
    }
    if (body.howManyMen !== undefined) {
      update.howManyMen = Math.max(0, parseInt(Number(body.howManyMen), 10) || 0);
    }
    if (body.guests !== undefined) {
      update.guests = Math.max(0, parseInt(Number(body.guests), 10) || 0);
    }
    if (body.checks !== undefined) {
      update.checks = parseChecks(body.checks);
    }
    if (body.date !== undefined) {
      update.date = body.date ? new Date(body.date) : null;
    }

    if (body.idOwnerHusbandUser !== undefined || body.idUnit !== undefined) {
      const idOwner = body.idOwnerHusbandUser !== undefined ? body.idOwnerHusbandUser : existing.idOwnerHusbandUser;
      const idUnit = body.idUnit !== undefined ? body.idUnit : existing.idUnit;
      if (!idOwner || !mongoose.Types.ObjectId.isValid(idOwner) || !idUnit || !mongoose.Types.ObjectId.isValid(idUnit)) {
        return res.status(400).json({
          success: false,
          message: 'idOwnerHusbandUser and idUnit must be valid ObjectIds',
        });
      }
      const owner = await OwnerHusbandUser.findById(idOwner).lean();
      if (!owner) {
        return res.status(404).json({ success: false, message: 'Owner not found' });
      }
      const ownerUnitId = owner.unitId && owner.unitId.toString();
      const unitIdStr = new mongoose.Types.ObjectId(idUnit).toString();
      if (!ownerUnitId || ownerUnitId !== unitIdStr) {
        return res.status(400).json({
          success: false,
          message: 'Owner does not belong to this unit',
        });
      }
      const unit = await Unit.findById(idUnit).lean();
      if (!unit) {
        return res.status(404).json({ success: false, message: 'Unit not found' });
      }
      update.idOwnerHusbandUser = new mongoose.Types.ObjectId(idOwner);
      update.idUnit = new mongoose.Types.ObjectId(idUnit);
    }

    const updated = await RsvpRegister.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate(POPULATE_OWNER)
      .populate(POPULATE_UNIT)
      .lean();
    res.status(200).json({
      success: true,
      message: 'RSVP updated successfully',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

rsvpCtrl.list = async (req, res) => {
  try {
    const from = req.query.from;
    const to = req.query.to;
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Query params "from" and "to" (date range) are required',
      });
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format for "from" or "to"',
      });
    }
    const filter = {
      createdAt: { $gte: fromDate, $lte: toDate },
    };
    const list = await RsvpRegister.find(filter)
      .populate(POPULATE_OWNER)
      .populate(POPULATE_UNIT)
      .sort({ createdAt: -1 })
      .lean();

    const comings = list.filter((r) => r.status === 'Coming');
    const maybes = list.filter((r) => r.status === 'Maybe');

    const totalHowManyMenComing = comings.reduce((sum, r) => sum + (Number(r.howManyMen) || 0), 0);
    const totalGuestsComing = comings.reduce((sum, r) => sum + (Number(r.guests) || 0), 0);
    const total = totalHowManyMenComing + totalGuestsComing;

    res.status(200).json({
      success: true,
      data: {
        comings,
        maybes,
        totalHowManyMenComing,
        totalGuestsComing,
        total,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

rsvpCtrl.remove = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid id',
      });
    }
    const deleted = await RsvpRegister.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'RSVP not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'RSVP deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = rsvpCtrl;
