const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  },
  { timestamps: true }
);

registrationSchema.index({ event: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);