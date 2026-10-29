const mongoose = require('mongoose');
const config = require('./config');

let cached = global.__mongoose;
if (!cached) cached = global.__mongoose = { promise: null };

async function connectDb() {
  if (!config.mongoUri) throw new Error('MONGODB_URI is not set');
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(config.mongoUri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }
  await cached.promise;
  return mongoose;
}

module.exports = { connectDb };