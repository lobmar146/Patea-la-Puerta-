// Recorrido multicliente completo con navegadores independientes (contextos separados = cookies separadas).
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { BASE, rawCommand, startServer, stopServer } from './server';

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

test.beforeAll(startServer);
test.afterAll(stopServer);

async function join(page: Page, code: string, name: string, role: 'Jugador' | 'Espectador', tv = false) {
  await page.goto(`/s/${code}${tv ? '/tv' : ''}`);
  await page.getByLabel('Tu nombre').fill(name);
  await page.locator('label', { hasText: role }).click();
  await page.getByRole('button', { name: 'Entrar' }).click();
}

const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name, exact: true }).click();
const phaseIs = (page: Page, title: string) => expect(page.getByTestId('phase-title')).toHaveText(title);

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test('partida completa con DM, dos jugadores y TV', async ({ browser }) => {
  const contexts: BrowserContext[] = [];
  const ctx = async (opts = {}) => {
    const c = await browser.newContext({ baseURL: BASE, ...opts });
    contexts.push(c);
    return c;
  };
  const dmCtx = await ctx({ viewport: { width: 1280, height: 900 } });
  const p1Ctx = await ctx(PHONE);
  const p2Ctx = await ctx(PHONE);
  const tvCtx = await ctx({ viewport: { width: 1920, height: 1080 } });
  const dm = await dmCtx.newPage();
  const p1 = await p1Ctx.newPage();
  const p2 = await p2Ctx.newPage();
  const tv = await tvCtx.newPage();

  // 1. El DM crea la sala (y su personaje).
  await dm.goto('/');
  await expect(dm.getByLabel('Munchkin (juego base)')).toBeChecked();
  await expect(dm.getByLabel('Munchkin 2: Hacha sobrenatural (Unnatural Axe)')).toBeChecked();
  await expect(dm.getByLabel('Munchkin 3: Errores clericales (Clerical Errors)')).toBeChecked();
  await dm.getByLabel('Tu nombre').fill('Dana');
  await dm.getByRole('button', { name: 'Crear partida' }).click();
  const code = (await dm.getByTestId('lobby-code').textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{5}$/);

  // 2. Dos jugadores ingresan y un espectador abre la TV.
  await join(p1, code, 'Pablo', 'Jugador');
  await join(p2, code, 'Lu', 'Jugador');
  await join(tv, code, 'Pantalla', 'Espectador', true);
  await expect(tv.getByTestId('tv-view')).toContainText(code);
  await expect(dm.getByTestId('order-list').locator('li')).toHaveCount(3);

  // 3. Una edición aparece en todos los clientes.
  await tab(p1, 'Mi personaje');
  await p1.getByRole('button', { name: 'Sumar 1 a Nivel' }).click();
  await expect(p1.getByTestId('level-value')).toHaveText('2');
  await tab(dm, 'Mesa');
  await expect(dm.getByTestId('level-Pablo')).toHaveText('2');
  await tab(p2, 'Mesa');
  await expect(p2.getByTestId('level-Pablo')).toHaveText('2');

  // 4 y 5. Comandos manuales: un jugador no edita a otro; el espectador no muta nada.
  const lu = await rawCommand(p1Ctx, code, { type: 'character.update', targetId: (await participantId(dmCtx, code, 'Lu'))!, patch: { level: 9 } });
  expect(lu).toMatchObject({ ok: false, code: 'forbidden' });
  const spect = await rawCommand(tvCtx, code, { type: 'game.start' });
  expect(spect).toMatchObject({ ok: false, code: 'forbidden' });
  await expect(p2.getByTestId('level-Lu')).toHaveText('1');

  // 7. El DM establece el orden (Pablo, Dana, Lu) e inicia.
  await tab(dm, 'Sala');
  await dm.getByRole('button', { name: 'Bajar a Dana' }).click();
  await expect(dm.getByTestId('order-list').locator('li').first()).toContainText('Pablo');
  await dm.getByTestId('start-game').click();
  await expect(tv.getByTestId('tv-active')).toContainText('Pablo');

  // 6. Fuera de turno no se avanza (ni por la UI ni a mano).
  await tab(p2, 'Turno');
  await expect(p2.getByText('Esperando a Pablo')).toBeVisible();
  await expect(p2.getByRole('button', { name: /Patear la puerta/ })).toHaveCount(0);
  expect(await rawCommand(p2Ctx, code, { type: 'turn.kickDoor' })).toMatchObject({ ok: false, code: 'forbidden' });

  // 8a. Pablo: otra carta -> buscar problemas -> combate con ayuda.
  await tab(p1, 'Turno');
  await expect(p1.getByTestId('active-stopwatch')).toBeVisible();
  await expect(tv.getByTestId('active-stopwatch')).toBeVisible();
  await p1.getByRole('button', { name: /Patear la puerta/ }).click();
  await phaseIs(p1, 'Patear la puerta');
  await p1.getByRole('button', { name: /Qué salió detrás de la puerta/ }).click();
  await p1.getByRole('button', { name: /Otra carta/ }).click();
  await phaseIs(p1, 'Sin monstruo');
  await p1.getByRole('button', { name: /Elegir: buscar problemas/ }).click();
  await p1.getByTestId('monster-strength').fill('3');
  await expect(p1.getByRole('button', { name: 'Pelear contra este monstruo' })).toBeDisabled();
  await p1.getByLabel('Confirmo que juego un monstruo de mi mano').check();
  await p1.getByRole('button', { name: 'Pelear contra este monstruo' }).click();
  await expect(p1.getByTestId('combat')).toBeVisible();
  await expect(tv.getByTestId('tv-combat')).toBeVisible();

  // 9. Ayuda: Lu rechaza, Dana acepta desde su dispositivo.
  await p1.getByRole('button', { name: 'Pedir ayuda a Lu' }).click();
  await expect(p2.getByTestId('help-inbox')).toBeVisible();
  await p2.getByRole('button', { name: 'Rechazar' }).click();
  await expect(p2.getByTestId('help-inbox')).toHaveCount(0);
  await p1.getByRole('button', { name: 'Pedir ayuda a Dana' }).click();
  await dm.getByRole('button', { name: 'Acepto ayudar' }).click();
  await expect(p1.getByTestId('players-total')).toHaveText('3'); // Pablo 2 + Dana 1
  await expect(p1.getByTestId('monsters-total')).toHaveText('3');
  await expect(p1.getByRole('button', { name: /Pedir ayuda a/ })).toHaveCount(0);
  await p2.getByRole('button', { name: /Añadir modificador/ }).click();
  await p2.getByTestId('mod-value').fill('2');
  await p2.getByRole('button', { name: 'Aplicar modificador' }).click();
  await expect(tv.getByTestId('monsters-total')).toHaveText('5');
  await expect(p1.getByTestId('combat-diff')).toContainText('Los monstruos superan por 2');
  await p1.getByRole('button', { name: /Añadir modificador/ }).click();
  await p1.getByTestId('mod-value').fill('4');
  await p1.getByRole('combobox').selectOption('players');
  await p1.getByRole('button', { name: 'Aplicar modificador' }).click();
  await expect(tv.getByTestId('players-total')).toHaveText('7');

  // 10. Victoria confirmada a mano; doble clic no duplica la recompensa.
  await p1.getByRole('button', { name: /Victoria/ }).click();
  await p1.getByTestId('reward-fighter').fill('1');
  await p1.getByRole('button', { name: 'Confirmar victoria y aplicar una sola vez' }).dblclick();
  await phaseIs(p1, 'Caridad');
  await tab(dm, 'Mesa');
  await expect(dm.getByTestId('level-Pablo')).toHaveText('3');
  await expect(dm.getByTestId('level-Dana')).toHaveText('1'); // sin niveles automáticos al ayudante
  await p1.waitForTimeout(500);
  await expect(dm.getByTestId('level-Pablo')).toHaveText('3');

  // 11. Caridad permite pasar al siguiente turno.
  await p1.getByRole('button', { name: /Confirmar caridad resuelta/ }).click();
  await p1.getByRole('button', { name: 'Listo, continuar' }).click();
  await p1.getByRole('button', { name: /Preparar pase de turno a Dana/ }).click();
  await p1.getByRole('button', { name: /Sí, pasar el turno/ }).click();
  await expect(tv.getByTestId('tv-active')).toContainText('Dana');

  // 8b. Dana: maldición -> saquear.
  await tab(dm, 'Turno');
  await dm.getByRole('button', { name: /Patear la puerta/ }).click();
  await dm.getByRole('button', { name: /Qué salió detrás de la puerta/ }).click();
  await dm.getByRole('button', { name: /Maldición/ }).click();
  await phaseIs(dm, 'Resolver maldición');
  await expect(tv.getByTestId('tv-phase')).toHaveText('Resolver maldición');
  await dm.getByRole('button', { name: /Registrar que resolví la maldición/ }).click();
  await dm.getByRole('button', { name: /Sí, seguir al camino/ }).click();
  await dm.getByRole('button', { name: /Elegir: buscar problemas o saquear/ }).click();
  await dm.getByRole('button', { name: /Saquear: robar una Puerta/ }).click();
  await phaseIs(dm, 'Saquear la habitación');
  await dm.getByRole('button', { name: 'Confirmar saqueo' }).click();
  await dm.getByRole('button', { name: /Sí, saqué una Puerta/ }).click();
  await dm.getByRole('button', { name: /Confirmar caridad resuelta/ }).click();
  await dm.getByRole('button', { name: 'Listo, continuar' }).click();
  await dm.getByRole('button', { name: /Preparar pase de turno a Lu/ }).click();
  await dm.getByRole('button', { name: /Sí, pasar el turno/ }).click();

  // 8c. Lu: monstruo al patear -> huida.
  await p2.getByRole('button', { name: /Patear la puerta/ }).click();
  await p2.getByRole('button', { name: /Qué salió detrás de la puerta/ }).click();
  await p2.getByRole('button', { name: /Monstruo/ }).click();
  await p2.getByTestId('monster-strength').fill('10');
  await p2.getByRole('button', { name: 'Entrar en combate' }).click();
  await expect(tv.getByTestId('monsters-total')).toHaveText('10');
  await p2.getByRole('button', { name: /Huida/ }).click();
  await p2.getByText('Lo atrapó').click();
  await p2.getByRole('button', { name: 'Registrar huida' }).click();
  await phaseIs(p2, 'Caridad');
  await expect(tv.getByTestId('tv-combat')).toHaveCount(0);

  // 12. Recargar recupera la identidad sin duplicados.
  await p1.reload();
  await tab(p1, 'Mi personaje');
  await expect(p1.getByTestId('char-name')).toHaveText('Pablo');
  await tab(dm, 'Mesa');
  await expect(dm.getByTestId('table').locator('> li')).toHaveCount(3);

  // 13. Desconectarse y volver recupera el estado vigente.
  await p2.goto('about:blank');
  await tab(dm, 'DM');
  await dm.getByTestId('dm-edit-select').selectOption({ label: 'Lu' });
  await dm.getByRole('button', { name: 'Sumar 1 a Nivel' }).click();
  await dm.getByRole('button', { name: 'Sumar 1 a Equipo (bonificación total)' }).click();
  await p2.goto(`/s/${code}`);
  await tab(p2, 'Mi personaje');
  await expect(p2.getByTestId('level-value')).toHaveText('2');
  await expect(p2.getByTestId('gear-value')).toHaveText('1');

  // 17. El DM corrige fase y turno; queda registrado.
  await dm.getByTestId('dm-turn-player').selectOption({ label: 'Pablo' });
  await dm.getByTestId('dm-turn-phase').selectOption({ label: 'Patear la puerta' });
  await dm.getByTestId('dm-turn-apply').click();
  await expect(tv.getByTestId('tv-active')).toContainText('Pablo');
  await expect(tv.getByTestId('tv-phase')).toHaveText('Patear la puerta');
  await expect(tv.getByText(/Corrección del DM/).first()).toBeVisible();

  // Combate abierto para verificar que sobrevive al reinicio.
  await tab(p1, 'Turno');
  await p1.getByRole('button', { name: /Qué salió detrás de la puerta/ }).click();
  await p1.getByRole('button', { name: /Monstruo/ }).click();
  await p1.getByTestId('monster-strength').fill('8');
  await p1.getByRole('button', { name: 'Entrar en combate' }).click();
  await expect(tv.getByTestId('monsters-total')).toHaveText('8');

  // 14. Reinicio REAL del backend conservando PostgreSQL.
  await stopServer();
  await expect(tv.getByTestId('conn-status')).toHaveAttribute('data-status', 'reconnecting');
  await startServer();
  await expect(tv.getByTestId('conn-status')).toHaveAttribute('data-status', 'online', { timeout: 15_000 });
  await expect(tv.getByTestId('tv-active')).toContainText('Pablo');
  await expect(tv.getByTestId('tv-phase')).toHaveText('Combate');
  await expect(tv.getByTestId('monsters-total')).toHaveText('8');
  await expect(p1.getByTestId('combat')).toBeVisible({ timeout: 15_000 });
  await tab(dm, 'Mesa');
  await expect(dm.getByTestId('level-Pablo')).toHaveText('3');
  await expect(dm.getByTestId('level-Lu')).toHaveText('2');
  await tab(dm, 'DM');
  await expect(dm.getByTestId('dm-panel')).toBeVisible(); // el rol de DM se conserva
  await expect(p1.getByTestId('combat').getByRole('button', { name: /Victoria/ })).toBeVisible();

  // 18. Móvil sin scroll horizontal y TV en 1920x1080.
  await noHorizontalScroll(p1);
  await noHorizontalScroll(p2);
  await noHorizontalScroll(tv);
  await p1.screenshot({ path: 'test-results/screens/movil-combate.png', fullPage: true });
  await tv.screenshot({ path: 'test-results/screens/tv-combate.png' });
  await tab(p2, 'Mesa');
  await p2.screenshot({ path: 'test-results/screens/movil-mesa.png', fullPage: true });

  // Fin de partida: nivel 10 pide confirmación del DM.
  await dm.getByTestId('dm-edit-select').selectOption({ label: 'Pablo' });
  for (let level = 4; level <= 10; level++) {
    await dm.getByRole('button', { name: 'Sumar 1 a Nivel' }).click();
    await expect(dm.getByTestId('level-value')).toHaveText(String(level));
  }
  await expect(dm.getByTestId('level-alert')).toBeVisible();
  await expect(tv.getByTestId('tv-view')).toContainText('El DM confirma');
  await expect(p1.getByTestId('finished')).toHaveCount(0);
  await dm.getByRole('button', { name: 'Confirmar victoria' }).click();
  await expect(p1.getByTestId('finished')).toContainText('Pablo gana');
  await expect(tv.getByTestId('tv-finished')).toContainText('Pablo gana');

  for (const c of contexts) await c.close();
});

async function participantId(context: BrowserContext, code: string, name: string): Promise<string | undefined> {
  const { io } = await import('socket.io-client');
  const cookie = (await context.cookies(BASE)).map((c) => `${c.name}=${c.value}`).join('; ');
  const socket = io(BASE, { auth: { code }, extraHeaders: { cookie }, transports: ['websocket'], reconnection: false });
  const snap = await new Promise<{ state: { participants: Record<string, { id: string; name: string }> } }>((resolve) => socket.once('snapshot', resolve));
  socket.disconnect();
  return Object.values(snap.state.participants).find((p) => p.name === name)?.id;
}
