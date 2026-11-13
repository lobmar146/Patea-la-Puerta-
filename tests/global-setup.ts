import { execSync } from 'node:child_process';

/** Aplica las migraciones a la base de prueba antes de correr las pruebas. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://munchkin:munchkin@localhost:5432/patea_test?schema=public';
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
}
