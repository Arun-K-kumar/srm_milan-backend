const events = require('../repositories/eventRepository');
const registrations = require('../repositories/registrationRepository');
const { AppError, notFound } = require('../errors');

const alreadyRegistered = () =>
  new AppError(409, 'ALREADY_REGISTERED', 'This email is already registered for this event.');

async function registerParticipant(eventId, { name, email }) {
  const event = await events.findById(eventId);
  if (!event) throw notFound('Event');

  if (new Date(event.start_datetime).getTime() <= Date.now()) {
    throw new AppError(409, 'EVENT_CLOSED', 'Registration is closed because this event has already started.');
  }

  if (await registrations.exists(eventId, email)) throw alreadyRegistered();

  // Atomic capacity check: null means full (or the event started in the meantime).
  const claimed = await events.claimSpot(eventId);
  if (!claimed) {
    throw new AppError(409, 'EVENT_FULL', 'This event has reached its registration capacity.', {
      capacity: event.capacity,
    });
  }

  try {
    const registration = await registrations.create(eventId, { name, email });
    return {
      id: registration.id,
      event_id: eventId,
      participant: { name: registration.name, email: registration.email },
      registered_at: registration.registered_at,
      spots_left: claimed.spots_left,
    };
  } catch (err) {
    await events.releaseSpot(eventId); // give the spot back if saving failed
    if (registrations.isDuplicateKey(err)) throw alreadyRegistered();
    throw err;
  }
}

module.exports = { registerParticipant };