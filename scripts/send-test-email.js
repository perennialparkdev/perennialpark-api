/**
 * Envía un correo de prueba a MAIL_TEST_TO (definido en .env).
 * Uso: node scripts/send-test-email.js
 */

require('dotenv').config();

const { sendTestEmail } = require('../src/services/mail.service');

async function main() {
  console.log('Enviando correo de prueba a', process.env.MAIL_TEST_TO || '(no configurado)');
  const result = await sendTestEmail();
  if (result.success) {
    console.log('Correo enviado correctamente.');
    if (result.messageId) console.log('Message ID:', result.messageId);
  } else {
    console.error('Error:', result.error);
    process.exitCode = 1;
  }
}

main();
