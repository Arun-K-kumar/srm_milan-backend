const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { connectDb } = require('./db');
const { AppError } = require('./errors');
const eventsRouter = require('./routes/events');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '50kb' }));

  app.get('/', (_req, res) => {
    res.json({ name: 'Milan Events API', health: '/api/health' });
  });

  app.get('/api/health', async (_req, res) => {
    try {
      await connectDb();
      res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
      console.error(err);
      res.status(503).json({ status: 'error', database: 'unreachable' });
    }
  });

  // Make sure the DB is connected before any other /api route runs.
  app.use('/api', async (_req, _res, next) => {
    try {
      await connectDb();
      next();
    } catch (err) {
      console.error(err);
      next(new AppError(503, 'DATABASE_UNAVAILABLE', 'Database is unreachable.'));
    }
  });

  app.use('/api/events', eventsRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };