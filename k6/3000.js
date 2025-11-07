import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 3,
  iterations: 10,
};

export default function () {
  const res = http.post(
    'http://localhost:3000/product/21/deduct',
    JSON.stringify({ quantity: 1 }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  check(res, {
    'is status 201': (r) => r.status === 201,
  });
}
