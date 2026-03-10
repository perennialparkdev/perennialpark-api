/**
 * @fileoverview Migra todas las colecciones y registros de una base MongoDB (origen)
 * a otra (destino). Por defecto: test → test_dev.
 *
 * Uso:
 *   node scripts/migrate-db-to-test-dev.js
 *   node scripts/migrate-db-to-test-dev.js --drop
 *
 * Variables de entorno (opcionales):
 *   MONGODB_URI_SOURCE  URI de la DB origen (default: Atlas /test)
 *   MONGODB_URI_TARGET  URI de la DB destino (default: Atlas /test_dev)
 *
 * --drop  Antes de copiar cada colección, la borra en destino (reemplazo completo).
 *
 * IMPORTANTE: Haz backup (mongodump) antes de ejecutar en producción.
 */

require('dotenv').config();

const mongoose = require('mongoose');

const ATLAS_BASE = 'mongodb+srv://perennialparkdev:perennial24781279@perennialparkdb.mdc4upj.mongodb.net/';
const DEFAULT_SOURCE = ATLAS_BASE + 'test';
const DEFAULT_TARGET = ATLAS_BASE + 'test_dev';

const SOURCE_URI = process.env.MONGODB_URI_SOURCE || DEFAULT_SOURCE;
const TARGET_URI = process.env.MONGODB_URI_TARGET || DEFAULT_TARGET;
const DROP_BEFORE = process.argv.includes('--drop');

const BATCH_SIZE = 1000;

function log(msg) {
  console.log(`[migrate] ${msg}`);
}

function getDbName(uri) {
  try {
    const path = uri.replace(/^mongodb(\+srv)?:\/\//i, '').split('/')[1] || '';
    return path.split('?')[0] || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function listCollectionNames(db) {
  const collections = await db.listCollections().toArray();
  return collections
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.'));
}

async function copyCollection(sourceDb, targetDb, collectionName) {
  const sourceCol = sourceDb.collection(collectionName);
  const targetCol = targetDb.collection(collectionName);

  const total = await sourceCol.countDocuments();
  if (total === 0) {
    log(`  ${collectionName}: 0 documentos (nada que copiar)`);
    return { name: collectionName, count: 0 };
  }

  if (DROP_BEFORE) {
    await targetCol.drop().catch((err) => {
      if (err.codeName !== 'NamespaceNotFound') throw err;
    });
  }

  let inserted = 0;
  let cursor = sourceCol.find({});
  let batch = [];

  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length >= BATCH_SIZE) {
      await targetCol.insertMany(batch);
      inserted += batch.length;
      log(`  ${collectionName}: ${inserted}/${total}`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await targetCol.insertMany(batch);
    inserted += batch.length;
  }

  log(`  ${collectionName}: ${inserted} documentos copiados`);
  return { name: collectionName, count: inserted };
}

async function run() {
  const sourceName = getDbName(SOURCE_URI);
  const targetName = getDbName(TARGET_URI);

  log(`Origen:  ${sourceName} (${SOURCE_URI.replace(/[^:@]+@/, '***@')})`);
  log(`Destino: ${targetName} (${TARGET_URI.replace(/[^:@]+@/, '***@')})`);
  if (DROP_BEFORE) log('Modo: --drop (se borrarán colecciones en destino antes de copiar)');
  log('');

  let sourceConn;
  let targetConn;

  try {
    sourceConn = await mongoose.createConnection(SOURCE_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
    }).asPromise();
    log(`Conectado a origen: ${sourceName}`);

    targetConn = await mongoose.createConnection(TARGET_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
    }).asPromise();
    log(`Conectado a destino: ${targetName}`);
    log('');

    const sourceDb = sourceConn.db;
    const targetDb = targetConn.db;

    const names = await listCollectionNames(sourceDb);
    log(`Colecciones a migrar: ${names.length}`);
    if (names.length === 0) {
      log('No hay colecciones (excluyendo system.*). Nada que hacer.');
      return;
    }

    const results = [];
    for (const name of names) {
      const result = await copyCollection(sourceDb, targetDb, name);
      results.push(result);
    }

    const totalDocs = results.reduce((acc, r) => acc + r.count, 0);
    log('');
    log(`Listo. ${results.length} colecciones, ${totalDocs} documentos en total.`);
  } catch (err) {
    console.error('[migrate] Error:', err.message);
    process.exitCode = 1;
  } finally {
    if (sourceConn) await sourceConn.close().catch(() => {});
    if (targetConn) await targetConn.close().catch(() => {});
    log('Conexiones cerradas.');
  }
}

run();
