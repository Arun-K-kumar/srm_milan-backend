const crypto = require('crypto');
const config = require('../config');
const { AppError } = require('../errors');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

function requireAdmin(req, _res, next) {
  if (!config.adminApiKey) {
    return next(new AppError(500, 'SERVER_MISCONFIGURED', 'Admin access is not configured.'));
  }
  const provided = req.get('x-api-key');
  if (!provided) return next(new AppError(401, 'UNAUTHORIZED', 'Missing X-API-Key header.'));
  if (!crypto.timingSafeEqual(sha(provided), sha(config.adminApiKey))) {
    return next(new AppError(403, 'FORBIDDEN', 'Invalid API key.'));
  }
  next();
}

module.exports = { requireAdmin };