import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { validateSignup } from '../src/validators/auth.validator.js';

const credentials = {
  email: 'signup-region-test@example.com',
  password: 'password123',
  nickname: '지역검증',
};

test('optional region fields accept missing, empty, null and free-text names', () => {
  for (const region of [
    {},
    { regionName: '' },
    { regionName: '   ' },
    { regionName: null },
    { regionName: '서울 강남구 역삼동' },
    { regionName: '다른 동네 123' },
    { regionName: '123' },
    { regionId: '' },
    { regionId: '   ' },
    { regionId: null },
    { regionId: ' 25 ' },
    { regionId: '', regionName: '역삼동' },
  ]) {
    assert.deepEqual(validateSignup({ ...credentials, ...region }), {}, JSON.stringify(region));
  }
});

test('provided region IDs still reject invalid types, zero and bigint overflow', () => {
  for (const regionId of ['0', '-1', '1.2', '역삼동', '9223372036854775808', 25, {}, false]) {
    assert.ok(validateSignup({ ...credentials, regionId }).regionId, JSON.stringify(regionId));
  }
  assert.deepEqual(validateSignup({ ...credentials, regionId: '9223372036854775807' }), {});
});

test('region names retain length and type validation', () => {
  for (const regionName of ['가'.repeat(101), 25, [], {}]) {
    assert.ok(validateSignup({ ...credentials, regionName }).regionName);
  }
  assert.deepEqual(validateSignup({ ...credentials, regionName: '가'.repeat(100) }), {});
});

test('signup API stores empty regions as null and names independently of region IDs', async () => {
  const [{ default: env }, { default: pool }, { default: app }] = await Promise.all([
    import('../src/config/env.js'),
    import('../src/config/database.js'),
    import('../src/app.js'),
  ]);
  const originalDatabaseUrl = env.databaseUrl;
  const originalQuery = Object.getOwnPropertyDescriptor(pool, 'query');
  const inserted: unknown[][] = [];
  // Replace the DB boundary so the test never changes local users or a real database.
  env.databaseUrl = 'postgresql://test-only';
  Object.defineProperty(pool, 'query', {
    configurable: true,
    value: async (sql: string, values: unknown[]) => {
      if (sql.includes('INSERT INTO public.users')) {
        inserted.push(values);
        return { rows: [{
          id: String(inserted.length), email: values[0], nickname: values[2],
          regionId: values[3], regionName: values[4],
        }] };
      }
      if (sql.includes('FROM public.users')) return { rows: [] };
      throw new Error('Unexpected test query');
    },
  });
  const server = createServer(app);
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/api/v1/auth/signup`;
    const cases = [
      { input: {}, id: null, name: null },
      { input: { regionId: '', regionName: '' }, id: null, name: null },
      { input: { regionId: '  ', regionName: '   ' }, id: null, name: null },
      { input: { regionId: null, regionName: null }, id: null, name: null },
      { input: { regionName: '  서울 강남구 역삼동  ' }, id: null, name: '서울 강남구 역삼동' },
      { input: { regionName: '다른 값 123' }, id: null, name: '다른 값 123' },
      { input: { regionId: ' 25 ', regionName: '동네명' }, id: '25', name: '동네명' },
    ];
    for (const item of cases) {
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, ...item.input }),
      });
      const result = await response.json();
      assert.equal(response.status, 201, JSON.stringify(result));
      assert.equal(result.data.user.regionId, item.id);
      assert.equal(result.data.user.regionName, item.name);
      assert.equal(inserted.at(-1)?.[3], item.id);
      assert.equal(inserted.at(-1)?.[4], item.name);
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    env.databaseUrl = originalDatabaseUrl;
    if (originalQuery) Object.defineProperty(pool, 'query', originalQuery);
    else Reflect.deleteProperty(pool, 'query');
  }
});
