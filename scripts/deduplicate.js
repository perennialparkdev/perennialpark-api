/**
 * @fileoverview Script para deduplicar colecciones: Units, OwnerHusbandUser,
 * OwnerWifeUser, Children, PreliminarOwner. Respeta dependencias (unitId).
 * En owners: mantiene el registro con contraseña en claro; elimina los que tienen hash.
 *
 * IMPORTANTE: Haz backup de la base de datos (mongodump) antes de ejecutar sin --dry-run.
 *
 * Uso: node scripts/deduplicate.js
 * Modo simulación (no escribe en BD): node scripts/deduplicate.js --dry-run
 * O: npm run deduplicate:dry
 */

require('dotenv').config();

const { connectDB, disconnectDB } = require('../database/database');
const Unit = require('../src/models/unit.model');
const OwnerHusbandUser = require('../src/models/owner-husband-user.model');
const OwnerWifeUser = require('../src/models/owner-wife-user.model');
const Children = require('../src/models/children.model');
const PreliminarOwner = require('../src/models/preliminar-owner.model');

const DRY_RUN =
  process.env.DRY_RUN === '1' ||
  process.env.DRY_RUN === 'true' ||
  process.argv.includes('--dry-run');

function log(msg) {
  console.log(DRY_RUN ? '[DRY-RUN] ' + msg : msg);
}

/**
 * Detecta si el valor es una contraseña hasheada (bcrypt, argon2, etc.).
 * Las que nos sirven son las que están en claro.
 */
function isPasswordHashed(val) {
  if (val == null || typeof val !== 'string' || val.trim() === '') return false;
  const s = val.trim();
  if (s.length < 50) return false;
  if (/^\$2[aby]\$\d{2}\$/.test(s)) return true;
  if (s.startsWith('$argon2')) return true;
  return false;
}

/**
 * Construye el mapa unitId -> unitId canónico (por unit_number).
 * Así en dry-run las fases de owners/children ven los mismos grupos que tras aplicar Fase 1.
 */
async function buildCanonicalUnitIdMap() {
  const units = await Unit.find({}).sort({ createdAt: 1 }).lean();
  const byNumber = new Map();
  for (const u of units) {
    const key = (u.unit_number || '').toString().trim().toLowerCase();
    if (!key) continue;
    if (!byNumber.has(key)) byNumber.set(key, []);
    byNumber.get(key).push(u);
  }
  const canonicalMap = new Map();
  for (const [, list] of byNumber) {
    const canonicalId = list[0]._id.toString();
    for (const u of list) {
      canonicalMap.set(u._id.toString(), canonicalId);
    }
  }
  return canonicalMap;
}

/**
 * Fase 1: Unificar Units por unit_number.
 * Elige canónica (createdAt más antiguo), actualiza referencias, borra duplicadas.
 */
async function deduplicateUnits() {
  const units = await Unit.find({}).sort({ createdAt: 1 }).lean();
  const byNumber = new Map();
  for (const u of units) {
    const key = (u.unit_number || '').toString().trim().toLowerCase();
    if (!key) continue;
    if (!byNumber.has(key)) byNumber.set(key, []);
    byNumber.get(key).push(u);
  }

  let unitsDeleted = 0;
  let refsUpdated = 0;

  for (const [unitNumber, list] of byNumber) {
    if (list.length <= 1) continue;
    const canonical = list[0];
    const duplicateIds = list.slice(1).map((u) => u._id);

    log(`Unit number "${unitNumber}": keeping ${canonical._id}, merging ${duplicateIds.length} duplicate(s).`);

    if (!DRY_RUN) {
      const canonicalId = canonical._id;
      const resultH = await OwnerHusbandUser.updateMany(
        { unitId: { $in: duplicateIds } },
        { $set: { unitId: canonicalId } }
      );
      const resultW = await OwnerWifeUser.updateMany(
        { unitId: { $in: duplicateIds } },
        { $set: { unitId: canonicalId } }
      );
      const resultC = await Children.updateMany(
        { unitId: { $in: duplicateIds } },
        { $set: { unitId: canonicalId } }
      );
      const resultP = await PreliminarOwner.updateMany(
        { unitId: { $in: duplicateIds } },
        { $set: { unitId: canonicalId } }
      );
      refsUpdated += resultH.modifiedCount + resultW.modifiedCount + resultC.modifiedCount + resultP.modifiedCount;

      const del = await Unit.deleteMany({ _id: { $in: duplicateIds } });
      unitsDeleted += del.deletedCount;
    } else {
      refsUpdated += duplicateIds.length * 4;
      unitsDeleted += duplicateIds.length;
    }
  }

  log(`Units: ${unitsDeleted} duplicate(s) removed, ${refsUpdated} reference(s) updated.`);
  return { unitsDeleted, refsUpdated };
}

/**
 * Deduplica owners (husband o wife): mismo unitId canónico + mismo email.
 * Mantiene el que tiene contraseña en claro; elimina los que tienen hash.
 */
async function deduplicateOwnerCollection(Model, emailField, canonicalUnitIdMap, passwordField = 'password') {
  const name = Model.modelName;
  const docs = await Model.find({}).lean();
  const keyToDocs = new Map();

  for (const d of docs) {
    const rawUid = d.unitId && d.unitId.toString();
    const uid = (canonicalUnitIdMap && canonicalUnitIdMap.get(rawUid)) || rawUid;
    const email = (d[emailField] || '').toString().trim().toLowerCase();
    if (!uid || !email) continue;
    const key = `${uid}::${email}`;
    if (!keyToDocs.has(key)) keyToDocs.set(key, []);
    keyToDocs.get(key).push(d);
  }

  let deleted = 0;
  for (const [key, list] of keyToDocs) {
    if (list.length <= 1) continue;
    const withPlain = list.filter((d) => !isPasswordHashed(d[passwordField]));
    const withHashed = list.filter((d) => isPasswordHashed(d[passwordField]));
    const toKeep = withPlain.length > 0 ? withPlain[0] : withHashed[0];
    const toRemove = list.filter((x) => x._id.toString() !== toKeep._id.toString());

    log(`${name} key ${key}: keeping 1 (plain=${withPlain.length}), removing ${toRemove.length}.`);

    if (!DRY_RUN && toRemove.length > 0) {
      const ids = toRemove.map((x) => x._id);
      const result = await Model.deleteMany({ _id: { $in: ids } });
      deleted += result.deletedCount;
    } else if (toRemove.length > 0) {
      deleted += toRemove.length;
    }
  }
  log(`${name}: ${deleted} duplicate(s) removed.`);
  return deleted;
}

/**
 * Deduplica Children por (unitId canónico, name, age). Mantiene uno por combinación.
 */
async function deduplicateChildren(canonicalUnitIdMap) {
  const docs = await Children.find({}).lean();
  const keyToDocs = new Map();

  for (const d of docs) {
    const rawUid = d.unitId && d.unitId.toString();
    const uid = (canonicalUnitIdMap && canonicalUnitIdMap.get(rawUid)) || rawUid;
    const name = (d.name || '').toString().trim().toLowerCase();
    const age = d.age != null ? Number(d.age) : '';
    const key = `${uid}::${name}::${age}`;
    if (!keyToDocs.has(key)) keyToDocs.set(key, []);
    keyToDocs.get(key).push(d);
  }

  let deleted = 0;
  for (const [key, list] of keyToDocs) {
    if (list.length <= 1) continue;
    const toKeep = list[0];
    const toRemove = list.slice(1);

    log(`Children key ${key}: keeping 1, removing ${toRemove.length}.`);

    if (!DRY_RUN) {
      const ids = toRemove.map((x) => x._id);
      const result = await Children.deleteMany({ _id: { $in: ids } });
      deleted += result.deletedCount;
    } else {
      deleted += toRemove.length;
    }
  }
  log(`Children: ${deleted} duplicate(s) removed.`);
  return deleted;
}

/**
 * Deduplica PreliminarOwner por unitId canónico. Mantiene uno por unidad.
 */
async function deduplicatePreliminarOwner(canonicalUnitIdMap) {
  const docs = await PreliminarOwner.find({}).lean();
  const byUnit = new Map();

  for (const d of docs) {
    const rawUid = d.unitId && d.unitId.toString();
    const uid = (canonicalUnitIdMap && canonicalUnitIdMap.get(rawUid)) || rawUid;
    if (!uid) continue;
    if (!byUnit.has(uid)) byUnit.set(uid, []);
    byUnit.get(uid).push(d);
  }

  let deleted = 0;
  for (const [uid, list] of byUnit) {
    if (list.length <= 1) continue;
    const toRemove = list.slice(1);
    log(`PreliminarOwner unitId ${uid}: keeping 1, removing ${toRemove.length}.`);

    if (!DRY_RUN) {
      const ids = toRemove.map((x) => x._id);
      const result = await PreliminarOwner.deleteMany({ _id: { $in: ids } });
      deleted += result.deletedCount;
    } else {
      deleted += toRemove.length;
    }
  }
  log(`PreliminarOwner: ${deleted} duplicate(s) removed.`);
  return deleted;
}

async function main() {
  if (DRY_RUN) {
    console.log('--- DRY RUN: no se modificará la base de datos ---\n');
  }

  try {
    await connectDB();

    log('Construyendo mapa unitId -> canónico (por unit_number)...');
    const canonicalUnitIdMap = await buildCanonicalUnitIdMap();
    log(`  ${canonicalUnitIdMap.size} unitId(s) mapeados.\n`);

    log('Fase 1: Unificar Units por unit_number...');
    await deduplicateUnits();

    log('\nFase 2: Deduplicar OwnerHusbandUser (mantener contraseña en claro)...');
    await deduplicateOwnerCollection(OwnerHusbandUser, 'husband_email', canonicalUnitIdMap);

    log('\nFase 3: Deduplicar OwnerWifeUser (mantener contraseña en claro)...');
    await deduplicateOwnerCollection(OwnerWifeUser, 'wife_email', canonicalUnitIdMap);

    log('\nFase 4: Deduplicar Children por (unitId, name, age)...');
    await deduplicateChildren(canonicalUnitIdMap);

    log('\nFase 5: Deduplicar PreliminarOwner por unitId...');
    await deduplicatePreliminarOwner(canonicalUnitIdMap);

    console.log('\nDeduplicación finalizada.');
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    process.exit(process.exitCode || 0);
  }
}

main();
