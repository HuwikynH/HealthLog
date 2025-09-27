const mongoose = require('mongoose');

// Reuse the existing mongoose connection and switch to the `mifit` database for raw collections
function getMiFitDb() {
  const conn = mongoose.connection;
  if (!conn || conn.readyState !== 1) {
    throw new Error('MongoDB chưa sẵn sàng');
  }
  return conn.useDb('HealthLog', { useCache: true });
}

module.exports = { getMiFitDb };


