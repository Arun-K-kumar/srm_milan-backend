const Registration = require('../models/Registration');

const isDuplicateKey = (err) => err && err.code === 11000;

const exists = (eventId, email) => Registration.exists({ event: eventId, email });

async function create(eventId, { name, email }) {
  await Registration.init(); // make sure the unique index exists
  const doc = await Registration.create({ event: eventId, name, email });
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    registered_at: doc.createdAt.toISOString(),
  };
}

async function listForEvent(eventId) {
  const docs = await Registration.find({ event: eventId }).sort({ _id: 1 }).lean();
  return docs.map((d) => ({
    id: String(d._id),
    name: d.name,
    email: d.email,
    registered_at: new Date(d.createdAt).toISOString(),
  }));
}

module.exports = { isDuplicateKey, exists, create, listForEvent };