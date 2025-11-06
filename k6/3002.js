import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  iterations: 10,
};

export default function () {
  const res = http.post(
    'http://localhost:3002/product/5/deduct',
    JSON.stringify({ quantity: 1 }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  check(res, {
    'is status 201': (r) => r.status === 201,
  });
}
