const { AppError } = require('../errors');

function validate(source, schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || (source === 'params' ? 'id' : '_');
        (details[key] ||= []).push(issue.message);
      }
      const code = source === 'params' ? 'INVALID_ID' : 'VALIDATION_ERROR';
      return next(new AppError(400, code, 'Request validation failed.', details));
    }
    req.valid = { ...(req.valid || {}), [source]: result.data };
    next();
  };
}

module.exports = { validate };