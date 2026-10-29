const { Event } = require('../models/Event');

function toEvent(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    category: doc.category,
    start_datetime: new Date(doc.startDateTime).toISOString(),
    venue: doc.venue,
    capacity: doc.capacity,
    registered_count: doc.registeredCount,
    spots_left: Math.max(doc.capacity - doc.registeredCount, 0),
    created_at: new Date(doc.createdAt).toISOString(),
  };
}

async function create(data) {
  const doc = await Event.create({
    title: data.title,
    description: data.description,
    category: data.category,
    startDateTime: new Date(data.start_datetime),
    venue: data.venue,
    capacity: data.capacity,
  });
  return toEvent(doc.toObject());
}

async function findById(id) {
  const doc = await Event.findById(id).lean();
  return doc ? toEvent(doc) : null;
}

async function list({ category, upcoming, limit, offset }) {
  const filter = {};
  if (category) filter.category = category;
  if (upcoming) filter.startDateTime = { $gte: new Date() };

  const [docs, total] = await Promise.all([
    Event.find(filter).sort({ startDateTime: 1, _id: 1 }).skip(offset).limit(limit).lean(),
    Event.countDocuments(filter),
  ]);
  return { items: docs.map(toEvent), total };
}

// Atomic: only succeeds while the event has not started and is not full.
async function claimSpot(id) {
  const doc = await Event.findOneAndUpdate(
    {
      _id: id,
      startDateTime: { $gt: new Date() },
      $expr: { $lt: ['$registeredCount', '$capacity'] },
    },
    { $inc: { registeredCount: 1 } },
    { new: true }
  ).lean();
  return doc ? toEvent(doc) : null;
}

async function releaseSpot(id) {
  await Event.updateOne({ _id: id, registeredCount: { $gt: 0 } }, { $inc: { registeredCount: -1 } });
}

module.exports = { create, findById, list, claimSpot, releaseSpot };