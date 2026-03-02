/**
 * @fileoverview Servicio de envío de correos. Función de prueba usando MAIL_TEST_TO.
 */

const { sendMail, getDefaultFrom } = require('../config/nodemailer');

/**
 * Envía un correo de prueba al destinatario configurado en MAIL_TEST_TO.
 * Contenido personalizado para mejorar entregabilidad y reducir probabilidad de spam.
 * @returns {Promise<{ success: boolean, error?: string, messageId?: string }>}
 */
async function sendTestEmail() {
  const to = process.env.MAIL_TEST_TO;
  if (!to || !to.trim()) {
    return { success: false, error: 'MAIL_TEST_TO no está definido en .env' };
  }

  const from = getDefaultFrom();
  const subject = 'Confirmación desde PerennialPark API';
  const recipientName = to.split('@')[0].replace(/[._]/g, ' ');
  const firstName = recipientName.split(' ')[0] || 'Hola';
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  const text = [
    `Hola ${capitalizedName},`,
    '',
    'Este es un mensaje de prueba enviado desde la API de PerennialPark.',
    'Si recibiste este correo, la configuración de Nodemailer con Gmail está funcionando correctamente.',
    '',
    'Puedes ignorar este mensaje o responder si necesitas verificar algo.',
    '',
    'Saludos,',
    'Equipo PerennialPark',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="padding: 24px;">
    <p style="margin: 0 0 16px;">Hola ${capitalizedName},</p>
    <p style="margin: 0 0 16px;">Este es un mensaje de prueba enviado desde la API de PerennialPark.</p>
    <p style="margin: 0 0 16px;">Si recibiste este correo, la configuración de Nodemailer con Gmail está funcionando correctamente.</p>
    <p style="margin: 0 0 24px;">Puedes ignorar este mensaje o responder si necesitas verificar algo.</p>
    <p style="margin: 0; color: #666;">Saludos,<br>Equipo PerennialPark</p>
  </div>
</body>
</html>
`.trim();

  const result = await sendMail({
    to: to.trim(),
    subject,
    text,
    html,
  });

  if (result.success) {
    return { success: true, messageId: result.info?.messageId };
  }
  return { success: false, error: result.error };
}

/**
 * Envía correo de invitación al co-propietario (owner pending) para completar su perfil.
 * En inglés, personalizado, con el código único (invitationToken).
 * @param {string} toEmail - Correo del destinatario
 * @param {string} recipientName - Nombre para el saludo (ej. first name)
 * @param {string} invitationToken - Código único para activar la cuenta
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendOwnerInvitationEmail(toEmail, recipientName, invitationToken) {
  if (!toEmail || !invitationToken) {
    return { success: false, error: 'Missing toEmail or invitationToken' };
  }
  const name = (recipientName || toEmail.split('@')[0] || 'there').trim();
  const firstName = name.split(' ')[0];
  const subject = 'Complete your PerennialPark owner profile';

  const text = [
    `Hello ${firstName},`,
    '',
    'You have been invited to complete your owner profile for your unit at PerennialPark.',
    'Use the code below together with the email address where you received this message to access the form and set your password.',
    '',
    `Your activation code: ${invitationToken}`,
    '',
    'If you did not expect this email, you can safely ignore it.',
    '',
    'Best regards,',
    'The PerennialPark Team',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="padding: 24px;">
    <p style="margin: 0 0 16px;">Hello ${firstName},</p>
    <p style="margin: 0 0 16px;">You have been invited to complete your owner profile for your unit at PerennialPark.</p>
    <p style="margin: 0 0 16px;">Use the code below together with the email address where you received this message to access the form and set your password.</p>
    <p style="margin: 16px 0; padding: 12px; background: #f5f5f5; border-radius: 6px; font-family: monospace; font-size: 14px; word-break: break-all;">${invitationToken}</p>
    <p style="margin: 0 0 24px;">If you did not expect this email, you can safely ignore it.</p>
    <p style="margin: 0; color: #666;">Best regards,<br>The PerennialPark Team</p>
  </div>
</body>
</html>
`.trim();

  const result = await sendMail({
    to: toEmail.trim(),
    subject,
    text,
    html,
  });
  return result.success ? { success: true } : { success: false, error: result.error };
}

/**
 * Envía correo para cambio de contraseña con enlace al formulario MVC.
 * @param {string} toEmail - Correo del owner
 * @param {string} recipientName - Nombre para el saludo (ej. first name)
 * @param {string} resetLink - URL completa al formulario (query token + email)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendPasswordResetEmail(toEmail, recipientName, resetLink) {
  if (!toEmail || !resetLink) {
    return { success: false, error: 'Missing toEmail or resetLink' };
  }
  const name = (recipientName || toEmail.split('@')[0] || 'there').trim();
  const firstName = name.split(' ')[0];
  const subject = 'Reset your PerennialPark password';

  const text = [
    `Hello ${firstName},`,
    '',
    'You requested a password change for your PerennialPark owner account.',
    'Click the link below to set a new password (or copy and paste it into your browser):',
    '',
    resetLink,
    '',
    'If you did not request this change, you can safely ignore this email.',
    '',
    'Best regards,',
    'The PerennialPark Team',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="padding: 24px;">
    <p style="margin: 0 0 16px;">Hello ${firstName},</p>
    <p style="margin: 0 0 16px;">You requested a password change for your PerennialPark owner account.</p>
    <p style="margin: 0 0 16px;">Click the link below to set a new password:</p>
    <p style="margin: 16px 0;"><a href="${resetLink}" style="color: #2d7a3e; word-break: break-all;">${resetLink}</a></p>
    <p style="margin: 0 0 24px;">If you did not request this change, you can safely ignore this email.</p>
    <p style="margin: 0; color: #666;">Best regards,<br>The PerennialPark Team</p>
  </div>
</body>
</html>
`.trim();

  const result = await sendMail({
    to: toEmail.trim(),
    subject,
    text,
    html,
  });
  return result.success ? { success: true } : { success: false, error: result.error };
}

module.exports = {
  sendTestEmail,
  sendOwnerInvitationEmail,
  sendPasswordResetEmail,
};
