import { defineConfig } from 'vitest/config';

// Las pruebas de integración usan una base PostgreSQL REAL de prueba (no mocks).
const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://munchkin:munchkin@localhost:5432/patea_test?schema=public';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: { DATABASE_URL: TEST_DB },
    globalSetup: ['tests/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
