import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import 'dotenv/config';

/**
 * Once per test run: create the test database if it doesn't exist and apply any new migrations.
 * Nothing here deletes data; each test empties the tables it uses (see resetDb in helpers.ts).
 */
export default async function globalSetup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'Set TEST_DATABASE_URL (see .env.example) before running the end-to-end tests.',
    );
  }

  const target = new URL(url);
  const dbName = target.pathname.slice(1);
  const server = new URL(url);
  server.pathname = '/postgres';

  const admin = new PrismaClient({ datasourceUrl: server.toString() });
  try {
    const exists = await admin.$queryRaw<
      unknown[]
    >`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (exists.length === 0) {
      await admin.$executeRawUnsafe(
        `CREATE DATABASE "${dbName.replace(/"/g, '')}"`,
      );
    }
  } finally {
    await admin.$disconnect();
  }

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });
}
