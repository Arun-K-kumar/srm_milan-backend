const events = require('../repositories/eventRepository');
const { notFound } = require('../errors');
const registrations = require('../repositories/registrationRepository');

const createEvent = (data) => events.create(data);

async function getEvent(id) {
  const event = await events.findById(id);
  if (!event) throw notFound('Event');
  return event;
}

async function listEvents({ category, upcoming, page, limit }) {
  const { items, total } = await events.list({
    category,
    upcoming: upcoming === 'true',
    limit,
    offset: (page - 1) * limit,
  });
  return { items, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
}

async function listRegistrations(eventId) {
  await getEvent(eventId); // 404 if the event does not exist
  return registrations.listForEvent(eventId);
}

module.exports = { createEvent, getEvent, listEvents, listRegistrations };