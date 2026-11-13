// Ayudas para novatos: partida de práctica, consejos, venta, equipo por espacios y "Me morí".
import { expect, test } from '@playwright/test';
import { BASE, startServer, stopServer } from './server';

test.beforeAll(startServer);
test.afterAll(stopServer);

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

test('partida de práctica con modo novato', async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: BASE, ...PHONE });
  const page = await ctx.newPage();
  const tab = (name: string) => page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name, exact: true }).click();

  await page.goto('/');
  await page.getByTestId('home-practice').click();
  await page.getByLabel('Tu nombre').fill('Nova');
  await page.getByRole('button', { name: 'Empezar práctica' }).click();

  // Arranca sola, con consejos y dos jugadores de mentira.
  await expect(page.getByTestId('coach')).toContainText('Patear la puerta');
  await tab('Mesa');
  await expect(page.getByTestId('table').locator('li')).toHaveCount(3);
  await expect(page.getByTestId('table')).toContainText('Grog (práctica)');
  await tab('Turno');

  // ¿Qué puedo hacer ahora? → vender objetos.
  await page.getByTestId('what-can-i-do').click();
  await expect(page.getByTestId('what-modal')).toContainText('En cualquier momento');
  await page.getByRole('button', { name: 'Vender objetos' }).click();
  await page.getByRole('button', { name: '+500' }).click();
  await page.getByRole('button', { name: '+700' }).click();
  await expect(page.getByTestId('sell-result')).toContainText('+1 nivel');
  await expect(page.getByTestId('sell-result')).toContainText('Sobran 200');
  await page.getByTestId('sell-apply').click();

  // Equipo por espacios.
  await tab('Mi personaje');
  await expect(page.getByTestId('level-value')).toHaveText('2');
  const eq = page.getByTestId('equipment');
  await eq.getByLabel('Nombre del objeto').fill('Casco de valentía');
  await eq.getByLabel('Dónde va').selectOption({ label: 'Cabeza' });
  await eq.getByRole('button', { name: 'Agregar objeto' }).click();
  await expect(page.getByTestId('gear-value')).toHaveText('+1');
  await eq.getByLabel('Nombre del objeto').fill('Sombrero raro');
  await eq.getByLabel('Bonus').fill('2');
  await eq.getByLabel('Dónde va').selectOption({ label: 'Cabeza' });
  await eq.getByRole('button', { name: 'Agregar objeto' }).click();
  await expect(page.getByTestId('equipment-warnings')).toContainText('cabeza');
  await expect(page.getByTestId('gear-value')).toHaveText('+3');
  await eq.getByRole('button', { name: 'Sacar' }).first().click();
  await expect(page.getByTestId('equipment-warnings')).toHaveCount(0);
  await expect(page.getByTestId('gear-value')).toHaveText('+2');
  await expect(page.getByTestId('char-power')).toHaveText('4');

  // Me morí: guía y vaciar equipo.
  await page.getByTestId('open-death').click();
  await expect(page.getByTestId('death-modal')).toContainText('2 Puertas y 2 Tesoros');
  await page.getByTestId('death-clear-gear').click();
  await expect(page.getByTestId('death-modal')).toContainText('ya está vacío');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('gear-from-items')).toHaveCount(0);
  await expect(page.getByTestId('gear-value')).toHaveText('0');
  await expect(page.getByTestId('level-value')).toHaveText('2');

  // El modo novato se puede apagar fuera de la práctica; acá queda fijo.
  await tab('Turno');
  await expect(page.getByRole('button', { name: 'Apagar modo novato' })).toHaveCount(0);
  await ctx.close();
});
