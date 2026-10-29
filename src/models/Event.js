const mongoose = require('mongoose');

const CATEGORIES = ['tech', 'music', 'sports', 'arts', 'food', 'business', 'education', 'other'];

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, required: true, enum: CATEGORIES, lowercase: true, index: true },
    startDateTime: { type: Date, required: true, index: true },
    venue: { type: String, required: true, trim: true, maxlength: 200 },
    capacity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    registeredCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = { Event: mongoose.model('Event', eventSchema), CATEGORIES };