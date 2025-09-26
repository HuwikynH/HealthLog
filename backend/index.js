const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
const morgan = require('morgan');
// Request logging
app.use(morgan('dev'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/healthlog';
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');

    const healthLogsRouter = require('./routes/healthLogs');
    app.use('/api/health-logs', healthLogsRouter);
    const mifitRouter = require('./routes/mifit');
    app.use('/api/mifit', mifitRouter);

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    app.use((err, req, res, next) => {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Server error' });
    });

    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
    return server;
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

// If this file is run directly, start the server.
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };


