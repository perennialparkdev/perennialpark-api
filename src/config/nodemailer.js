/**
 * @fileoverview Configuración de Nodemailer con Gmail para envío de correos.
 * Usa MAIL_USER y MAIL_PASS (contraseña de aplicación de 16 caracteres, no la contraseña normal).
 */

const nodemailer = require('nodemailer');

const user = process.env.MAIL_USER || 'perennialparkdev@gmail.com';
const pass = process.env.MAIL_PASS || '';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user,
    pass,
  },
});

/**
 * Envía un correo usando las opciones dadas.
 * @param {Object} mailOptions - { from?, to, subject, text?, html? }
 * @returns {Promise<{ success: boolean, info?: object, error?: string }>}
 */
function sendMail(mailOptions) {
  const options = {
    from: mailOptions.from || `"PerennialPark" <${user}>`,
    to: mailOptions.to,
    subject: mailOptions.subject,
    text: mailOptions.text,
    html: mailOptions.html,
  };
  return new Promise((resolve) => {
    transporter.sendMail(options, (error, info) => {
      if (error) {
        console.error('Error enviando correo:', error.message);
        return resolve({ success: false, error: error.message });
      }
      return resolve({ success: true, info });
    });
  });
}

module.exports = {
  transporter,
  sendMail,
  getDefaultFrom: () => user,
};
