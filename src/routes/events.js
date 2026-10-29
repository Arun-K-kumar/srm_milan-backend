const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { validate } = require('../middleware/validate');
const { requireAdmin } = require('../middleware/auth');
const { createEventBody, registerBody, listQuery, idParam } = require('../schemas');
const eventService = require('../services/eventService');
const { registerParticipant } = require('../services/registrationService');

module.exports = function eventsRouter() {
  const router = Router();

  const registerLimiter = rateLimit({
    skip: () => process.env.NODE_ENV === 'test',
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.', details: {} },
      }),
  });

  router.get('/', validate('query', listQuery), async (req, res) => {
    const { items, meta } = await eventService.listEvents(req.valid.query);
    res.json({ data: items, meta });
  });

  router.post('/', requireAdmin, validate('body', createEventBody), async (req, res) => {
    const event = await eventService.createEvent(req.valid.body);
    res.status(201).location(`/api/events/${event.id}`).json({ data: event });
  });

  router.get('/:id', validate('params', idParam), async (req, res) => {
    res.json({ data: await eventService.getEvent(req.valid.params.id) });
  });

  router.post(
    '/:id/register',
    registerLimiter,
    validate('params', idParam),
    validate('body', registerBody),
    async (req, res) => {
      const registration = await registerParticipant(req.valid.params.id, req.valid.body);
      res.status(201).json({ data: registration });
    }
  );

  router.get('/:id/registrations', requireAdmin, validate('params', idParam), async (req, res) => {
    const data = await eventService.listRegistrations(req.valid.params.id);
    res.json({ data, meta: { total: data.length } });
  });

  return router;
};