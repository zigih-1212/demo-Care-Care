# k6 load test — mixed read/write workload against the API.
#
# Models a realistic patient session: authenticate, then browse the dashboard
# (trend + summary + list) interleaved with logging a symptom. Thresholds fail
# the run, so this doubles as a performance regression gate in CI.
#
# Run:  k6 run --env BASE_URL=https://api.carecare.example.com loadtest/symptom-flow.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const trendLatency = new Trend('dashboard_trend_latency', true);

export const options = {
  scenarios: {
    // Ramp to a realistic peak, hold, then ramp down.
    patient_session: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1% errors
    http_req_duration: ['p(95)<800', 'p(99)<2000'], // p95 < 800ms
    dashboard_trend_latency: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const EMAIL = __ENV.EMAIL || 'loadtest@example.com';
const PASSWORD = __ENV.PASSWORD || 'Str0ng-Passw0rd!';

export function setup() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login/`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'login ok': (r) => r.status === 200 });
  return { token: res.json('access') };
}

function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
}

export default function (data) {
  const headers = authHeaders(data.token);

  // 1. Dashboard trend (heaviest read — SQL aggregation).
  const trend = http.get(`${BASE_URL}/api/v1/tracking/symptoms/trend/?days=30`, headers);
  trendLatency.add(trend.timings.duration);
  check(trend, { 'trend 200': (r) => r.status === 200 });

  // 2. Summary.
  const summary = http.get(`${BASE_URL}/api/v1/tracking/symptoms/summary/?days=30`, headers);
  check(summary, { 'summary 200': (r) => r.status === 200 });

  // 3. Recent entries.
  const list = http.get(`${BASE_URL}/api/v1/tracking/symptoms/`, headers);
  check(list, { 'list 200': (r) => r.status === 200 });

  // 4. Write path (~1 in 3 iterations to keep read:write realistic).
  if (Math.random() < 0.33) {
    const create = http.post(
      `${BASE_URL}/api/v1/tracking/symptoms/`,
      JSON.stringify({
        symptom_type: 'bloating',
        severity: Math.floor(Math.random() * 11),
        recorded_at: new Date().toISOString(),
      }),
      headers,
    );
    check(create, { 'create 201': (r) => r.status === 201 });
  }

  sleep(Math.random() * 2 + 1);
}
