/**
 * @fileoverview CRUD for Roles. Only accessible by owners with admin idRol.
 * Create, list, getById, update, activate, anular. All responses in English.
 */

const Rol = require('../models/rol.model');

const rolesCtrl = {};

const STATUS = { ACTIVE: 1, INACTIVE: 2 };

function trim(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

function buildRolFromBody(body) {
  return {
    name: trim(body.name),
    description: trim(body.description),
    status: body.status != null ? Number(body.status) : STATUS.ACTIVE,
  };
}

rolesCtrl.create = async (req, res) => {
  try {
    const body = req.body || {};
    const name = trim(body.name);
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'name is required',
      });
    }

    const existing = await Rol.findOne({ name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A role with this name already exists',
      });
    }

    const rol = await Rol.create(buildRolFromBody(body));
    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: rol,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

rolesCtrl.list = async (req, res) => {
  try {
    const status = req.query.status != null ? Number(req.query.status) : null;
    const filter = status != null ? { status } : {};
    const roles = await Rol.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

rolesCtrl.getById = async (req, res) => {
  try {
    const rol = await Rol.findById(req.params.id);
    if (!rol) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }
    res.status(200).json({ success: true, data: rol });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

rolesCtrl.update = async (req, res) => {
  try {
    const body = req.body || {};
    const update = buildRolFromBody(body);
    const rol = await Rol.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!rol) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Role updated',
      data: rol,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

rolesCtrl.activate = async (req, res) => {
  try {
    const rol = await Rol.findByIdAndUpdate(
      req.params.id,
      { $set: { status: STATUS.ACTIVE } },
      { new: true }
    );
    if (!rol) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Role activated',
      data: rol,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

rolesCtrl.anular = async (req, res) => {
  try {
    const rol = await Rol.findByIdAndUpdate(
      req.params.id,
      { $set: { status: STATUS.INACTIVE } },
      { new: true }
    );
    if (!rol) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Role deactivated',
      data: rol,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = rolesCtrl;
