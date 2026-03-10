/**
 * @fileoverview Conexión genérica a MongoDB mediante Mongoose.
 * Usa variable de entorno MONGODB_URI o URI por defecto para desarrollo local.
 * @see .cursorrules - Project Structure: database/ para configuración de persistencia.
 */

const mongoose = require('mongoose');

const defaultUri = 'mongodb://localhost:27017/perennialpark';
const mongoUri = process.env.MONGODB_URI || defaultUri;

/**
 * Establece la conexión a MongoDB.
 * @returns {Promise<mongoose.Connection>} Conexión de Mongoose
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    const dbName = conn.connection.name || 'unknown';
    console.log(`MongoDB Connected: ${conn.connection.host} | DB: ${dbName}`);
    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

/**
 * Cierra la conexión a MongoDB de forma ordenada.
 * Útil para shutdown graceful (tests, despliegues).
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error.message);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

module.exports = {
  connectDB,
  disconnectDB,
  mongoose,
};
