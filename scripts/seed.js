const mongoose = require('mongoose');
const { connectDb } = require('../src/db');
const { Event } = require('../src/models/Event');

const at = (days, hours = 0) => new Date(Date.now() + days * 86400000 + hours * 3600000);

(async () => {
  await connectDb();
  if (await Event.countDocuments()) {
    console.log('Events already exist, skipping seed.');
  } else {
    await Event.insertMany([
      { title: 'Milan Hack Night', description: 'Build something in 6 hours.', category: 'tech', startDateTime: at(7), venue: 'Main Auditorium', capacity: 100 },
      { title: 'Open Mic Evening', description: 'Bring your voice or your guitar.', category: 'music', startDateTime: at(10, 2), venue: 'Amphitheatre', capacity: 50 },
      { title: 'Inter-Dept Football', description: 'Knockout tournament.', category: 'sports', startDateTime: at(14), venue: 'Sports Ground', capacity: 200 },
      { title: 'Street Food Fest', description: 'Stalls from around the city.', category: 'food', startDateTime: at(20, 4), venue: 'Central Lawn', capacity: 3 },
      { title: 'Startup Pitch Day', description: 'Pitch to real investors.', category: 'business', startDateTime: at(25, 1), venue: 'Seminar Hall', capacity: 40 },
    ]);
    console.log('Seeded 5 events.');
  }
  await mongoose.disconnect();
})();