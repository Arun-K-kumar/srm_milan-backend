process.env.NODE_ENV = 'test';
process.env.ADMIN_API_KEY = 'test-key';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function setup() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('milan_test');
  const { createApp } = require('../src/app');
  return { api: request(createApp()), mongod };
}

async function teardown(ctx) {
  await mongoose.disconnect();
  await ctx.mongod.stop();
}

const future = (days = 7) => new Date(Date.now() + days * 86400000).toISOString();

const validEvent = (overrides = {}) => ({
  title: 'Milan Hack Night',
  description: 'Build something cool.',
  category: 'tech',
  start_datetime: future(),
  venue: 'Main Auditorium',
  capacity: 2,
  ...overrides,
});

const ADMIN = { 'X-API-Key': 'test-key' };

async function createEvent(api, overrides) {
  const res = await api.post('/api/events').set(ADMIN).send(validEvent(overrides));
  return res.body.data;
}

module.exports = { setup, teardown, validEvent, createEvent, ADMIN };