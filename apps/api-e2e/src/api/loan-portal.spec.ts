import axios from 'axios';
import {
  newSession,
  PASSWORD,
  Session,
  uniqueEmail,
  VALID_APPLICATION,
} from '../support/http';

// Needs the API on localhost and `npm run seed:admin` (or `npm run seed`) done once.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@loanportal.test';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin#Passw0rd2026';

// Registration and login are throttled to 5 requests/min/IP (FR-AUTH-6), and this
// suite spends 5 registrations and 2 logins: wait a minute between consecutive runs.
async function registerCustomer(prefix: string): Promise<Session> {
  const session = newSession();
  const res = await session.http.post('/api/auth/register', {
    email: uniqueEmail(prefix),
    password: PASSWORD,
    fullName: 'E2E Customer',
  });
  expect(res.status).toBe(201);
  return session;
}

describe('Loan portal API', () => {
  let alice: Session;
  let bob: Session;
  let admin: Session;
  let applicationId: string;

  beforeAll(async () => {
    alice = await registerCustomer('alice');
    bob = await registerCustomer('bob');

    admin = newSession();
    const login = await admin.http.post('/api/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    expect(login.status).toBe(200);
  });

  describe('authentication', () => {
    it('FR-AUTH-1/5: registration sets an httpOnly SameSite=Strict cookie that /auth/me accepts', async () => {
      expect(alice.lastSetCookie()).toMatch(/access_token=.+HttpOnly/i);
      expect(alice.lastSetCookie()).toMatch(/SameSite=Strict/i);

      const me = await alice.http.get('/api/auth/me');
      expect(me.status).toBe(200);
      expect(me.data).toMatchObject({
        role: 'CUSTOMER',
        fullName: 'E2E Customer',
      });
    });

    it('FR-AUTH-1: a duplicate email (case-insensitive) is 409', async () => {
      const email = uniqueEmail('dup');
      const body = { email, password: PASSWORD, fullName: 'Dup Test' };
      expect(
        (await newSession().http.post('/api/auth/register', body)).status,
      ).toBe(201);

      const again = await newSession().http.post('/api/auth/register', {
        ...body,
        email: email.toUpperCase(),
      });
      expect(again.status).toBe(409);
    });

    it('FR-AUTH-1: a role in the payload is rejected with 400', async () => {
      const res = await newSession().http.post('/api/auth/register', {
        email: uniqueEmail('mallory'),
        password: PASSWORD,
        fullName: 'Mallory',
        role: 'ADMIN',
      });

      expect(res.status).toBe(400);
      expect(res.data.errors).toHaveProperty('role');
    });

    it('FR-AUTH-2: a wrong password gives the generic 401', async () => {
      const res = await newSession().http.post('/api/auth/login', {
        email: ADMIN_EMAIL,
        password: 'definitely-not-the-password',
      });

      expect(res.status).toBe(401);
      expect(res.data).toEqual({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('FR-AUTH-3: protected routes answer 401 without a session and 403 for the wrong role', async () => {
      const anonymous = newSession();
      expect((await anonymous.http.get('/api/applications')).status).toBe(401);
      expect((await anonymous.http.get('/api/auth/me')).status).toBe(401);
      expect((await alice.http.get('/api/admin/applications')).status).toBe(
        403,
      );
      expect((await admin.http.get('/api/applications')).status).toBe(403);
    });
  });

  describe('loan purposes', () => {
    it('FR-LP-1: lists { code, label } for a signed-in user', async () => {
      const res = await alice.http.get('/api/loan-purposes');

      expect(res.status).toBe(200);
      expect(res.data[0]).toEqual({
        code: expect.any(String),
        label: expect.any(String),
      });
    });
  });

  describe('submitting an application', () => {
    it('NFR-REL-1 / FR-APP-1: invalid input is 400 with ApiErrorBody and per-field errors', async () => {
      const res = await alice.http.post('/api/applications', {
        ...VALID_APPLICATION,
        nric: '991332-14-1234',
        loanAmount: '150000.01',
        tenureMonths: 6,
        extra: 'not allowed',
      });

      expect(res.status).toBe(400);
      expect(res.data).toEqual({
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          nric: [expect.any(String)],
          loanAmount: [expect.any(String)],
          tenureMonths: [expect.any(String)],
          extra: [expect.any(String)],
        },
      });
    });

    it('FR-APP-3: an unknown purpose code is 400 with errors.purposeCode', async () => {
      const res = await alice.http.post('/api/applications', {
        ...VALID_APPLICATION,
        purposeCode: 'NOT_A_PURPOSE',
      });

      expect(res.status).toBe(400);
      expect(res.data.errors).toHaveProperty('purposeCode');
    });

    it('FR-APP-1 / FR-CC-1: a valid application is 201 and PENDING, stored normalised', async () => {
      const res = await alice.http.post('/api/applications', VALID_APPLICATION);

      expect(res.status).toBe(201);
      expect(res.data).toMatchObject({
        status: 'PENDING',
        nric: '900101141234',
        phone: '+60123456789',
        monthlyIncome: '4500.50',
        loanAmount: '25000.00',
        purposeLabel: expect.any(String),
        decidedAt: null,
      });
      const due =
        Date.parse(res.data.creditCheckDueAt) - Date.parse(res.data.createdAt);
      expect(due).toBeGreaterThanOrEqual(10_000);
      expect(due).toBeLessThanOrEqual(300_000);
      applicationId = res.data.id;
    });

    it('FR-APP-4: repeating an Idempotency-Key returns the original with 200', async () => {
      const headers = { 'Idempotency-Key': `e2e-${Date.now()}` };
      const first = await bob.http.post(
        '/api/applications',
        VALID_APPLICATION,
        { headers },
      );
      const replay = await bob.http.post(
        '/api/applications',
        VALID_APPLICATION,
        { headers },
      );
      const list = await bob.http.get('/api/applications');

      expect(first.status).toBe(201);
      expect(replay.status).toBe(200);
      expect(replay.data.id).toBe(first.data.id);
      expect(list.data.total).toBe(1);
    });

    it('FR-APP-4: concurrent submits with one key create exactly one application', async () => {
      const headers = { 'Idempotency-Key': `race-${Date.now()}` };

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          alice.http.post('/api/applications', VALID_APPLICATION, { headers }),
        ),
      );

      expect(new Set(results.map((r) => r.data.id)).size).toBe(1);
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      // alice owns the application from the earlier test plus this one.
      expect((await alice.http.get('/api/applications')).data.total).toBe(2);
    });
  });

  describe('viewing applications', () => {
    it('FR-VIEW-1/7: a customer lists their own, newest first, with the NRIC masked', async () => {
      const res = await alice.http.get('/api/applications?page=1&pageSize=10');

      expect(res.status).toBe(200);
      expect(res.data).toMatchObject({ page: 1, pageSize: 10, total: 2 });
      const item = res.data.items.find(
        (i: { id: string }) => i.id === applicationId,
      );
      expect(item).toMatchObject({ nricMasked: '******-**-1234' });
      expect(item).not.toHaveProperty('nric');
      const created = res.data.items.map(
        (i: { createdAt: string }) => i.createdAt,
      );
      expect(created).toEqual([...created].sort().reverse());
    });

    it('FR-VIEW-2: the owner reads the detail, with the full NRIC', async () => {
      const res = await alice.http.get(`/api/applications/${applicationId}`);

      expect(res.status).toBe(200);
      expect(res.data.nric).toBe('900101141234');
    });

    it("FR-VIEW-2 / NFR-SEC-2: another customer's application is 404, not 403", async () => {
      const res = await bob.http.get(`/api/applications/${applicationId}`);

      expect(res.status).toBe(404);
      expect(res.data.statusCode).toBe(404);
    });

    it('FR-VIEW-3/4/5: an admin lists everything, filters by status and reads any detail', async () => {
      const all = await admin.http.get('/api/admin/applications?pageSize=100');
      const pending = await admin.http.get(
        '/api/admin/applications?status=PENDING&pageSize=100',
      );
      const detail = await admin.http.get(`/api/applications/${applicationId}`);

      expect(all.status).toBe(200);
      expect(all.data.total).toBeGreaterThanOrEqual(2);
      expect(pending.status).toBe(200);
      expect(pending.data.items.map((i: { id: string }) => i.id)).toContain(
        applicationId,
      );
      for (const item of pending.data.items)
        expect(item.status).toBe('PENDING');
      expect(detail.status).toBe(200);
    });

    it('FR-VIEW-6: pageSize above 100 and unknown status values are 400', async () => {
      expect(
        (await admin.http.get('/api/admin/applications?pageSize=101')).status,
      ).toBe(400);
      expect(
        (await admin.http.get('/api/admin/applications?status=NOPE')).status,
      ).toBe(400);
    });
  });

  describe('real-time updates', () => {
    it('FR-RT-1: the event stream is text/event-stream and needs a session', async () => {
      expect(
        (await newSession().http.get('/api/applications/events')).status,
      ).toBe(401);

      const controller = new AbortController();
      const res = await alice.http.get('/api/applications/events', {
        responseType: 'stream',
        signal: controller.signal,
      });
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/event-stream/);
      controller.abort();
      res.data.destroy();
    });
  });

  describe('operations', () => {
    it('GET /health is public and reports the database and Redis', async () => {
      const res = await axios.get('/api/health');

      expect(res.status).toBe(200);
      expect(res.data.checks).toEqual({ database: 'up', redis: 'up' });
    });

    it('FR-AUTH-2: logout clears the cookie', async () => {
      const res = await bob.http.post('/api/auth/logout');

      expect(res.status).toBe(204);
      expect(bob.lastSetCookie()).toMatch(/access_token=;/);
    });
  });
});
