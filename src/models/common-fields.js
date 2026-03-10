/**
 * @fileoverview Definiciones compartidas de campos entre modelos.
 * period: fecha en formato año-mes-día (YYYY-MM-DD) con guiones, según documentación.
 */

/** Expresión regular para formato YYYY-MM-DD (ej. 2026-01-15). */
const PERIOD_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Campo period usado en Meeting y modelos de reuniones/anuncios.
 * Tipo: String. Formato: YYYY-MM-DD (año-mes-día separado por guión).
 * Valores null o string vacío son válidos (opcional).
 * @returns {Object} Definición de campo para Mongoose schema.
 */
function periodField() {
  return {
    type: String,
    default: null,
    validate: {
      validator(v) {
        if (v == null || v === '') return true;
        return PERIOD_FORMAT.test(String(v).trim());
      },
      message: 'period must be in format YYYY-MM-DD (e.g. 2026-01-15)',
    },
  };
}

module.exports = {
  periodField,
  PERIOD_FORMAT,
};
