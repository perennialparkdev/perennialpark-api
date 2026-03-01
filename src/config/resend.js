/**
 * @fileoverview Configuración del cliente Resend para envío de correos.
 * @see https://resend.com/docs/send-with-nodejs
 */

const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY || '';
const fromEmail = process.env.RESEND_FROM_EMAIL || 'perennialparkdev@gmail.com';

let client = null;

/**
 * Obtiene el cliente de Resend (singleton). Devuelve null si no hay API key.
 * @returns {Resend | null}
 */
function getResendClient() {
  if (!apiKey || apiKey.trim() === '') {
    console.warn('Resend: RESEND_API_KEY no configurada. El envío de correos no estará disponible.');
    return null;
  }
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}

/**
 * Email remitente por defecto para los envíos.
 * Debe ser un correo verificado en Resend (Domains) o usar onboarding@resend.dev en desarrollo.
 */
function getFromEmail() {
  return fromEmail;
}

/**
 * Envía un correo electrónico mediante Resend.
 * @param {Object} options
 * @param {string} options.to - Destinatario(s), separados por coma o array
 * @param {string} options.subject - Asunto
 * @param {string} [options.html] - Cuerpo en HTML
 * @param {string} [options.text] - Cuerpo en texto plano (alternativa a html)
 * @param {string} [options.from] - Remitente (por defecto RESEND_FROM_EMAIL)
 * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
 */
async function sendEmail({ to, subject, html, text, from: fromOverride }) {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Resend no configurado (falta RESEND_API_KEY)' };
  }
  const from = fromOverride || getFromEmail();
  if (!to || !subject) {
    return { success: false, error: 'Faltan to o subject' };
  }
  try {
    const payload = { from, to, subject };
    if (html) payload.html = html;
    if (text) payload.text = text;
    const { data, error } = await resend.emails.send(payload);
    if (error) {
      return { success: false, error: error.message || String(error) };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

module.exports = {
  getResendClient,
  getFromEmail,
  sendEmail,
};
