/**
 * @fileoverview Crea usuarios en Firebase para los Husband owners que no tienen firebase_uid.
 * - Solo considera owners con status ACTIVO (1), email y password definidos.
 * - Salta owners cuyo password no cumple con las reglas de Firebase y los reporta.
 * - Actualiza el campo firebase_uid en MongoDB tras cada creación exitosa.
 * - Incluye modo dry-run (--dry-run) que solo reporta sin tocar Firebase ni Mongo.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const { connectDB, disconnectDB } = require('../database/database');
const OwnerHusbandUser = require('../src/models/owner-husband-user.model');
const { getAuth, getInitError } = require('../src/config/firebase');

const DRY_RUN = process.argv.includes('--dry-run');
const MIN_PASSWORD_LENGTH = 6;

async function main() {
  if (DRY_RUN) {
    console.log('--- DRY RUN: no se escribirá en Firebase ni en MongoDB ---\n');
  }

  const auth = getAuth();
  if (!auth) {
    console.error('Firebase Admin no está inicializado:', getInitError() || 'revise la configuración');
    process.exit(1);
  }

  await connectDB();

  const owners = await OwnerHusbandUser.find({
    status: 1,
    husband_email: { $exists: true, $nin: [null, ''] },
    password: { $exists: true, $nin: [null, ''] },
    $or: [{ firebase_uid: { $exists: false } }, { firebase_uid: null }, { firebase_uid: '' }],
  }).lean();

  console.log('Owners to process:', owners.length);

  const report = {
    created: [],
    skippedWeakPassword: [],
    skippedEmailExists: [],
    otherErrors: [],
  };

  for (const owner of owners) {
    const { _id, husband_email, password } = owner;
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      report.skippedWeakPassword.push({ ownerId: _id, email: husband_email, reason: 'contraseña menor a 6 caracteres' });
      continue;
    }

    try {
      if (!DRY_RUN) {
        const userRecord = await auth.createUser({
          email: husband_email,
          password,
          emailVerified: false,
        });
        await OwnerHusbandUser.findByIdAndUpdate(_id, { $set: { firebase_uid: userRecord.uid } });
      }
      report.created.push({ ownerId: _id, email: husband_email });
      console.log(`✔ Created Firebase user for owner ${husband_email}`);
    } catch (error) {
      const code = error.code || '';
      if (code === 'auth/email-already-exists') {
        report.skippedEmailExists.push({ ownerId: _id, email: husband_email });
        console.warn(`⚠ Email already exists, skipping ${husband_email}`);
      } else if (code === 'auth/weak-password') {
        report.skippedWeakPassword.push({ ownerId: _id, email: husband_email, reason: 'contraseña considerada débil por Firebase' });
        console.warn(`⚠ Weak password for ${husband_email}`);
      } else {
        report.otherErrors.push({ ownerId: _id, email: husband_email, error: error.message || String(error) });
        console.error(`✖ Error creando ${husband_email}:`, error.message || error);
      }
    }
  }

  console.log('\n==== Reporte ====');
  console.log('Usuarios creados en Firebase:', report.created.length);
  console.log('Usuarios saltados por contraseña débil:', report.skippedWeakPassword.length);
  console.log('Usuarios saltados por email existente:', report.skippedEmailExists.length);
  console.log('Otros errores:', report.otherErrors.length);

  if (report.skippedWeakPassword.length > 0) {
    console.log('\n> Weak password details:');
    report.skippedWeakPassword.forEach((row) => {
      console.log(`  - ${row.email} (${row.reason})`);
    });
  }
  if (report.skippedEmailExists.length > 0) {
    console.log('\n> Email already exists (Firebase):');
    report.skippedEmailExists.forEach((row) => {
      console.log(`  - ${row.email}`);
    });
  }
  if (report.otherErrors.length > 0) {
    console.log('\n> Otros errores:');
    report.otherErrors.forEach((row) => {
      console.log(`  - ${row.email}: ${row.error}`);
    });
  }

  await disconnectDB();
  console.log('\nProceso terminado.');
}

main().catch((error) => {
  console.error('Script falló:', error);
  process.exit(1);
});
