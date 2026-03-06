/**
 * @fileoverview CRUD de meetings y announcements por modelKey.
 * Rutas: /api/meetings/:modelKey (list, create), /api/meetings/:modelKey/:id (get, update, activate, anular).
 * List acepta query period (YYYY-MM-DD). DELETE /period/:period elimina todos los registros de esa semana.
 */

const mongoose = require('mongoose');
const {
  getModelByKey,
  getFieldsForModelKey,
  getAllModelKeys,
  MODELS_BY_KEY,
  STATUS,
} = require('../config/meetingModels.config');

const meetingsCtrl = {};

/** Formato period: YYYY-MM-DD (lunes de la semana, semana lunes–domingo). */
const PERIOD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidPeriod(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!PERIOD_REGEX.test(trimmed)) return false;
  const date = new Date(trimmed);
  return !Number.isNaN(date.getTime());
}

function trim(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

/** Construye un documento solo con las keys permitidas para el modelKey (strings trim, numbers) */
function buildDoc(body, modelKey) {
  const fields = getFieldsForModelKey(modelKey);
  const doc = {};
  for (const key of fields) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const val = body[key];
    if (key === 'status' || key === 'idType') {
      if (key === 'idType' && val) doc[key] = mongoose.Types.ObjectId.isValid(val) ? new mongoose.Types.ObjectId(val) : null;
      else if (key === 'status' && val != null) doc[key] = Number(val);
      else if (key === 'idType') doc[key] = null;
      else doc[key] = val;
    } else {
      doc[key] = typeof val === 'string' ? trim(val) : val;
    }
  }
  return doc;
}

/** Resuelve modelKey a Model; si no es válido, responde 400 y retorna null. */
function resolveModel(modelKey, res) {
  const Model = getModelByKey(modelKey);
  if (!Model) {
    res.status(400).json({
      success: false,
      message: `Invalid modelKey. Allowed: ${getAllModelKeys().join(', ')}`,
    });
    return null;
  }
  return Model;
}

meetingsCtrl.list = async (req, res) => {
  try {
    const { modelKey } = req.params;
    const Model = resolveModel(modelKey, res);
    if (!Model) return;

    const status = req.query.status != null ? Number(req.query.status) : null;
    const idType = req.query.idType ? (mongoose.Types.ObjectId.isValid(req.query.idType) ? req.query.idType : null) : null;
    const periodRaw = req.query.period;
    const filter = {};
    if (status != null) filter.status = status;
    if (idType) filter.idType = idType;
    if (periodRaw != null && periodRaw !== '') {
      const period = String(periodRaw).trim();
      if (!isValidPeriod(period)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid period. Use YYYY-MM-DD (e.g. 2026-03-02 for the Monday of the week).',
        });
      }
      filter.period = period;
    }

    const list = await Model.find(filter).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

meetingsCtrl.getById = async (req, res) => {
  try {
    const { modelKey, id } = req.params;
    const Model = resolveModel(modelKey, res);
    if (!Model) return;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const doc = await Model.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

meetingsCtrl.create = async (req, res) => {
  try {
    const { modelKey } = req.params;
    const Model = resolveModel(modelKey, res);
    if (!Model) return;

    const body = req.body || {};
    const idType = body.idType;
    if (!idType) {
      return res.status(400).json({ success: false, message: 'idType is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(idType)) {
      return res.status(400).json({ success: false, message: 'idType must be a valid ObjectId' });
    }

    const doc = buildDoc(body, modelKey);
    doc.idType = new mongoose.Types.ObjectId(idType);
    if (doc.status == null) doc.status = STATUS.ACTIVE;

    const created = await Model.create(doc);
    res.status(201).json({
      success: true,
      message: 'Created successfully',
      data: created,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

meetingsCtrl.update = async (req, res) => {
  try {
    const { modelKey, id } = req.params;
    const Model = resolveModel(modelKey, res);
    if (!Model) return;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const doc = buildDoc(req.body || {}, modelKey);
    const updated = await Model.findByIdAndUpdate(id, { $set: doc }, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Updated successfully',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

meetingsCtrl.activate = async (req, res) => {
  try {
    const { modelKey, id } = req.params;
    const Model = resolveModel(modelKey, res);
    if (!Model) return;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const updated = await Model.findByIdAndUpdate(id, { $set: { status: STATUS.ACTIVE } }, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.status(200).json({ success: true, message: 'Activated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

meetingsCtrl.anular = async (req, res) => {
  try {
    const { modelKey, id } = req.params;
    const Model = resolveModel(modelKey, res);
    if (!Model) return;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const updated = await Model.findByIdAndUpdate(id, { $set: { status: STATUS.INACTIVE } }, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.status(200).json({ success: true, message: 'Deactivated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/meetings/period/:period
 * Elimina todos los registros (meetings y announcements) cuya semana sea la indicada.
 * period: YYYY-MM-DD (lunes de la semana).
 */
meetingsCtrl.deleteByPeriod = async (req, res) => {
  try {
    const period = req.params.period ? String(req.params.period).trim() : '';
    if (!isValidPeriod(period)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period. Use YYYY-MM-DD (e.g. 2026-03-02 for the Monday of the week).',
      });
    }

    const deletedByModel = {};
    let totalDeleted = 0;
    for (const [modelKey, Model] of Object.entries(MODELS_BY_KEY)) {
      const result = await Model.deleteMany({ period });
      deletedByModel[modelKey] = result.deletedCount;
      totalDeleted += result.deletedCount;
    }

    res.status(200).json({
      success: true,
      message: `All records for period ${period} have been deleted.`,
      data: { period, deletedByModel, totalDeleted },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = meetingsCtrl;
