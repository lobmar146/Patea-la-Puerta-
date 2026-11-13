// Recorrido de capturas para revisar el diseño (no es una prueba funcional).
// Uso: npm run build && npm run tour  -> test-results/tour/{dark,light}-*.png
import { expect, test, type Page } from '@playwright/test';
import { startServer, stopServer } from './server';

const OUT = process.env.TOUR_OUT ?? 'test-results/tour';
test.setTimeout(60000);
test.skip(!process.env.TOUR, 'Solo con npm run tour.');
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
test.beforeAll(startServer);
test.afterAll(stopServer);
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name, exact: true }).click();
async function join(page: Page, code: string, name: string, role: string, tv = false) {
  await page.goto(`/s/${code}${tv ? '/tv' : ''}`);
  await page.getByLabel('Tu nombre').fill(name);
  await page.locator('label', { hasText: role }).click();
  if (role === 'Jugador') await page.locator('label', { hasText: 'Mujer' }).click();
  await page.getByRole('button', { name: 'Entrar' }).click();
}
const shot = async (page: Page, name: string, full = false) => { await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); };

for (const theme of ['dark', 'light'] as const) {
  test(`tour ${theme}`, async ({ browser }) => {
    const mk = async (opts: object) => {
      const c = await browser.newContext({ baseURL: 'http://localhost:3300', ...opts });
      await c.addInitScript((t) => localStorage.setItem('pp-theme', t), theme);
      return c.newPage();
    };
    const dm = await mk({ viewport: { width: 1280, height: 900 } });
    const p1 = await mk(PHONE);
    const p2 = await mk(PHONE);
    const tv = await mk({ viewport: { width: 1920, height: 1080 } });
    await p1.goto('/');
    await shot(p1, `${theme}-01-home`, true);
    await p1.getByTestId('home-create').click();
    await shot(p1, `${theme}-01b-home-create`, true);
    await dm.goto('/?modo=crear');
    await dm.getByLabel('Tu nombre').fill('Dana');
    await dm.locator('label', { hasText: 'Hombre' }).click();
    await dm.getByRole('button', { name: 'Crear partida' }).click();
    const code = (await dm.getByTestId('lobby-code').textContent())!.trim();
    await p1.goto(`/s/${code}`);
    await shot(p1, `${theme}-02-join`, true);
    await p1.getByLabel('Tu nombre').fill('Pablo');
    await p1.locator('label', { hasText: 'Jugador' }).click();
    await p1.locator('label', { hasText: 'Mujer' }).click();
    await p1.getByRole('button', { name: 'Entrar' }).click();
    await join(p2, code, 'Lu', 'Jugador');
    await join(tv, code, 'Pantalla', 'Espectador', true);
    await expect(dm.getByTestId('order-list').locator('li')).toHaveCount(3);
    await shot(p1, `${theme}-03-lobby`, true);
    await tab(p1, 'Mi personaje');
    await shot(p1, `${theme}-04-personaje`, true);
    await tab(dm, 'Sala');
    await dm.getByTestId('start-game').click();
    await tab(p1, 'Turno');
    await shot(p1, `${theme}-05-turno-espera`, true);
    await tab(dm, 'Turno');
    await dm.getByRole('button', { name: /Patear la puerta/ }).click();
    await dm.getByRole('button', { name: /Qué salió detrás de la puerta/ }).click();
    await shot(dm, `${theme}-06-dm-modal-puerta`);
    await dm.getByRole('button', { name: /Monstruo/ }).click();
    await dm.getByTestId('monster-strength').fill('6');
    await dm.getByRole('button', { name: 'Entrar en combate' }).click();
    await dm.getByText('Seguir sin ayuda por ahora').click();
    await shot(dm, `${theme}-07-dm-combate`, true);
    await tab(p1, 'Turno');
    await shot(p1, `${theme}-08-combate-otro`, true);
    await tab(p1, 'Mesa');
    await shot(p1, `${theme}-09-mesa`, true);
    await tab(dm, 'DM');
    await shot(dm, `${theme}-10-dm`, true);
    await shot(tv, `${theme}-11-tv`);
    // Reacciones, victoria y podio.
    await tab(p1, 'Turno');
    await p1.getByTestId('reaction-fab').click();
    for (const e of ['🔥', '😂', '🐔']) {
      await p1.getByTestId('reaction-bar').getByRole('button', { name: `Reaccionar con ${e}` }).click();
      await p1.waitForTimeout(700);
    }
    await p1.waitForTimeout(100);
    await p1.screenshot({ path: `${OUT}/${theme}-12-reacciones.png` });
    await tab(dm, 'Turno');
    await dm.getByRole('button', { name: 'Victoria', exact: true }).click();
    await dm.getByTestId('victory-form').getByRole('button', { name: 'Confirmar victoria' }).click();
    await tab(dm, 'DM');
    await dm.getByRole('button', { name: 'Terminar partida' }).click();
    await dm.locator('#winner').selectOption({ label: 'Dana' });
    await dm.getByRole('button', { name: 'Confirmar fin' }).click();
    await expect(p1.getByTestId('finished')).toBeVisible();
    await p1.waitForTimeout(1600);
    await shot(p1, `${theme}-13-podio`, true);
    await tv.waitForTimeout(1600);
    await shot(tv, `${theme}-14-tv-podio`);
  });
}

test('tour novato', async ({ browser }) => {
  const c = await browser.newContext({ baseURL: 'http://localhost:3300', ...PHONE });
  await c.addInitScript(() => localStorage.setItem('pp-theme', 'dark'));
  const page = await c.newPage();
  const go = (name: string) => tab(page, name);
  await page.goto('/?modo=practica');
  await shot(page, 'novato-01-practica', true);
  await page.getByLabel('Tu nombre').fill('Nova');
  await page.locator('label', { hasText: 'Hombre' }).click();
  await page.getByRole('button', { name: 'Empezar práctica' }).click();
  await expect(page.getByTestId('coach')).toBeVisible();
  await shot(page, 'novato-02-turno');
  await page.getByTestId('what-can-i-do').click();
  await shot(page, 'novato-03-que-hago');
  await page.getByRole('button', { name: 'Vender objetos' }).click();
  for (const v of ['+500', '+400', '+300']) await page.getByRole('button', { name: v }).click();
  await shot(page, 'novato-04-venta');
  await page.keyboard.press('Escape');
  await go('Mi personaje');
  const eq = page.getByTestId('equipment');
  for (const [name, slot, bonus] of [['Casco de valentía', 'Cabeza', '1'], ['Espada larga', 'Una mano', '3'], ['Garrote enorme', 'Dos manos', '4']] as const) {
    await eq.getByLabel('Nombre del objeto').fill(name);
    await eq.getByLabel('Bonus').fill(bonus);
    await eq.getByLabel('Dónde va').selectOption({ label: slot });
    await eq.getByRole('button', { name: 'Agregar objeto' }).click();
  }
  await expect(page.getByTestId('equipment-warnings')).toBeVisible();
  await eq.scrollIntoViewIfNeeded();
  await shot(page, 'novato-05-equipo');
  await page.getByTestId('open-death').click();
  await shot(page, 'novato-06-me-mori');
  await c.close();
});
