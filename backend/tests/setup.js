const mongoose = require('mongoose');
const { startServer } = require('../index');

let server;

module.exports.start = async () => {
  // Use a different DB for tests if MONGO_URI not set
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/healthlog_test';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  server = await startServer();
  return server;
};

module.exports.stop = async () => {
  if (server && server.close) await server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};
