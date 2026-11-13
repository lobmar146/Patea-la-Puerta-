import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://munchkin:munchkin@localhost:5432/patea_test?schema=public';
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
  if (!existsSync('dist/server/server/index.js') || !existsSync('dist/client/index.html')) {
    throw new Error('Falta el build: ejecutá `npm run build` antes de `npm run test:e2e`.');
  }
}
