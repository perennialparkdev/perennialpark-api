/**
 * @fileoverview Inicialización de Firebase Admin SDK.
 * Usado para crear usuarios, verificar tokens y generar custom tokens.
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

let isInitialized = false;
/** Guarda el último error de inicialización para depuración (solo mensaje, no datos sensibles). */
let lastInitError = null;

/**
 * Construye credenciales desde variables de entorno individuales.
 * FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.
 * El private key en .env usa \n literal; aquí se convierte a saltos de línea reales.
 */
const getCredentialFromEnv = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) return null;

  if (typeof privateKey === 'string') {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  });
};

/**
 * Inicializa Firebase Admin. Prioridad:
 * 1. GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON)
 * 2. FIREBASE_SERVICE_ACCOUNT_JSON (objeto JSON como string)
 * 3. Variables individuales (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 */
const initFirebase = () => {
  if (isInitialized) return admin;
  lastInitError = null;

  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS.trim();
      const absolutePath = path.isAbsolute(credPath)
        ? credPath
        : path.resolve(process.cwd(), credPath);
      if (!fs.existsSync(absolutePath)) {
        lastInitError = `Archivo de credenciales no encontrado: ${absolutePath}`;
        console.error('Firebase:', lastInitError);
        return null;
      }
      process.env.GOOGLE_APPLICATION_CREDENTIALS = absolutePath;
      admin.initializeApp();
      isInitialized = true;
      return admin;
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      isInitialized = true;
      return admin;
    }

    const credentialFromEnv = getCredentialFromEnv();
    if (credentialFromEnv) {
      const config = { credential: credentialFromEnv };
      if (process.env.FIREBASE_STORAGE_BUCKET) {
        config.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
      }
      admin.initializeApp(config);
      isInitialized = true;
      return admin;
    }

    lastInitError = 'No se encontraron credenciales. Configura GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON) o FIREBASE_SERVICE_ACCOUNT_JSON en .env';
    console.warn('Firebase:', lastInitError);
    return null;
  } catch (error) {
    lastInitError = error.message || String(error);
    console.error('Error initializing Firebase Admin:', lastInitError);
    return null;
  }
};

const getAuth = () => {
  const app = initFirebase();
  return app ? app.auth() : null;
};

/** Devuelve el último mensaje de error de inicialización (para depuración en desarrollo). */
const getInitError = () => lastInitError;

module.exports = {
  initFirebase,
  getAuth,
  getInitError,
  admin,
};
