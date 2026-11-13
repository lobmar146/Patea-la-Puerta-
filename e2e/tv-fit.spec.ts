// La vista TV entra entera (sin scroll) en las resoluciones típicas de los navegadores de las teles.
import { expect, test, type Page } from '@playwright/test';
import { BASE, startServer, stopServer } from './server';

test.beforeAll(startServer);
test.afterAll(stopServer);

const OUT = process.env.TOUR_OUT ?? 'test-results/tour';

async function inView(page: Page, testId: string) {
  const box = await page.getByTestId(testId).boundingBox();
  const vp = page.viewportSize()!;
  expect(box, testId).not.toBeNull();
  expect(box!.y + box!.height, `${testId} dentro de la pantalla`).toBeLessThanOrEqual(vp.height + 1);
  expect(box!.x + box!.width, `${testId} dentro de la pantalla`).toBeLessThanOrEqual(vp.width + 1);
}

test('vista TV en combate a 960×540, 1280×720 y 1920×1080', async ({ browser }) => {
  const dmCtx = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 900 } });
  const dm = await dmCtx.newPage();
  await dm.goto('/?modo=crear');
  await dm.getByLabel('Tu nombre').fill('Gordo Tuerto');
  await dm.locator('label', { hasText: 'Hombre' }).click();
  await dm.getByRole('button', { name: 'Crear partida' }).click();
  const code = (await dm.getByTestId('lobby-code').textContent())!.trim();
  for (const name of ['Pablo', 'Lu', 'Sofi', 'Nico']) {
    const c = await browser.newContext({ baseURL: BASE });
    const p = await c.newPage();
    await p.goto(`/s/${code}`);
    await p.getByLabel('Tu nombre').fill(name);
    await p.locator('label', { hasText: 'Jugador' }).click();
    await p.locator('label', { hasText: 'Mujer' }).click();
    await p.getByRole('button', { name: 'Entrar' }).click();
    await expect(p.getByTestId('room-code')).toBeVisible();
    await c.close();
  }
  await dm.getByTestId('start-game').click();
  await dm.getByRole('button', { name: /Patear la puerta/ }).click();
  await dm.getByRole('button', { name: /Qué salió detrás de la puerta/ }).click();
  await dm.getByRole('button', { name: /Monstruo/ }).click();
  await dm.getByTestId('monster-strength').fill('6');
  await dm.getByRole('button', { name: 'Entrar en combate' }).click();

  for (const [w, h] of [[960, 540], [1280, 720], [1920, 1080]] as const) {
    const c = await browser.newContext({ baseURL: BASE, viewport: { width: w, height: h } });
    await c.addInitScript(() => localStorage.setItem('pp-theme', 'dark'));
    const tv = await c.newPage();
    await tv.goto(`/s/${code}/tv`);
    await tv.getByLabel('Tu nombre').fill(`Tele ${w}`);
    await tv.getByRole('button', { name: 'Entrar' }).click();
    await expect(tv.getByTestId('tv-combat')).toBeVisible();
    for (const id of ['tv-active', 'tv-combat', 'tv-table', 'tv-code']) await inView(tv, id);
    const scroll = await tv.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(scroll).toBeLessThanOrEqual(1);
    await tv.waitForTimeout(300);
    await tv.screenshot({ path: `${OUT}/tv-${w}x${h}.png` });
    await c.close();
  }
  await dmCtx.close();
});
