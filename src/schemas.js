const { z } = require('zod');

const CATEGORIES = ['tech', 'music', 'sports', 'arts', 'food', 'business', 'education', 'other'];

const category = z.string().trim().toLowerCase().pipe(z.enum(CATEGORIES));

const createEventBody = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(1).max(5000),
    category,
    start_datetime: z
      .string()
      .datetime({ offset: true, message: 'Must be an ISO 8601 date-time with timezone, e.g. 2027-03-01T18:00:00Z' })
      .refine((v) => new Date(v).getTime() > Date.now(), { message: 'Must be in the future' }),
    venue: z.string().trim().min(1).max(200),
    capacity: z.number().int().min(1).max(100000),
  })
  .strict();

const registerBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().max(254).email(),
  })
  .strict();

const listQuery = z.object({
  category: category.optional(),
  upcoming: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParam = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid event id'),
});

module.exports = { CATEGORIES, createEventBody, registerBody, listQuery, idParam };