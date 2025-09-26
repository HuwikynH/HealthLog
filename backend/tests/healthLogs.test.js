const request = require('supertest');
const { start } = require('./setup');
const { app } = require('../index');
const mongoose = require('mongoose');
const HealthLog = require('../models/HealthLog');

let server;

beforeAll(async () => {
  server = await start();
});

afterAll(async () => {
  await require('./setup').stop();
});

beforeEach(async () => {
  // clear collection
  await HealthLog.deleteMany({});
});

test('POST /api/health-logs creates a health log (happy path)', async () => {
  const payload = {
    activityType: 'heart_rate',
    value: 72,
    unit: 'bpm',
    occurredAt: new Date().toISOString(),
  };

  const res = await request(app).post('/api/health-logs').send(payload).expect(201);
  expect(res.body).toHaveProperty('_id');
  expect(res.body.activityType).toBe('heart_rate');
  expect(res.body.value).toBe(72);
});

test('POST /api/health-logs returns validation error for invalid payload', async () => {
  const payload = {
    activityType: '',
    value: 'not-a-number',
  };

  const res = await request(app).post('/api/health-logs').send(payload).expect(400);
  expect(res.body).toHaveProperty('fieldErrors');
  expect(res.body.fieldErrors).toHaveProperty('activityType');
  expect(res.body.fieldErrors).toHaveProperty('value');
});

test('GET /api/health-logs returns list and supports pagination', async () => {
  // create multiple logs
  for (let i = 0; i < 5; i++) {
    await request(app).post('/api/health-logs').send({
      activityType: 'steps',
      value: 100 + i,
      unit: 'steps',
      occurredAt: new Date().toISOString(),
    }).expect(201);
  }

  const res = await request(app).get('/api/health-logs').query({ page: 1, limit: 3 }).expect(200);
  expect(res.body).toHaveProperty('items');
  expect(res.body.items.length).toBeLessThanOrEqual(3);
  expect(res.body).toHaveProperty('total');
});

test('GET /api/health-logs/:id returns item, PUT updates it, DELETE removes it', async () => {
  const payload = {
    activityType: 'calories',
    value: 250,
    unit: 'kcal',
    occurredAt: new Date().toISOString(),
  };

  const created = await request(app).post('/api/health-logs').send(payload).expect(201);
  const id = created.body._id;

  // GET by id
  const getRes = await request(app).get(`/api/health-logs/${id}`).expect(200);
  expect(getRes.body._id).toBe(id);

  // PUT update
  const upd = { value: 300 };
  const putRes = await request(app).put(`/api/health-logs/${id}`).send(upd).expect(200);
  expect(putRes.body.value).toBe(300);

  // DELETE
  await request(app).delete(`/api/health-logs/${id}`).expect(200);
  await request(app).get(`/api/health-logs/${id}`).expect(404);
});

test('GET /api/health-logs/stats/monthly returns aggregated stats', async () => {
  // create entries for specific month
  const year = 2025;
  const month = 9; // September
  // dates in September
  const dates = ['2025-09-05T10:00:00Z', '2025-09-10T12:00:00Z', '2025-09-15T08:00:00Z'];
  await HealthLog.deleteMany({});
  await Promise.all([
    HealthLog.create({ activityType: 'heart_rate', value: 60, unit: 'bpm', occurredAt: new Date(dates[0]) }),
    HealthLog.create({ activityType: 'calories', value: 200, unit: 'kcal', occurredAt: new Date(dates[1]) }),
    HealthLog.create({ activityType: 'heart_rate', value: 70, unit: 'bpm', occurredAt: new Date(dates[2]) }),
  ]);

  const res = await request(app).get('/api/health-logs/stats/monthly').query({ year, month }).expect(200);
  expect(res.body).toHaveProperty('stats');
  // stats should include heart_rate and calories
  const types = res.body.stats.map(s => s.activityType);
  expect(types).toEqual(expect.arrayContaining(['heart_rate', 'calories']));
});
