/**
 * @fileoverview CRUD de Units. Solo accesible por owners con idRol administrador.
 * Incluye unlink, reset-password y send-invitation para admin.
 */

const Unit = require('../models/unit.model');
const PreliminarOwner = require('../models/preliminar-owner.model');
const OwnerHusbandUser = require('../models/owner-husband-user.model');
const OwnerWifeUser = require('../models/owner-wife-user.model');
const Children = require('../models/children.model');
const { getAuth } = require('../config/firebase');
const { sendOwnerInvitationEmail } = require('../services/mail.service');

const unitsCtrl = {};

const OWNER_STATUS = { PENDING: -1, ANULADO: 0, ACTIVO: 1 };

const STATUS = { ACTIVO: 1, INACTIVO: 2 };

function trim(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function buildUnitFromBody(body) {
  return {
    unit_number: trim(body.unit_number),
    address: trim(body.address),
    city: trim(body.city),
    state: trim(body.state),
    zip: trim(body.zip),
    colony_name: trim(body.colony_name),
    notes: trim(body.notes),
    status: body.status != null ? Number(body.status) : STATUS.ACTIVO,
  };
}

/** Builds unit update object with only defined fields (for PATCH-style update). */
function buildUnitUpdateFromBody(body) {
  const data = body.unit || body;
  const out = {};
  if (data.unit_number !== undefined) out.unit_number = trim(data.unit_number);
  if (data.address !== undefined) out.address = trim(data.address);
  if (data.city !== undefined) out.city = trim(data.city);
  if (data.state !== undefined) out.state = trim(data.state);
  if (data.zip !== undefined) out.zip = trim(data.zip);
  if (data.colony_name !== undefined) out.colony_name = trim(data.colony_name);
  if (data.notes !== undefined) out.notes = trim(data.notes);
  if (data.status !== undefined) out.status = data.status != null ? Number(data.status) : STATUS.ACTIVO;
  return out;
}

/** Builds owner (husband/wife) update object with only defined fields. */
function buildOwnerUpdateFromBody(data, emailField, firstField, phoneField) {
  if (!data || typeof data !== 'object') return null;
  const out = {};
  if (data[firstField] !== undefined) out[firstField] = trim(data[firstField]);
  if (data.last_name !== undefined) out.last_name = trim(data.last_name);
  if (data[emailField] !== undefined) out[emailField] = trim(data[emailField]);
  if (data[phoneField] !== undefined) out[phoneField] = trim(data[phoneField]);
  if (data.password !== undefined) out.password = data.password ? trim(data.password) : null;
  if (data.status !== undefined) out.status = data.status != null ? Number(data.status) : OWNER_STATUS.PENDING;
  return Object.keys(out).length ? out : null;
}

unitsCtrl.create = async (req, res) => {
  try {
    const body = req.body || {};
    const unitData = body.unit || body;
    const preliminar = body.preliminar_owner || {};

    const unitNumber = trim(unitData.unit_number);
    if (!unitNumber) {
      return res.status(400).json({
        success: false,
        message: 'unit_number is required',
      });
    }

    const existing = await Unit.findOne({ unit_number: unitNumber });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A unit with this unit_number already exists',
      });
    }

    const unit = await Unit.create(buildUnitFromBody(unitData));
    await PreliminarOwner.create({
      unitId: unit._id,
      husband_phone: trim(preliminar.husband_phone),
      last_name: trim(preliminar.last_name),
    });

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: unit,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List units with linked owner data (husband/wife by unitId) and children.
 * Priority: husband; if no husband, wife. If no owners, check PreliminarOwner and set message.
 */
unitsCtrl.list = async (req, res) => {
  try {
    const status = req.query.status != null ? Number(req.query.status) : null;
    const filter = status != null ? { status } : {};
    const units = await Unit.find(filter).sort({ createdAt: -1 }).lean();
    const unitIds = units.map((u) => u._id);

    const [husbands, wives, preliminars, childrenList] = await Promise.all([
      OwnerHusbandUser.find({ unitId: { $in: unitIds } }).lean(),
      OwnerWifeUser.find({ unitId: { $in: unitIds } }).lean(),
      PreliminarOwner.find({ unitId: { $in: unitIds } }).lean(),
      Children.find({ unitId: { $in: unitIds } }).lean(),
    ]);

    const husbandByUnit = new Map(husbands.map((h) => [h.unitId.toString(), h]));
    const wifeByUnit = new Map(wives.map((w) => [w.unitId.toString(), w]));
    const preliminarByUnit = new Map(preliminars.map((p) => [p.unitId.toString(), p]));
    const childrenByUnit = new Map();
    for (const c of childrenList) {
      const id = c.unitId?.toString();
      if (id) {
        if (!childrenByUnit.has(id)) childrenByUnit.set(id, []);
        childrenByUnit.get(id).push({
          name: c.name,
          age: c.age,
          genre: c.genre,
        });
      }
    }

    const data = units.map((unit) => {
      const unitIdStr = unit._id.toString();
      const husband = husbandByUnit.get(unitIdStr) || null;
      const wife = wifeByUnit.get(unitIdStr) || null;
      const preliminarOwner = preliminarByUnit.get(unitIdStr) || null;
      const children = childrenByUnit.get(unitIdStr) || [];

      const item = { unit };

      if (husband || wife) {
        item.husband = husband
          ? {
              husband_first: husband.husband_first,
              last_name: husband.last_name,
              husband_email: husband.husband_email,
              husband_phone: husband.husband_phone,
              password: husband.password,
              status: husband.status,
            }
          : null;
        item.wife = wife
          ? {
              wife_first: wife.wife_first,
              last_name: wife.last_name,
              wife_email: wife.wife_email,
              wife_phone: wife.wife_phone,
              password: wife.password,
              status: wife.status,
            }
          : null;
        item.message = null;
        item.preliminarOwner = null;
      } else {
        item.husband = null;
        item.wife = null;
        item.preliminarOwner = preliminarOwner
          ? {
              husband_phone: preliminarOwner.husband_phone,
              last_name: preliminarOwner.last_name,
            }
          : null;
        item.message = preliminarOwner
          ? 'Unit without owners.'
          : 'No owners, invitees or registered for this unit.';
      }

      item.children = children;
      return item;
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

unitsCtrl.getById = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id).lean();
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }
    const unitId = unit._id;

    const [husband, wife, preliminarOwner, childrenList] = await Promise.all([
      OwnerHusbandUser.findOne({ unitId }).lean(),
      OwnerWifeUser.findOne({ unitId }).lean(),
      PreliminarOwner.findOne({ unitId }).lean(),
      Children.find({ unitId }).lean(),
    ]);

    const children = (childrenList || []).map((c) => ({
      name: c.name,
      age: c.age,
      genre: c.genre,
    }));

    const item = { unit };

    if (husband || wife) {
      item.husband = husband
        ? {
            husband_first: husband.husband_first,
            last_name: husband.last_name,
            husband_email: husband.husband_email,
            husband_phone: husband.husband_phone,
            password: husband.password,
            status: husband.status,
          }
        : null;
      item.wife = wife
        ? {
            wife_first: wife.wife_first,
            last_name: wife.last_name,
            wife_email: wife.wife_email,
            wife_phone: wife.wife_phone,
            password: wife.password,
            status: wife.status,
          }
        : null;
      item.message = null;
      item.preliminarOwner = null;
    } else {
      item.husband = null;
      item.wife = null;
      item.preliminarOwner = preliminarOwner
        ? {
            husband_phone: preliminarOwner.husband_phone,
            last_name: preliminarOwner.last_name,
          }
        : null;
      item.message = preliminarOwner
        ? 'Unit without owners.'
        : 'No owners, invitees or registered for this unit.';
    }

    item.children = children;

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

unitsCtrl.update = async (req, res) => {
  try {
    const unitId = req.params.id;
    const body = req.body || {};

    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    const unitUpdate = buildUnitUpdateFromBody(body);
    if (unitUpdate.unit_number !== undefined && unitUpdate.unit_number !== unit.unit_number) {
      const existing = await Unit.findOne({ unit_number: unitUpdate.unit_number, _id: { $ne: unitId } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A unit with this unit_number already exists',
        });
      }
    }

    if (Object.keys(unitUpdate).length > 0) {
      await Unit.findByIdAndUpdate(unitId, { $set: unitUpdate });
    }

    const husbandUpdate = buildOwnerUpdateFromBody(body.husband, 'husband_email', 'husband_first', 'husband_phone');
    if (husbandUpdate) {
      await OwnerHusbandUser.findOneAndUpdate(
        { unitId },
        { $set: { ...husbandUpdate, unitId } },
        { new: true, upsert: true }
      );
    }

    const wifeUpdate = buildOwnerUpdateFromBody(body.wife, 'wife_email', 'wife_first', 'wife_phone');
    if (wifeUpdate) {
      await OwnerWifeUser.findOneAndUpdate(
        { unitId },
        { $set: { ...wifeUpdate, unitId } },
        { new: true, upsert: true }
      );
    }

    if (Array.isArray(body.children)) {
      await Children.deleteMany({ unitId });
      if (body.children.length > 0) {
        await Children.insertMany(
          body.children.map((c) => ({
            unitId,
            name: trim(c.name),
            age: c.age != null ? Number(c.age) : null,
            genre: trim(c.genre),
          }))
        );
      }
    }

    const updatedUnit = await Unit.findById(unitId).lean();
    const [husband, wife, preliminarOwner, childrenList] = await Promise.all([
      OwnerHusbandUser.findOne({ unitId }).lean(),
      OwnerWifeUser.findOne({ unitId }).lean(),
      PreliminarOwner.findOne({ unitId }).lean(),
      Children.find({ unitId }).lean(),
    ]);

    const children = (childrenList || []).map((c) => ({ name: c.name, age: c.age, genre: c.genre }));

    const item = { unit: updatedUnit };
    if (husband || wife) {
      item.husband = husband
        ? {
            husband_first: husband.husband_first,
            last_name: husband.last_name,
            husband_email: husband.husband_email,
            husband_phone: husband.husband_phone,
            password: husband.password,
            status: husband.status,
          }
        : null;
      item.wife = wife
        ? {
            wife_first: wife.wife_first,
            last_name: wife.last_name,
            wife_email: wife.wife_email,
            wife_phone: wife.wife_phone,
            password: wife.password,
            status: wife.status,
          }
        : null;
      item.message = null;
      item.preliminarOwner = null;
    } else {
      item.husband = null;
      item.wife = null;
      item.preliminarOwner = preliminarOwner
        ? { husband_phone: preliminarOwner.husband_phone, last_name: preliminarOwner.last_name }
        : null;
      item.message = preliminarOwner ? 'Unit without owners.' : 'No owners, invitees or registered for this unit.';
    }
    item.children = children;

    res.status(200).json({
      success: true,
      message: 'Unit updated',
      data: item,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

unitsCtrl.remove = async (req, res) => {
  try {
    const unitId = req.params.id;
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    await Promise.all([
      OwnerHusbandUser.deleteMany({ unitId }),
      OwnerWifeUser.deleteMany({ unitId }),
      Children.deleteMany({ unitId }),
      PreliminarOwner.deleteMany({ unitId }),
    ]);
    await Unit.findByIdAndDelete(unitId);

    res.status(200).json({
      success: true,
      message: 'Unit and associated data deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

unitsCtrl.activate = async (req, res) => {
  try {
    const unit = await Unit.findByIdAndUpdate(
      req.params.id,
      { $set: { status: STATUS.ACTIVO } },
      { new: true }
    );
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Unit activated',
      data: unit,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

unitsCtrl.anular = async (req, res) => {
  try {
    const unit = await Unit.findByIdAndUpdate(
      req.params.id,
      { $set: { status: STATUS.INACTIVO } },
      { new: true }
    );
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Unit deactivated',
      data: unit,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Unlink: elimina owners, children y preliminar owners de la unidad. La Unit queda intacta (huérfana).
 */
unitsCtrl.unlink = async (req, res) => {
  try {
    const unitId = req.params.id;
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }
    await Promise.all([
      OwnerHusbandUser.deleteMany({ unitId }),
      OwnerWifeUser.deleteMany({ unitId }),
      Children.deleteMany({ unitId }),
      PreliminarOwner.deleteMany({ unitId }),
    ]);
    res.status(200).json({
      success: true,
      message: 'Unit unlinked. Owners, children and preliminary owners have been removed. The unit data remains unchanged.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reset password: nueva contraseña = unit_number. Actualiza Firebase (si tiene firebase_uid) y MongoDB.
 * Body: { email }
 */
unitsCtrl.resetPassword = async (req, res) => {
  try {
    const unitId = req.params.id;
    const email = trim(req.body?.email);
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'email is required in the request body',
      });
    }
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }
    const unitNumber = unit.unit_number || '';
    const newPassword = String(unitNumber).trim() || unitId.toString();

    let owner = await OwnerHusbandUser.findOne({ unitId, husband_email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    let OwnerModel = OwnerHusbandUser;
    if (!owner) {
      owner = await OwnerWifeUser.findOne({ unitId, wife_email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      OwnerModel = OwnerWifeUser;
    }
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'No owner found with this email for this unit',
      });
    }

    const auth = getAuth();
    if (owner.firebase_uid && auth) {
      try {
        await auth.updateUser(owner.firebase_uid, { password: newPassword });
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: err.message || 'Failed to update password in Firebase',
        });
      }
    }

    await OwnerModel.findByIdAndUpdate(owner._id, { $set: { password: newPassword } });
    res.status(200).json({
      success: true,
      message: 'Password has been reset. The new password is the unit number.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send invitation: reenvía el correo de invitación al owner con status -1 usando su invitationToken existente.
 * Body: { email }
 */
unitsCtrl.sendInvitation = async (req, res) => {
  try {
    const unitId = req.params.id;
    const email = trim(req.body?.email);
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'email is required in the request body',
      });
    }
    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    let owner = await OwnerHusbandUser.findOne({ unitId, husband_email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    let ownerType = 'husband';
    if (!owner) {
      owner = await OwnerWifeUser.findOne({ unitId, wife_email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      ownerType = 'wife';
    }
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'No owner found with this email for this unit',
      });
    }
    if (owner.status !== OWNER_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: 'Invitations can only be resent to owners with pending status (-1)',
      });
    }
    if (!owner.invitationToken) {
      return res.status(400).json({
        success: false,
        message: 'This owner has no invitation code',
      });
    }

    const toEmail = ownerType === 'husband' ? owner.husband_email : owner.wife_email;
    const recipientName = ownerType === 'husband' ? owner.husband_first : owner.wife_first;
    const sent = await sendOwnerInvitationEmail(toEmail, recipientName, owner.invitationToken);
    if (!sent.success) {
      return res.status(500).json({
        success: false,
        message: sent.error || 'Failed to send email',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Invitation email sent successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = unitsCtrl;
