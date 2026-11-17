// End-to-end tests always use the separate test database, never the dev one.
import 'dotenv/config';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'Set TEST_DATABASE_URL (see .env.example) before running the end-to-end tests.',
  );
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';
process.env.PAYMENT_WEBHOOK_SECRET ??= 'whsec_test_secret_123';
