/**
 * @fileoverview Controlador de owners.
 * Valida acceso por unit_number (usuario/contrasena), signUp, login, formulario primario e invitación.
 * @see .cursorrules - Controllers Pattern: const ctrl = {}; ... module.exports = ctrl;
 */

const crypto = require('crypto');
const Unit = require('../models/unit.model');
const OwnerHusbandUser = require('../models/owner-husband-user.model');
const OwnerWifeUser = require('../models/owner-wife-user.model');
const Children = require('../models/children.model');
const { getAuth, getInitError } = require('../config/firebase');
const { sendOwnerInvitationEmail, sendPasswordResetEmail } = require('../services/mail.service');

const ownersCtrl = {};

const STATUS = { PENDING: -1, ANULADO: 0, ACTIVO: 1 };

function trim(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

/**
 * Valida acceso por número de unidad.
 * Body: { usuario, contrasena } (ambos deben ser el unit_number).
 * Si la unidad ya tiene algún owner (husband o wife) registrado, no puede ingresar.
 */
ownersCtrl.checkUnitAccess = async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'username and password are required',
      });
    }
    const userStr = String(usuario).trim();
    const passStr = String(contrasena).trim();
    if (userStr !== passStr) {
      return res.status(400).json({
        success: false,
        message: 'username and password must match the unit number',
      });
    }
    const unit_number = userStr;
    const unit = await Unit.findOne({ unit_number });
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }
    const [hasHusband, hasWife] = await Promise.all([
      OwnerHusbandUser.findOne({ unitId: unit._id }),
      OwnerWifeUser.findOne({ unitId: unit._id }),
    ]);
    if (hasHusband || hasWife) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: this unit already has owner(s) registered.',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Access granted',
      data: { unitId: unit._id, unit_number: unit.unit_number },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * SignUp: crea usuario en Firebase Auth con correo y contraseña.
 * Body: { email, contrasena }. Devuelve email y uid del usuario creado.
 * Si el correo ya existe en Firebase, avisa. Cualquier otro error se devuelve en la respuesta.
 */
ownersCtrl.signUp = async (req, res) => {
  try {
    const { email, contrasena } = req.body;
    if (!email || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'email and password are required',
      });
    }
    const emailStr = String(email).trim();
    const passwordStr = String(contrasena);
    if (!emailStr) {
      return res.status(400).json({
        success: false,
        message: 'Email address cannot be empty',
      });
    }
    if (passwordStr.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const auth = getAuth();
    if (!auth) {
      const detail = process.env.NODE_ENV === 'development' && getInitError()
        ? getInitError()
        : 'Check your Firebase configuration.';
      return res.status(503).json({
        success: false,
        message: 'Authentication service unavailable. Please check your Firebase configuration.',
        error: process.env.NODE_ENV === 'development' ? detail : undefined,
      });
    }

    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: emailStr,
        password: passwordStr,
        emailVerified: false,
      });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }
      if (err.code === 'auth/invalid-email') {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format.',
        });
      }
      if (err.code === 'auth/weak-password') {
        return res.status(400).json({
          success: false,
          message: 'Password is too weak.',
        });
      }
      console.error('Firebase signUp error:', err.code, err.message);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to create user in Firebase.',
      });
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        email: userRecord.email,
        uid: userRecord.uid,
      },
    });
  } catch (error) {
    console.error('Owners signUp error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Login: autentica con Firebase (email + contraseña) y devuelve el idToken.
 * El cliente debe enviar ese token en header: Authorization: Bearer <token>
 * para rutas protegidas con verifyFirebaseToken.
 */
ownersCtrl.login = async (req, res) => {
  try {
    const { email, contrasena } = req.body;
    if (!email || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'email and password are required',
      });
    }
    const emailStr = String(email).trim();
    const passwordStr = String(contrasena);
    if (!emailStr) {
      return res.status(400).json({
        success: false,
        message: 'Email address cannot be empty',
      });
    }

    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return res.status(503).json({
        success: false,
        message: 'Login not configured. Missing FIREBASE_WEB_API_KEY in .env',
      });
    }

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey.trim()}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailStr,
        password: passwordStr,
        returnSecureToken: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || data?.error || 'Failed to sign in';
      if (msg.includes('INVALID_LOGIN_CREDENTIALS') || msg.includes('EMAIL_NOT_FOUND') || msg.includes('INVALID_PASSWORD')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }
      return res.status(401).json({
        success: false,
        message: msg,
      });
    }

    const uid = data.localId;
    const [husband, wife] = await Promise.all([
      OwnerHusbandUser.findOne({ firebase_uid: uid }).populate('idRol').lean(),
      OwnerWifeUser.findOne({ firebase_uid: uid }).populate('idRol').lean(),
    ]);
    const owner = husband || wife;
    let ownerData = null;
    let unitData = null;
    if (owner) {
      const role = owner.idRol
        ? { id: owner.idRol._id, name: owner.idRol.name }
        : null;
      if (husband) {
        ownerData = {
          ownerType: 'husband',
          husband_first: husband.husband_first,
          husband_email: husband.husband_email,
          husband_phone: husband.husband_phone,
          last_name: husband.last_name,
          role,
        };
      } else {
        ownerData = {
          ownerType: 'wife',
          wife_first: wife.wife_first,
          wife_email: wife.wife_email,
          last_name: wife.last_name,
          role,
        };
      }
      if (owner.unitId) {
        const unit = await Unit.findById(owner.unitId).select('unit_number address').lean();
        if (unit) {
          unitData = { unitId: unit._id, unit_number: unit.unit_number, address: unit.address };
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Signed in successfully',
      data: {
        token: data.idToken,
        expiresIn: data.expiresIn,
        uid,
        email: data.email,
        owner: ownerData,
        unit: unitData,
      },
    });
  } catch (error) {
    console.error('Owners login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Formulario primario: requiere token (verifyFirebaseToken).
 * Body: unit, husband, wife, children. El email del usuario logueado (req.user.email) debe coincidir con husband_email o wife_email.
 * Crea Unit, owner activo (status 1) y opcionalmente owner pendiente (status -1) con invitación por correo.
 */
ownersCtrl.completeProfile = async (req, res) => {
  try {
    const firebaseEmail = (req.user && req.user.email) ? String(req.user.email).trim().toLowerCase() : null;
    if (!firebaseEmail) {
      return res.status(401).json({
        success: false,
        message: 'Valid authentication token required.',
      });
    }

    const body = req.body || {};
    const unitData = body.unit || {};
    const husbandData = body.husband || {};
    const wifeData = body.wife || {};
    const childrenList = Array.isArray(body.children) ? body.children : [];

    const husbandEmail = trim(husbandData.husband_email || husbandData.email);
    const wifeEmail = trim(wifeData.wife_email || wifeData.email);

    const isHusbandActive = husbandEmail && husbandEmail.toLowerCase() === firebaseEmail;
    const isWifeActive = wifeEmail && wifeEmail.toLowerCase() === firebaseEmail;

    if (!isHusbandActive && !isWifeActive) {
      return res.status(400).json({
        success: false,
        message: 'The email in the form (husband_email or wife_email) must match the one you used to register in Firebase. Use that email in the form.',
      });
    }

    const existingHusband = husbandEmail ? await OwnerHusbandUser.findOne({ husband_email: new RegExp(`^${husbandEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }) : null;
    const existingWife = wifeEmail ? await OwnerWifeUser.findOne({ wife_email: new RegExp(`^${wifeEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }) : null;
    if (existingHusband || existingWife) {
      return res.status(409).json({
        success: false,
        message: 'One of these emails is already registered as an owner for another unit. Use the email you signed in with and a different email for the other owner (if applicable).',
      });
    }

    const unitNumber = trim(unitData.unit_number);
    if (!unitNumber) {
      return res.status(400).json({
        success: false,
        message: 'unit_number is required in unit.',
      });
    }

    let unit = await Unit.findOne({ unit_number: unitNumber });
    if (!unit) {
      unit = await Unit.create({
        unit_number: unitNumber,
        address: trim(unitData.address),
        city: trim(unitData.city),
        state: trim(unitData.state),
        zip: trim(unitData.zip),
        colony_name: trim(unitData.colony_name),
        notes: trim(unitData.notes),
      });
    } else {
      const unitUpdate = {};
      if (unitData.address !== undefined) unitUpdate.address = trim(unitData.address);
      if (unitData.city !== undefined) unitUpdate.city = trim(unitData.city);
      if (unitData.state !== undefined) unitUpdate.state = trim(unitData.state);
      if (unitData.zip !== undefined) unitUpdate.zip = trim(unitData.zip);
      if (unitData.colony_name !== undefined) unitUpdate.colony_name = trim(unitData.colony_name);
      if (unitData.notes !== undefined) unitUpdate.notes = trim(unitData.notes);
      if (Object.keys(unitUpdate).length > 0) {
        unit = await Unit.findByIdAndUpdate(unit._id, { $set: unitUpdate }, { new: true });
      }
    }
    const unitId = unit._id;

    const activeUid = req.user.uid;
    const activePassword = isHusbandActive ? trim(husbandData.password) : trim(wifeData.password);

    if (isHusbandActive) {
      await OwnerHusbandUser.create({
        unitId,
        firebase_uid: activeUid,
        status: STATUS.ACTIVO,
        husband_first: trim(husbandData.husband_first),
        husband_email: husbandEmail,
        husband_phone: trim(husbandData.husband_phone),
        last_name: trim(husbandData.last_name),
        password: activePassword,
      });
    } else {
      await OwnerWifeUser.create({
        unitId,
        firebase_uid: activeUid,
        status: STATUS.ACTIVO,
        wife_first: trim(wifeData.wife_first),
        wife_email: wifeEmail,
        wife_phone: trim(wifeData.wife_phone),
        last_name: trim(wifeData.last_name),
        password: activePassword,
      });
    }

    if (isHusbandActive && wifeEmail) {
      const invitationToken = crypto.randomBytes(24).toString('hex');
      await OwnerWifeUser.create({
        unitId,
        firebase_uid: null,
        status: STATUS.PENDING,
        wife_first: trim(wifeData.wife_first),
        wife_email: wifeEmail,
        wife_phone: trim(wifeData.wife_phone),
        last_name: trim(wifeData.last_name),
        password: null,
        invitationToken,
      });
      const sent = await sendOwnerInvitationEmail(wifeEmail, trim(wifeData.wife_first) || wifeEmail, invitationToken);
      if (!sent.success) console.error('Invitation email error:', sent.error);
    } else if (isWifeActive && husbandEmail) {
      const invitationToken = crypto.randomBytes(24).toString('hex');
      await OwnerHusbandUser.create({
        unitId,
        firebase_uid: null,
        status: STATUS.PENDING,
        husband_first: trim(husbandData.husband_first),
        husband_email: husbandEmail,
        husband_phone: trim(husbandData.husband_phone),
        last_name: trim(husbandData.last_name),
        password: null,
        invitationToken,
      });
      const sent = await sendOwnerInvitationEmail(husbandEmail, trim(husbandData.husband_first) || husbandEmail, invitationToken);
      if (!sent.success) console.error('Invitation email error:', sent.error);
    }

    if (childrenList.length > 0) {
      await Children.insertMany(
        childrenList.map((c) => ({
          unitId,
          name: trim(c.name),
          age: c.age != null ? Number(c.age) : null,
          genre: trim(c.genre),
        }))
      );
    }

    res.status(201).json({
      success: true,
      message: 'Unit and owner profiles created successfully.',
      data: { unitId },
    });
  } catch (error) {
    console.error('Owners completeProfile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/** Campos que se consideran para el formulario dinámico por tipo de owner */
const HUSBAND_FIELDS = ['husband_first', 'husband_email', 'husband_phone', 'last_name', 'password'];
const WIFE_FIELDS = ['wife_first', 'wife_email', 'wife_phone', 'last_name', 'password'];

function getMissingFields(doc, ownerType) {
  const fields = ownerType === 'husband' ? HUSBAND_FIELDS : WIFE_FIELDS;
  const missing = [];
  for (const key of fields) {
    const val = doc[key];
    if (val == null || (typeof val === 'string' && val.trim() === '')) missing.push(key);
  }
  return missing;
}

/**
 * Valida email + invitationToken y devuelve los campos que faltan para ese owner (formulario dinámico).
 */
ownersCtrl.validateInvitation = async (req, res) => {
  try {
    const { email, token } = req.body || {};
    const emailStr = trim(email);
    const tokenStr = trim(token);
    if (!emailStr || !tokenStr) {
      return res.status(400).json({
        success: false,
        message: 'email and token are required.',
      });
    }

    let owner = await OwnerHusbandUser.findOne({
      husband_email: new RegExp(`^${emailStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      invitationToken: tokenStr,
    });
    let ownerType = 'husband';
    if (!owner) {
      owner = await OwnerWifeUser.findOne({
        wife_email: new RegExp(`^${emailStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        invitationToken: tokenStr,
      });
      ownerType = 'wife';
    }
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or invalid code. Please check the email and code.',
      });
    }
    if (owner.status === STATUS.ACTIVO) {
      return res.status(400).json({
        success: false,
        message: 'This account has already been activated.',
      });
    }

    const missingFields = getMissingFields(owner.toObject(), ownerType);
    res.status(200).json({
      success: true,
      data: {
        valid: true,
        ownerType,
        unitId: owner.unitId,
        missingFields,
      },
    });
  } catch (error) {
    console.error('Owners validateInvitation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Completa el perfil del owner pendiente: actualiza campos, crea usuario en Firebase y activa (status 1).
 */
ownersCtrl.completeInvitation = async (req, res) => {
  try {
    const { email, token, password, ...rest } = req.body || {};
    const emailStr = trim(email);
    const tokenStr = trim(token);
    if (!emailStr || !tokenStr) {
      return res.status(400).json({
        success: false,
        message: 'email and token are required.',
      });
    }

    let owner = await OwnerHusbandUser.findOne({
      husband_email: new RegExp(`^${emailStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      invitationToken: tokenStr,
    });
    let ownerType = 'husband';
    let OwnerModel = OwnerHusbandUser;
    if (!owner) {
      owner = await OwnerWifeUser.findOne({
        wife_email: new RegExp(`^${emailStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        invitationToken: tokenStr,
      });
      ownerType = 'wife';
      OwnerModel = OwnerWifeUser;
    }
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or invalid code.',
      });
    }
    if (owner.status === STATUS.ACTIVO) {
      return res.status(400).json({
        success: false,
        message: 'This account has already been activated.',
      });
    }

    const pass = trim(password);
    if (!pass || pass.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password is required and must be at least 6 characters.',
      });
    }

    const auth = getAuth();
    if (!auth) {
      return res.status(503).json({
        success: false,
        message: 'Authentication service unavailable.',
      });
    }

    let firebaseUid;
    try {
      const userRecord = await auth.createUser({
        email: emailStr,
        password: pass,
        emailVerified: false,
      });
      firebaseUid = userRecord.uid;
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists. Sign in or reset your password.',
        });
      }
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to create user in Firebase.',
      });
    }

    const update = {
      firebase_uid: firebaseUid,
      status: STATUS.ACTIVO,
      invitationToken: null,
      password: pass,
    };
    if (ownerType === 'husband') {
      if (rest.husband_first != null) update.husband_first = trim(rest.husband_first);
      if (rest.husband_phone != null) update.husband_phone = trim(rest.husband_phone);
      if (rest.last_name != null) update.last_name = trim(rest.last_name);
    } else {
      if (rest.wife_first != null) update.wife_first = trim(rest.wife_first);
      if (rest.wife_phone != null) update.wife_phone = trim(rest.wife_phone);
      if (rest.last_name != null) update.last_name = trim(rest.last_name);
    }
    await OwnerModel.findByIdAndUpdate(owner._id, { $set: update });

    res.status(200).json({
      success: true,
      message: 'Profile completed. You can now sign in with your email and password.',
      data: { uid: firebaseUid, email: emailStr },
    });
  } catch (error) {
    console.error('Owners completeInvitation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Base URL for password reset link (form page). Fallback to localhost when not set.
 */
function getPasswordResetBaseUrl() {
  const base =
    process.env.APP_PUBLIC_URL ||
    process.env.PASSWORD_RESET_BASE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://perennialpark-api.onrender.com' : 'http://localhost:5000');
  return base.replace(/\/$/, '');
}

/**
 * Escapa HTML para evitar XSS en vistas MVC.
 */
function escapeHtml(s) {
  if (s == null) return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Página HTML estilo Perennial Park (card blanca, verde, fondo claro).
 */
function renderResetFormPage(options) {
  const { title, subtitle, formHtml, extraHtml = '' } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Perennial Park</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #e8f4ec 0%, #d4e9dc 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 40px; max-width: 420px; width: 100%; }
    .brand { color: #2d7a3e; font-size: 1.5rem; font-weight: 700; margin-bottom: 24px; text-align: center; }
    h1 { font-size: 1.25rem; font-weight: 600; color: #1a1a1a; margin: 0 0 6px 0; }
    .subtitle { color: #6b7280; font-size: 0.875rem; margin-bottom: 24px; }
    label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 6px; }
    input[type="password"], input[type="text"] { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; margin-bottom: 16px; }
    input:focus { outline: none; border-color: #2d7a3e; }
    .btn { width: 100%; padding: 12px; background: #2d7a3e; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
    .btn:hover { background: #246830; }
    .message { margin-top: 16px; padding: 12px; border-radius: 8px; font-size: 0.875rem; }
    .message.error { background: #fef2f2; color: #b91c1c; }
    .message.success { background: #ecfdf5; color: #047857; }
    .link { margin-top: 20px; text-align: center; font-size: 0.875rem; color: #6b7280; }
    .link a { color: #2d7a3e; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Perennial Park</div>
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    ${formHtml}
    ${extraHtml}
  </div>
</body>
</html>`;
}

/**
 * POST /api/owners/password-request
 * Body: { email }. Busca owner activo con ese email, genera resetToken, guarda y envía correo con enlace al formulario.
 */
ownersCtrl.passwordRequest = async (req, res) => {
  try {
    const email = trim(req.body?.email);
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'email is required',
      });
    }

    const [husband, wife] = await Promise.all([
      OwnerHusbandUser.findOne({ husband_email: email, status: STATUS.ACTIVO }),
      OwnerWifeUser.findOne({ wife_email: email, status: STATUS.ACTIVO }),
    ]);
    const owner = husband || wife;
    if (!owner || !owner.firebase_uid) {
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive a link to reset your password.',
      });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const baseUrl = getPasswordResetBaseUrl();
    const resetLink = `${baseUrl}/api/owners/password-reset-form?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    if (husband) {
      await OwnerHusbandUser.findByIdAndUpdate(owner._id, { $set: { resetToken: token } });
    } else {
      await OwnerWifeUser.findByIdAndUpdate(owner._id, { $set: { resetToken: token } });
    }

    const recipientName = husband ? owner.husband_first : owner.wife_first;
    const mailResult = await sendPasswordResetEmail(email, recipientName, resetLink);
    if (!mailResult.success) {
      console.error('Password reset email error:', mailResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a link to reset your password.',
    });
  } catch (error) {
    console.error('Owners passwordRequest error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

/**
 * GET /api/owners/password-reset-form?token=...&email=...
 * Sirve la página MVC con el formulario para nueva contraseña (estilo Perennial Park).
 */
ownersCtrl.passwordResetForm = async (req, res) => {
  try {
    const token = trim(req.query?.token);
    const email = trim(req.query?.email);
    if (!token || !email) {
      const html = renderResetFormPage({
        title: 'Invalid link',
        subtitle: 'Missing token or email.',
        formHtml: '<p class="message error">This link is invalid. Please request a new password reset from the app.</p>',
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(html);
    }

    const [husband, wife] = await Promise.all([
      OwnerHusbandUser.findOne({ husband_email: email, resetToken: token }),
      OwnerWifeUser.findOne({ wife_email: email, resetToken: token }),
    ]);
    const owner = husband || wife;
    if (!owner) {
      const html = renderResetFormPage({
        title: 'Invalid or expired link',
        subtitle: 'This reset link is invalid or has already been used.',
        formHtml: '<p class="message error">Please request a new password reset from the app.</p>',
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(html);
    }

    const formHtml = `
    <form method="post" action="/api/owners/password-reset-form" id="resetForm">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <input type="hidden" name="email" value="${escapeHtml(email)}">
      <label for="password">New password</label>
      <input type="password" id="password" name="password" minlength="6" required placeholder="Enter new password">
      <label for="passwordConfirm">Confirm password</label>
      <input type="password" id="passwordConfirm" name="passwordConfirm" minlength="6" required placeholder="Confirm new password">
      <button type="submit" class="btn">Reset Password</button>
    </form>
    <script>
      document.getElementById('resetForm').addEventListener('submit', function(e) {
        var p = document.getElementById('password').value;
        var c = document.getElementById('passwordConfirm').value;
        if (p !== c) { e.preventDefault(); alert('Passwords do not match.'); return false; }
        if (p.length < 6) { e.preventDefault(); alert('Password must be at least 6 characters.'); return false; }
      });
    </script>`;

    const html = renderResetFormPage({
      title: 'Reset Password',
      subtitle: 'Enter your new password below.',
      formHtml,
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('Owners passwordResetForm error:', error);
    res.status(500).send('<p>Something went wrong. Please try again later.</p>');
  }
};

/**
 * POST /api/owners/password-reset-form
 * Body (form): email, token, password, passwordConfirm. Actualiza contraseña en MongoDB y Firebase y limpia resetToken.
 */
ownersCtrl.passwordResetSubmit = async (req, res) => {
  try {
    const email = trim(req.body?.email);
    const token = trim(req.body?.token);
    const password = String(req.body?.password || '').trim();
    const passwordConfirm = String(req.body?.passwordConfirm || '').trim();

    if (!email || !token || !password) {
      const html = renderResetFormPage({
        title: 'Reset Password',
        subtitle: 'Enter your new password below.',
        formHtml: '<p class="message error">Email, token and password are required.</p>',
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(html);
    }
    if (password.length < 6) {
      const html = renderResetFormPage({
        title: 'Reset Password',
        subtitle: 'Enter your new password below.',
        formHtml: '<p class="message error">Password must be at least 6 characters.</p>',
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(html);
    }
    if (password !== passwordConfirm) {
      const html = renderResetFormPage({
        title: 'Reset Password',
        subtitle: 'Enter your new password below.',
        formHtml: '<p class="message error">Passwords do not match.</p>',
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(html);
    }

    const [husband, wife] = await Promise.all([
      OwnerHusbandUser.findOne({ husband_email: email, resetToken: token }),
      OwnerWifeUser.findOne({ wife_email: email, resetToken: token }),
    ]);
    const owner = husband || wife;
    if (!owner) {
      const html = renderResetFormPage({
        title: 'Invalid or expired link',
        subtitle: 'This reset link is invalid or has already been used.',
        formHtml: '<p class="message error">Please request a new password reset from the app.</p>',
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(html);
    }

    const auth = getAuth();
    if (!auth) {
      const html = renderResetFormPage({
        title: 'Error',
        subtitle: 'Service temporarily unavailable.',
        formHtml: '<p class="message error">Authentication service is not available. Please try again later.</p>',
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(503).send(html);
    }

    try {
      await auth.updateUser(owner.firebase_uid, { password });
    } catch (err) {
      console.error('Firebase updateUser password error:', err);
      const html = renderResetFormPage({
        title: 'Error',
        subtitle: 'Could not update password.',
        formHtml: '<p class="message error">We could not update your password. Please try again or contact support.</p>',
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(500).send(html);
    }

    if (husband) {
      await OwnerHusbandUser.findByIdAndUpdate(owner._id, {
        $set: { password },
        $unset: { resetToken: '' },
      });
    } else {
      await OwnerWifeUser.findByIdAndUpdate(owner._id, {
        $set: { password },
        $unset: { resetToken: '' },
      });
    }

    const html = renderResetFormPage({
      title: 'Password updated',
      subtitle: 'Your password has been changed successfully.',
      formHtml: '<p class="message success">You can now sign in with your new password.</p>',
      extraHtml: '<p class="link"><a href="/">Back to Perennial Park</a></p>',
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('Owners passwordResetSubmit error:', error);
    res.status(500).send('<p>Something went wrong. Please try again later.</p>');
  }
};

module.exports = ownersCtrl;
