  /**
 * @fileoverview Servicio de importación de Units desde Excel.
 * Lee Unit_export.xlsx (y variantes), crea Unit, OwnerHusbandUser, OwnerWifeUser y Children.
 */

const path = require('path');
const XLSX = require('xlsx');
const Unit = require('../models/unit.model');
const OwnerHusbandUser = require('../models/owner-husband-user.model');
const OwnerWifeUser = require('../models/owner-wife-user.model');
const Children = require('../models/children.model');
const { getAuth, initFirebase } = require('../config/firebase');

const STATUS = { PENDING: -1, ANULADO: 0, ACTIVO: 1 };

const UNIT_EXCEL_FILES = [
  'Unit_export.xlsx',
  'Unit_export(1).xlsx',
  'Unit_export(2).xlsx',
];

/**
 * Normaliza un valor de celda (trim, null si vacío).
 */
function norm(val) {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

/**
 * Normaliza las keys de un objeto a snake_case para coincidir con los modelos.
 */
function normalizeRowKeys(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const k = String(key).trim().toLowerCase().replace(/\s+/g, '_');
    out[k] = value;
  }
  return out;
}

/**
 * Lee todas las filas de los 3 Excel y devuelve array de objetos { columnName: value }.
 * @param {string} baseDir - Ruta a la carpeta que contiene los xlsx
 * @returns {Promise<Array<Record<string, any>>>}
 */
function readAllUnitRows(baseDir) {
  const rows = [];
  for (const file of UNIT_EXCEL_FILES) {
    const filePath = path.join(baseDir, file);
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: null });
      data.forEach((row) => rows.push(normalizeRowKeys(row)));
    } catch (err) {
      console.warn(`No se pudo leer ${file}:`, err.message);
    }
  }
  return rows;
}

/**
 * Crea usuario en Firebase Auth por email/password. Retorna uid o null.
 */
async function createFirebaseUser(email, password, displayName = null) {
  const auth = getAuth();
  if (!auth) return null;
  if (!email || !password) return null;
  const opts = { email: String(email).trim(), password: String(password) };
  if (displayName) opts.displayName = displayName;
  try {
    const userRecord = await auth.createUser(opts);
    return userRecord.uid;
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      const existing = await auth.getUserByEmail(email).catch(() => null);
      return existing ? existing.uid : null;
    }
    console.error('Firebase createUser error:', err.message);
    return null;
  }
}

/**
 * Parsea la columna children (JSON array) y devuelve array de { name, age, genre }.
 * genre se toma de la key "gender" del JSON.
 */
function parseChildrenColumn(val) {
  if (val == null || val === '') return [];
  const str = String(val).trim();
  if (!str) return [];
  try {
    const arr = JSON.parse(str);
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => ({
      name: item.name != null ? String(item.name) : null,
      age: item.age != null ? Number(item.age) : null,
      genre: item.gender != null ? String(item.gender) : (item.genre != null ? String(item.genre) : null),
    })).filter((c) => c.name != null || c.age != null || c.genre != null);
  } catch {
    return [];
  }
}

/**
 * Crea Unit desde las columnas indicadas.
 */
async function createUnitFromRow(row) {
  const doc = {
    zip: norm(row.zip),
    address: norm(row.address),
    notes: norm(row.notes),
    city: norm(row.city),
    colony_name: norm(row.colony_name),
    unit_number: norm(row.unit_number),
    state: norm(row.state),
  };
  const unit = await Unit.create(doc);
  return unit;
}

/**
 * Crea OwnerWifeUser (solo MongoDB, firebase_uid null, status -1).
 */
async function createOwnerWifeMongoOnly(unitId, row) {
  await OwnerWifeUser.create({
    unitId,
    firebase_uid: null,
    status: STATUS.PENDING,
    wife_first: norm(row.wife_first),
    wife_email: norm(row.wife_email),
    wife_phone: norm(row.wife_phone),
    last_name: norm(row.last_name),
    password: norm(row.custom_password) ?? norm(row.password),
  });
}

/**
 * Crea OwnerHusbandUser (solo MongoDB, firebase_uid null, status -1).
 */
async function createOwnerHusbandMongoOnly(unitId, row) {
  await OwnerHusbandUser.create({
    unitId,
    firebase_uid: null,
    status: STATUS.PENDING,
    husband_first: norm(row.husband_first),
    husband_email: norm(row.husband_email),
    husband_phone: norm(row.husband_phone),
    last_name: norm(row.last_name),
    password: norm(row.custom_password) ?? norm(row.password),
  });
}

/**
 * Crea OwnerWifeUser con Firebase (uid, status 1).
 */
async function createOwnerWifeWithFirebase(unitId, row) {
  const email = norm(row.wife_email);
  const password = norm(row.custom_password) ?? norm(row.password);
  if (!email || !password) {
    await createOwnerWifeMongoOnly(unitId, row);
    return;
  }
  const displayName = [norm(row.wife_first), norm(row.last_name)].filter(Boolean).join(' ') || null;
  const uid = await createFirebaseUser(email, password, displayName);
  await OwnerWifeUser.create({
    unitId,
    firebase_uid: uid,
    status: STATUS.ACTIVO,
    wife_first: norm(row.wife_first),
    wife_email: email,
    wife_phone: norm(row.wife_phone),
    last_name: norm(row.last_name),
    password,
  });
}

/**
 * Crea OwnerHusbandUser con Firebase (uid, status 1).
 */
async function createOwnerHusbandWithFirebase(unitId, row) {
  const email = norm(row.husband_email);
  const password = norm(row.custom_password) ?? norm(row.password);
  if (!email || !password) {
    await createOwnerHusbandMongoOnly(unitId, row);
    return;
  }
  const displayName = [norm(row.husband_first), norm(row.last_name)].filter(Boolean).join(' ') || null;
  const uid = await createFirebaseUser(email, password, displayName);
  await OwnerHusbandUser.create({
    unitId,
    firebase_uid: uid,
    status: STATUS.ACTIVO,
    husband_first: norm(row.husband_first),
    husband_email: email,
    husband_phone: norm(row.husband_phone),
    last_name: norm(row.last_name),
    password,
  });
}

/**
 * Procesa owners para una fila: owner_user_email vs wife/husband; crea Firebase solo para titular, MongoDB para ambos.
 */
async function processOwnersForRow(unitId, row) {
  const ownerEmail = norm(row.owner_user_email);
  const wifeEmail = norm(row.wife_email);
  const husbandEmail = norm(row.husband_email);

  const hasWife = !!wifeEmail;
  const hasHusband = !!husbandEmail;
  if (!hasWife && !hasHusband) return;

  if (ownerEmail) {
    if (ownerEmail === wifeEmail) {
      await createOwnerWifeWithFirebase(unitId, row);
      if (hasHusband && husbandEmail !== ownerEmail) {
        await createOwnerHusbandMongoOnly(unitId, row);
      }
    } else if (ownerEmail === husbandEmail) {
      await createOwnerHusbandWithFirebase(unitId, row);
      if (hasWife && wifeEmail !== ownerEmail) {
        await createOwnerWifeMongoOnly(unitId, row);
      }
    } else {
      if (hasWife) await createOwnerWifeMongoOnly(unitId, row);
      if (hasHusband) await createOwnerHusbandMongoOnly(unitId, row);
    }
    return;
  }

  if (husbandEmail) {
    await createOwnerHusbandWithFirebase(unitId, row);
    if (hasWife) await createOwnerWifeMongoOnly(unitId, row);
  } else if (wifeEmail) {
    await createOwnerWifeWithFirebase(unitId, row);
  }
}

/**
 * Crea registros Children desde la columna children (JSON array).
 */
async function processChildrenForRow(unitId, row) {
  const raw = row.children ?? row.Children;
  const items = parseChildrenColumn(raw);
  if (items.length === 0) return;
  await Children.insertMany(
    items.map((item) => ({
      unitId,
      name: item.name,
      age: item.age,
      genre: item.genre,
    }))
  );
}

/**
 * Ejecuta la importación completa.
 * @param {string} [baseDir] - Carpeta donde están los Excel (por defecto colecciones-excel en cwd)
 * @returns {Promise<{ unitsCreated: number, errors: string[] }>}
 */
async function runUnitImport(baseDir) {
  initFirebase();
  const dir = baseDir || path.join(process.cwd(), 'colecciones-excel');
  const rows = readAllUnitRows(dir);
  const errors = [];
  let unitsCreated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const unit = await createUnitFromRow(row);
      unitsCreated += 1;
      await processOwnersForRow(unit._id, row);
      await processChildrenForRow(unit._id, row);
    } catch (err) {
      errors.push(`Fila ${i + 1}: ${err.message}`);
      console.error(`Error en fila ${i + 1}:`, err.message);
    }
  }

  return { unitsCreated, errors };
}

module.exports = {
  runUnitImport,
  readAllUnitRows,
  parseChildrenColumn,
  STATUS,
};
