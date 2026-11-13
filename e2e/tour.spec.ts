// Recorrido de capturas para revisar el diseño (no es una prueba funcional).
// Uso: npm run build && npm run tour  -> test-results/tour/{dark,light}-*.png
import { expect, test, type Page } from '@playwright/test';
import { startServer, stopServer } from './server';

const OUT = process.env.TOUR_OUT ?? 'test-results/tour';
test.skip(!process.env.TOUR, 'Solo con npm run tour.');
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
test.beforeAll(startServer);
test.afterAll(stopServer);
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name, exact: true }).click();
async function join(page: Page, code: string, name: string, role: string, tv = false) {
  await page.goto(`/s/${code}${tv ? '/tv' : ''}`);
  await page.getByLabel('Tu nombre').fill(name);
  await page.locator('label', { hasText: role }).click();
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
    await dm.goto('/');
    await dm.getByLabel('Tu nombre').fill('Dana');
    await dm.getByRole('button', { name: 'Crear partida' }).click();
    const code = (await dm.getByTestId('lobby-code').textContent())!.trim();
    await p1.goto(`/s/${code}`);
    await shot(p1, `${theme}-02-join`, true);
    await p1.getByLabel('Tu nombre').fill('Pablo');
    await p1.locator('label', { hasText: 'Jugador' }).click();
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
  });
}
