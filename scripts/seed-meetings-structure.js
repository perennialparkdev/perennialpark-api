/**
 * @fileoverview Script para crear la estructura de reuniones:
 * - Categoría Minyanim con 7 tipos.
 * - Categoría Shabbos con sus tipos + tipo especial "Shabbos Mevorchim" (por idCategory fijo).
 * - Categoría Shiurim con tipos Daf Yomi y Additional Shiurim (wednesday-friday).
 * - Categoría Announcements con tipos de anuncio (weekDay = null).
 * No crea meetings ni modelos especiales (ShabbosMevorchimMeeting, DafYomiMeeting, AdditionalShiurimMeeting, etc.), solo Category + Types.
 * Uso: node scripts/seed-meetings-structure.js
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../database/database');
const Category = require('../src/models/category.model');
const Type = require('../src/models/type.model');

const MINYANIM_CATEGORY_NAME = 'Minyanim';

const MINYANIM_TYPES = [
  { name: 'Shachris', weekDay: 'Monday-thursday' },
  { name: 'Mincha', weekDay: 'Monday-thursday' },
  { name: 'Maariv', weekDay: 'Monday-thursday' },
  { name: 'Shachris', weekDay: 'Friday' },
  { name: 'Shachris', weekDay: 'Sunday' },
  { name: 'Mincha', weekDay: 'Sunday' },
  { name: 'Maariv', weekDay: 'Sunday' },
];

const SHABBOS_CATEGORY_NAME = 'Shabbos';

const SHABBOS_TYPES = [
  { name: 'Kabolas Shabbos', weekDay: 'wednesday-friday' },
  { name: 'Shachris', weekDay: 'wednesday-friday' },
  { name: 'Mincha', weekDay: 'wednesday-friday' },
  { name: 'Motzei Shabbos Maariv', weekDay: 'wednesday-friday' },
];

/** Category Shabbos _id (para el tipo especial Shabbos Mevorchim). */
const SHABBOS_CATEGORY_ID = '69a527ec5866a00c49e7d6b3';

const SHABBOS_MEVORCHIM_TYPE = {
  name: 'Shabbos Mevorchim',
  weekDay: 'Shabbos',
};

const SHIURIM_CATEGORY_NAME = 'Shiurim';

const SHIURIM_TYPES = [
  { name: 'Daf Yomi', weekDay: 'wednesday-friday' },
  { name: 'Additional Shiurim', weekDay: 'wednesday-friday' },
];

const ANNOUNCEMENTS_CATEGORY_NAME = 'Announcements';

const ANNOUNCEMENTS_TYPES = [
  { name: 'Pirkei Avis Shiur', weekDay: null },
  { name: 'Mazel Tov Announcements', weekDay: null },
  { name: "Avos U'Bonim Sponsor", weekDay: null },
  { name: 'Announcements Notes', weekDay: null },
];

/**
 * Crea o obtiene una categoría por nombre y devuelve el documento.
 */
async function ensureCategory(name) {
  let category = await Category.findOne({ name });
  if (!category) {
    category = await Category.create({ name });
    console.log('Category created:', category.name, category._id);
  } else {
    console.log('Category already exists:', category.name, category._id);
  }
  return category;
}

/**
 * Crea los types dados (name + weekDay) para una categoría específica.
 * Idempotente: puede ejecutarse varias veces sin duplicar.
 */
async function seedTypesForCategory(categoryName, types) {
  const category = await ensureCategory(categoryName);
  const categoryId = category._id;
  let created = 0;
  let existing = 0;

  for (const { name, weekDay } of types) {
    const found = await Type.findOne({ name, weekDay, idCategory: categoryId });
    if (found) {
      existing++;
    } else {
      await Type.create({ name, weekDay, idCategory: categoryId });
      created++;
      console.log('Type created:', `[${categoryName}]`, name, '-', weekDay);
    }
  }

  return { categoryId, typesCreated: created, typesAlreadyExisting: existing };
}

/**
 * Asegura que exista el tipo "Shabbos Mevorchim" en la categoría Shabbos (por _id).
 * No crea registros de ShabbosMevorchimMeeting. Idempotente.
 */
async function ensureShabbosMevorchimType() {
  const categoryId = new mongoose.Types.ObjectId(SHABBOS_CATEGORY_ID);
  let type = await Type.findOne({
    name: SHABBOS_MEVORCHIM_TYPE.name,
    weekDay: SHABBOS_MEVORCHIM_TYPE.weekDay,
    idCategory: categoryId,
  });
  if (!type) {
    type = await Type.create({
      name: SHABBOS_MEVORCHIM_TYPE.name,
      weekDay: SHABBOS_MEVORCHIM_TYPE.weekDay,
      idCategory: categoryId,
    });
    console.log('Type created: [Shabbos]', type.name, '-', type.weekDay);
    return { created: true, type };
  }
  console.log('Type already exists: [Shabbos]', type.name);
  return { created: false, type };
}

async function main() {
  try {
    await connectDB();
    console.log('Seeding meetings structure for Minyanim, Shabbos, Shiurim and Announcements...');

    const minyanimResult = await seedTypesForCategory(MINYANIM_CATEGORY_NAME, MINYANIM_TYPES);
    console.log(
      'Minyanim types -> created:',
      minyanimResult.typesCreated,
      '| already existing:',
      minyanimResult.typesAlreadyExisting
    );

    const shabbosResult = await seedTypesForCategory(SHABBOS_CATEGORY_NAME, SHABBOS_TYPES);
    console.log(
      'Shabbos types -> created:',
      shabbosResult.typesCreated,
      '| already existing:',
      shabbosResult.typesAlreadyExisting
    );

    const mevorchimResult = await ensureShabbosMevorchimType();
    console.log('Shabbos Mevorchim type ->', mevorchimResult.created ? 'created' : 'already existing');

    const shiurimResult = await seedTypesForCategory(SHIURIM_CATEGORY_NAME, SHIURIM_TYPES);
    console.log(
      'Shiurim types -> created:',
      shiurimResult.typesCreated,
      '| already existing:',
      shiurimResult.typesAlreadyExisting
    );

    const announcementsResult = await seedTypesForCategory(ANNOUNCEMENTS_CATEGORY_NAME, ANNOUNCEMENTS_TYPES);
    console.log(
      'Announcements types -> created:',
      announcementsResult.typesCreated,
      '| already existing:',
      announcementsResult.typesAlreadyExisting
    );
  } catch (err) {
    console.error('Error seeding meetings structure:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    process.exit(process.exitCode || 0);
  }
}

main();
