// En el celular, las opciones rápidas de cada fase se ven sin scrollear.
import { expect, test, type Page } from '@playwright/test';
import { BASE, startServer, stopServer } from './server';

test.beforeAll(startServer);
test.afterAll(stopServer);

const OUT = process.env.TOUR_OUT ?? 'test-results/tour';
const PHONE = { width: 390, height: 700 }; // alto útil típico con las barras del navegador

async function inView(page: Page, testId: string) {
  const box = await page.getByTestId(testId).boundingBox();
  expect(box, testId).not.toBeNull();
  expect(box!.y, `${testId} arranca dentro de la pantalla`).toBeGreaterThanOrEqual(0);
  // La barra de pestañas de abajo mide ~72 px: lo importante tiene que quedar arriba de ella.
  expect(box!.y + Math.min(box!.height, 56), `${testId} visible sin scrollear`).toBeLessThanOrEqual(PHONE.height - 72);
}

test('opciones rápidas sin scroll en cada fase', async ({ browser }) => {
  const dmCtx = await browser.newContext({ baseURL: BASE, viewport: PHONE, hasTouch: true });
  await dmCtx.addInitScript(() => localStorage.setItem('pp-theme', 'dark'));
  const dm = await dmCtx.newPage();
  await dm.goto('/?modo=crear');
  await dm.getByLabel('Tu nombre').fill('Martín');
  await dm.locator('label', { hasText: 'Hombre' }).click();
  await dm.getByRole('button', { name: 'Crear partida' }).click();
  const code = (await dm.getByTestId('lobby-code').textContent())!.trim();
  const pCtx = await browser.newContext({ baseURL: BASE, viewport: PHONE, hasTouch: true });
  await pCtx.addInitScript(() => localStorage.setItem('pp-theme', 'dark'));
  const p1 = await pCtx.newPage();
  await p1.goto(`/s/${code}`);
  await p1.getByLabel('Tu nombre').fill('Pablo');
  await p1.locator('label', { hasText: 'Jugador' }).click();
  await p1.locator('label', { hasText: 'Mujer' }).click();
  await p1.getByRole('button', { name: 'Entrar' }).click();
  await expect(p1.getByTestId('room-code')).toBeVisible();
  await dm.getByTestId('start-game').click();

  // Preparación y puerta: la acción del turno está fija sobre la barra de abajo.
  await expect(dm.getByTestId('phase-title')).toHaveText('Preparación del turno');
  await inView(dm, 'turn-action');
  await dm.getByRole('button', { name: /Patear la puerta/ }).click();
  await inView(dm, 'turn-action');
  await dm.getByRole('button', { name: /Qué salió detrás de la puerta/ }).click();
  await dm.getByRole('button', { name: /Monstruo/ }).click();
  await dm.getByTestId('monster-strength').fill('6');
  await dm.getByRole('button', { name: 'Entrar en combate' }).click();

  // Combate: quien pelea ve "Resolver combate" y el resto "Jugar una carta", sin scrollear.
  const skip = dm.getByRole('button', { name: 'Seguir sin ayuda por ahora' });
  await expect(skip).toBeVisible();
  await skip.click();
  await expect(dm.getByTestId('combat-quick')).toBeVisible();
  await expect(dm.getByTestId('losing-alert')).toHaveCount(0);
  await inView(dm, 'combat-quick');
  await dm.waitForTimeout(300);
  await dm.screenshot({ path: `${OUT}/celu-combate-dm.png` });
  await expect(p1.getByTestId('combat-quick')).toContainText('Jugar una carta');
  await inView(p1, 'combat-quick');
  await p1.waitForTimeout(300);
  await p1.screenshot({ path: `${OUT}/celu-combate-jugador.png` });

  // Después del combate vuelve la acción fija.
  await dm.getByTestId('combat-quick').getByRole('button', { name: 'Victoria' }).click();
  await dm.getByTestId('victory-form').getByRole('button', { name: /Registrar|Confirmar/ }).first().click();
  await expect(dm.getByTestId('turn-action')).toBeVisible();
  await inView(dm, 'turn-action');
  await dm.screenshot({ path: `${OUT}/celu-despues.png` });

  await dmCtx.close();
  await pCtx.close();
});
