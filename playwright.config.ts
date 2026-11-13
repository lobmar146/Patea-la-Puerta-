import { defineConfig } from '@playwright/test';

// Los recorridos levantan el servidor compilado (npm run build) contra la base de prueba.
// El propio test arranca y reinicia el proceso para verificar la recuperación.
export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:3300', trace: 'off', screenshot: 'only-on-failure' },
});
