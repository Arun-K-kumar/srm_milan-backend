const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, validEvent, createEvent, ADMIN } = require('./helpers');

describe('events', () => {
  let ctx;
  before(async () => { ctx = await setup(); });
  after(() => teardown(ctx));

  test('GET /api/health returns 200', async () => {
    const res = await ctx.api.get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.database, 'connected');
  });

  describe('create', () => {
    test('201 with created event', async () => {
      const res = await ctx.api.post('/api/events').set(ADMIN).send(validEvent());
      assert.equal(res.status, 201);
      assert.match(res.headers.location, /^\/api\/events\/[0-9a-f]{24}$/);
      assert.equal(res.body.data.title, 'Milan Hack Night');
      assert.equal(res.body.data.registered_count, 0);
      assert.equal(res.body.data.spots_left, 2);
    });

    test('401 without API key', async () => {
      const res = await ctx.api.post('/api/events').send(validEvent());
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    test('403 with wrong API key', async () => {
      const res = await ctx.api.post('/api/events').set('X-API-Key', 'nope').send(validEvent());
      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    });

    test('400 lists every missing field', async () => {
      const res = await ctx.api.post('/api/events').set(ADMIN).send({});
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
      for (const f of ['title', 'description', 'category', 'start_datetime', 'venue', 'capacity']) {
        assert.ok(res.body.error.details[f], `expected error for ${f}`);
      }
    });

    for (const [name, patch, field] of [
      ['capacity of 0', { capacity: 0 }, 'capacity'],
      ['non-integer capacity', { capacity: 2.5 }, 'capacity'],
      ['string capacity', { capacity: '10' }, 'capacity'],
      ['past start date', { start_datetime: '2020-01-01T00:00:00Z' }, 'start_datetime'],
      ['bad date format', { start_datetime: 'tomorrow' }, 'start_datetime'],
      ['unknown category', { category: 'karaoke' }, 'category'],
      ['blank title', { title: '   ' }, 'title'],
    ]) {
      test(`400 for ${name}`, async () => {
        const res = await ctx.api.post('/api/events').set(ADMIN).send(validEvent(patch));
        assert.equal(res.status, 400);
        assert.ok(res.body.error.details[field]);
      });
    }

    test('400 for unknown fields', async () => {
      const res = await ctx.api.post('/api/events').set(ADMIN).send({ ...validEvent(), hacker: true });
      assert.equal(res.status, 400);
    });

    test('400 for malformed JSON', async () => {
      const res = await ctx.api
        .post('/api/events').set(ADMIN).set('Content-Type', 'application/json').send('{bad');
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'INVALID_JSON');
    });
  });

  describe('read', () => {
    test('GET by id returns the event', async () => {
      const ev = await createEvent(ctx.api, { title: 'Read Me' });
      const res = await ctx.api.get(`/api/events/${ev.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.title, 'Read Me');
    });

    test('404 for unknown id', async () => {
      const res = await ctx.api.get('/api/events/000000000000000000000000');
      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'NOT_FOUND');
    });

    test('400 for malformed id', async () => {
      const res = await ctx.api.get('/api/events/abc');
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'INVALID_ID');
    });

    test('unknown route gives a JSON 404', async () => {
      const res = await ctx.api.get('/api/nothing');
      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'ROUTE_NOT_FOUND');
    });
  });

  describe('list and filter', () => {
    before(async () => {
      await createEvent(ctx.api, { title: 'Music One', category: 'music' });
      await createEvent(ctx.api, { title: 'Music Two', category: 'music' });
      await createEvent(ctx.api, { title: 'Sports One', category: 'sports' });
      const { Event } = require('../src/models/Event');
      await Event.create({
        title: 'Old Music', description: 'x', category: 'music',
        startDateTime: new Date('2020-01-01T00:00:00Z'), venue: 'v', capacity: 5,
      });
    });

    test('lists events with pagination meta', async () => {
      const res = await ctx.api.get('/api/events?limit=2&page=1');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 2);
      assert.ok(res.body.meta.total >= 4);
      assert.equal(res.body.meta.limit, 2);
    });

    test('filters by category (case-insensitive)', async () => {
      const res = await ctx.api.get('/api/events?category=MUSIC');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length >= 3);
      assert.ok(res.body.data.every((e) => e.category === 'music'));
    });

    test('upcoming=true hides past events', async () => {
      const res = await ctx.api.get('/api/events?category=music&upcoming=true');
      assert.ok(res.body.data.every((e) => e.title !== 'Old Music'));
    });

    test('400 for unknown category filter', async () => {
      const res = await ctx.api.get('/api/events?category=karaoke');
      assert.equal(res.status, 400);
      assert.ok(res.body.error.details.category);
    });

    test('400 for invalid pagination', async () => {
      const res = await ctx.api.get('/api/events?limit=1000');
      assert.equal(res.status, 400);
    });
  });
});