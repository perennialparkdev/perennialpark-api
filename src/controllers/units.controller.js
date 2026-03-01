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

unitsCtrl.list = async (req, res) => {
  try {
    const status = req.query.status != null ? Number(req.query.status) : null;
    const filter = status != null ? { status } : {};
    const units = await Unit.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: units });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

unitsCtrl.getById = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }
    res.status(200).json({ success: true, data: unit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

unitsCtrl.update = async (req, res) => {
  try {
    const body = req.body || {};
    const update = buildUnitFromBody(body);
    const unit = await Unit.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Unit updated',
      data: unit,
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
