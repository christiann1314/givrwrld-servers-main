import 'dotenv/config';
import jwt from 'jsonwebtoken';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const USER_ID = process.env.SMOKE_TEST_USER_ID || '5a4cd8e9-0cd3-11f1-bc67-5e48fe056a68';
const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-jwt-secret-change-in-production';

async function main() {
  const token = jwt.sign({ userId: USER_ID }, JWT_SECRET, { expiresIn: '1h' });

  const body = {
    plan_id: 'among-us-2gb',
    item_type: 'game',
    term: 'monthly',
    region: 'us-east',
    server_name: 'smoke-test-api',
  };

  const res = await fetch(`${API_URL}/api/checkout/create-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

main().catch((err) => {
  console.error('Smoke checkout error:', err);
  process.exit(1);
});

