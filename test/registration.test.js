const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, teardown, createEvent, ADMIN } = require('./helpers');

describe('registration', () => {
  let ctx;
  before(async () => { ctx = await setup(); });
  after(() => teardown(ctx));

  const reg = (id, body) => ctx.api.post(`/api/events/${id}/register`).send(body);
  const person = (n) => ({ name: `Person ${n}`, email: `p${n}@example.com` });

  test('201 and counters update', async () => {
    const ev = await createEvent(ctx.api, { capacity: 3 });
    const res = await reg(ev.id, person(1));
    assert.equal(res.status, 201);
    assert.equal(res.body.data.participant.email, 'p1@example.com');
    assert.equal(res.body.data.spots_left, 2);

    const detail = await ctx.api.get(`/api/events/${ev.id}`);
    assert.equal(detail.body.data.registered_count, 1);
    assert.equal(detail.body.data.spots_left, 2);
  });

  test('409 ALREADY_REGISTERED for the same email (case and spaces ignored)', async () => {
    const ev = await createEvent(ctx.api, { capacity: 5 });
    await reg(ev.id, person(2));
    const res = await reg(ev.id, { name: 'Again', email: ' P2@Example.com ' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'ALREADY_REGISTERED');
    const detail = await ctx.api.get(`/api/events/${ev.id}`);
    assert.equal(detail.body.data.registered_count, 1);
  });

  test('same person can register for different events', async () => {
    const a = await createEvent(ctx.api);
    const b = await createEvent(ctx.api);
    assert.equal((await reg(a.id, person(3))).status, 201);
    assert.equal((await reg(b.id, person(3))).status, 201);
  });

  test('409 EVENT_FULL when capacity is reached', async () => {
    const ev = await createEvent(ctx.api, { capacity: 1 });
    assert.equal((await reg(ev.id, person(4))).status, 201);
    const res = await reg(ev.id, person(5));
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'EVENT_FULL');
  });

  test('409 EVENT_CLOSED for events that already started', async () => {
    const { Event } = require('../src/models/Event');
    const past = await Event.create({
      title: 'Past', description: 'x', category: 'tech',
      startDateTime: new Date('2020-01-01T00:00:00Z'), venue: 'v', capacity: 5,
    });
    const res = await reg(String(past._id), person(6));
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'EVENT_CLOSED');
  });

  test('404 for unknown event', async () => {
    const res = await reg('000000000000000000000000', person(7));
    assert.equal(res.status, 404);
  });

  test('400 for malformed id', async () => {
    const res = await reg('abc', person(7));
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'INVALID_ID');
  });

  test('400 for missing and invalid fields', async () => {
    const ev = await createEvent(ctx.api);
    const missing = await reg(ev.id, {});
    assert.equal(missing.status, 400);
    assert.ok(missing.body.error.details.name && missing.body.error.details.email);

    const badEmail = await reg(ev.id, { name: 'X', email: 'not-an-email' });
    assert.equal(badEmail.status, 400);
    assert.ok(badEmail.body.error.details.email);
  });

  test('concurrent requests never exceed capacity', async () => {
    const ev = await createEvent(ctx.api, { capacity: 2 });
    const results = await Promise.all([10, 11, 12, 13, 14, 15].map((n) => reg(ev.id, person(n))));
    assert.equal(results.filter((r) => r.status === 201).length, 2);
    assert.equal(
      results.filter((r) => r.status === 409 && r.body.error.code === 'EVENT_FULL').length, 4
    );
    const detail = await ctx.api.get(`/api/events/${ev.id}`);
    assert.equal(detail.body.data.registered_count, 2);
  });

  test('concurrent duplicates: one wins and the counter stays correct', async () => {
    const ev = await createEvent(ctx.api, { capacity: 5 });
    const results = await Promise.all([1, 2, 3].map(() => reg(ev.id, person(30))));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.equal(results.filter((r) => r.status === 409).length, 2);
    const detail = await ctx.api.get(`/api/events/${ev.id}`);
    assert.equal(detail.body.data.registered_count, 1);
  });

  test('registrations list requires admin and shows registrants', async () => {
    const ev = await createEvent(ctx.api, { capacity: 5 });
    await reg(ev.id, person(20));
    assert.equal((await ctx.api.get(`/api/events/${ev.id}/registrations`)).status, 401);
    const res = await ctx.api.get(`/api/events/${ev.id}/registrations`).set(ADMIN);
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 1);
    assert.equal(res.body.data[0].email, 'p20@example.com');
  });
});