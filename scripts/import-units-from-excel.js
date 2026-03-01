/**
 * @fileoverview Script para importar Units desde los Excel Unit_export.
 * Crea Unit, OwnerHusbandUser, OwnerWifeUser y Children.
 * Uso: node scripts/import-units-from-excel.js
 */

require('dotenv').config();
const path = require('path');

const { connectDB, disconnectDB } = require('../database/database');
const { runUnitImport } = require('../src/services/unitImport.service');

const baseDir = path.join(__dirname, '..', 'colecciones-excel');

async function main() {
  try {
    await connectDB();
    console.log('Iniciando importación desde', baseDir);
    const { unitsCreated, errors } = await runUnitImport(baseDir);
    console.log(`Unidades creadas: ${unitsCreated}`);
    if (errors.length > 0) {
      console.error('Errores:', errors.length);
      errors.forEach((e) => console.error(' -', e));
    }
  } catch (err) {
    console.error('Error en importación:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    process.exit(process.exitCode || 0);
  }
}

main();
