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
  if (role === 'Jugador') await page.locator('label', { hasText: 'Mujer' }).click();
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
  await expect(dm.getByLabel('Tu nombre')).toHaveCount(0);
  await dm.getByTestId('home-join').click();
  await expect(dm.getByLabel('Código de sala')).toBeVisible();
  await dm.getByRole('button', { name: 'Volver' }).click();
  await dm.getByTestId('home-create').click();
  await expect(dm.getByLabel('Munchkin (juego base)')).toBeChecked();
  await expect(dm.getByLabel('Munchkin 2: Hacha sobrenatural (Unnatural Axe)')).toBeChecked();
  await expect(dm.getByLabel('Munchkin 3: Errores clericales (Clerical Errors)')).toBeChecked();
  await dm.getByLabel('Tu nombre').fill('Dana');
  await dm.getByTestId('create-avatars').getByRole('button', { name: 'Pollo' }).click();
  await dm.locator('label', { hasText: 'Hombre' }).click();
  await dm.getByRole('button', { name: 'Crear partida' }).click();
  const code = (await dm.getByTestId('lobby-code').textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{5}$/);

  // 2. Dos jugadores ingresan y un espectador abre la TV.
  await join(p1, code, 'Pablo', 'Jugador');
  await join(p2, code, 'Lu', 'Jugador');
  await join(tv, code, 'Pantalla', 'Espectador', true);
  await expect(tv.getByTestId('tv-view')).toContainText(code);
  await expect(dm.getByTestId('order-list').locator('li')).toHaveCount(3);
  await expect(dm.getByTestId('order-list').locator('[data-avatar="pollo"]')).toHaveCount(1);

  // 3. Una edición aparece en todos los clientes.
  await tab(p1, 'Mi personaje');
  await p1.getByRole('button', { name: 'Sumar 1 a Nivel' }).click();
  await expect(p1.getByTestId('level-value')).toHaveText('2');
  // Raza y clase desde listas desplegables.
  await p1.getByTestId('races-select').selectOption('Elfo');
  await expect(p1.getByTestId('races-list')).toContainText('Elfo');
  await p1.getByTestId('classes-select').selectOption('Mago');
  await expect(p1.getByTestId('classes-list')).toContainText('Mago');
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
  await expect(p1.getByTestId('your-turn')).toContainText('¡Te toca, Pablo!');
  await expect(p2.getByTestId('your-turn')).toHaveCount(0);

  // 6. Fuera de turno no se avanza (ni por la UI ni a mano).
  await tab(p2, 'Turno');
  await expect(p2.getByText('Esperando a Pablo')).toBeVisible();
  await expect(p2.getByRole('button', { name: /Patear la puerta/ })).toHaveCount(0);
  expect(await rawCommand(p2Ctx, code, { type: 'turn.kickDoor' })).toMatchObject({ ok: false, code: 'forbidden' });

  // 8a. Pablo: otra carta -> buscar problemas -> combate con ayuda.
  await tab(p1, 'Turno');
  await expect(p1.getByTestId('turn-timer')).toBeVisible();
  await expect(tv.getByTestId('active-stopwatch')).toBeVisible();
  await p1.getByRole('button', { name: /Patear la puerta/ }).click();
  await phaseIs(p1, 'Patear la puerta');
  await p1.getByRole('button', { name: /Otra carta/ }).click();
  await phaseIs(p1, 'Sin monstruo');
  // Sin monstruo: las dos opciones a un toque, sin panel intermedio.
  await expect(p1.getByTestId('monster-form')).toHaveCount(0);
  await expect(p1.getByRole('button', { name: 'Saquear', exact: true })).toBeVisible();
  await p1.waitForTimeout(400);
  await p1.screenshot({ path: 'test-results/screens/movil-elegir-sin-monstruo.png' });
  await p1.getByRole('button', { name: /Buscar problemas/ }).click();
  await expect(p1.getByRole('button', { name: 'Pelear contra este monstruo' })).toBeDisabled();
  // El buscador muestra las coincidencias justo debajo del campo.
  // El listado ya está abierto y escribir no mueve el campo ni el panel.
  await p1.waitForTimeout(400); // termina la animación de apertura del panel
  await expect(p1.getByRole('listbox', { name: 'Monstruos del catálogo' })).toBeVisible();
  const before = await p1.getByPlaceholder(/Buscá por nombre/).boundingBox();
  await p1.getByPlaceholder(/Buscá por nombre/).fill('co');
  await p1.getByPlaceholder(/Buscá por nombre/).fill('zzzz');
  await expect(p1.getByTestId('monster-results')).toContainText('No hay coincidencias');
  expect((await p1.getByPlaceholder(/Buscá por nombre/).boundingBox())?.y).toBe(before?.y);
  await p1.getByPlaceholder(/Buscá por nombre/).fill('co');
  await p1.screenshot({ path: 'test-results/screens/movil-buscar-monstruo.png' });
  await p1.getByPlaceholder(/Buscá por nombre/).fill('');
  await p1.getByRole('button', { name: 'Ocultar listado' }).click();
  await p1.getByTestId('monster-strength').fill('3');
  await p1.getByRole('button', { name: 'Pelear contra este monstruo' }).click();
  await expect(p1.getByTestId('combat')).toBeVisible();
  await expect(tv.getByTestId('tv-combat')).toBeVisible();

  // 9. Ayuda: al ir perdiendo, el siguiente paso ofrece pedir ayuda (sin cartel que tape). Lu rechaza, Dana acepta.
  const nextStep = p1.getByTestId('combat-next-step');
  await expect(nextStep).toContainText('Vas perdiendo');
  await p1.screenshot({ path: 'test-results/screens/movil-aviso-perdiendo.png' });
  await nextStep.getByRole('button', { name: 'Pedir ayuda a Lu' }).click();
  await expect(p2.getByTestId('help-inbox')).toBeVisible();
  await p2.getByRole('button', { name: 'Rechazar' }).click();
  await expect(p2.getByTestId('help-inbox')).toHaveCount(0);
  // Tras el rechazo, solo se ofrece ayuda a quien no se la negó.
  await expect(nextStep.getByRole('button', { name: /Pedir ayuda a/ })).toHaveCount(1);
  await nextStep.getByRole('button', { name: 'Pedir ayuda a Dana' }).click();
  await dm.getByRole('button', { name: 'Acepto ayudar' }).click();
  await expect(p1.getByTestId('players-total')).toHaveText('3'); // Pablo 2 + Dana 1
  await expect(p1.getByTestId('monsters-total')).toHaveText('3');
  await expect(p1.getByRole('button', { name: /Pedir ayuda a/ })).toHaveCount(0);
  await p2.getByRole('button', { name: /Añadir modificador/ }).click();
  await expect(p2.getByRole('button', { name: 'Monstruos', pressed: true })).toBeVisible();
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: 'test-results/screens/movil-modificador.png' });
  await p2.getByTestId('mod-quick').getByRole('button', { name: '+2' }).click();
  await expect(tv.getByTestId('monsters-total')).toHaveText('5');
  await expect(p1.getByTestId('combat-diff')).toContainText('Los monstruos superan por 2');
  await p1.getByRole('button', { name: /Añadir modificador/ }).click();
  await expect(p1.getByRole('button', { name: 'Jugadores', pressed: true })).toBeVisible();
  await p1.getByTestId('mod-value').fill('4');
  await p1.getByRole('button', { name: 'Aplicar modificador' }).click();
  await expect(tv.getByTestId('players-total')).toHaveText('7');
  await expect(p1.getByTestId('combat-next-step')).toContainText('¡Vas ganando!');

  // 10. Victoria con un toque, sin confirmar; se puede volver atrás y repetir.
  await p1.getByTestId('combat-quick').getByRole('button', { name: 'Victoria' }).click();
  await phaseIs(p1, 'Caridad');
  await p1.getByTestId('step-undo').click();
  await expect(p1.getByTestId('combat')).toBeVisible();
  await expect(tv.getByTestId('tv-combat')).toBeVisible();
  await p1.getByTestId('combat-quick').getByRole('button', { name: 'Victoria' }).click();
  await phaseIs(p1, 'Caridad');
  await expect(tv.getByTestId('celebration')).toContainText('+1 NIVEL');
  await tab(dm, 'Mesa');
  await expect(dm.getByTestId('level-Pablo')).toHaveText('3');
  await expect(dm.getByTestId('level-Dana')).toHaveText('1'); // sin niveles automáticos al ayudante
  await p1.waitForTimeout(500);
  await expect(dm.getByTestId('level-Pablo')).toHaveText('3');

  // 11. Caridad permite pasar al siguiente turno.
  await p1.getByRole('button', { name: /Pasar turno a Dana/ }).click();
  await expect(tv.getByTestId('tv-active')).toContainText('Dana');

  // 8b. Dana: maldición -> saquear.
  await tab(dm, 'Turno');
  await dm.getByRole('button', { name: /Patear la puerta/ }).click();
  await dm.getByRole('button', { name: /Maldición/ }).click();
  await phaseIs(dm, 'Resolver maldición');
  await expect(tv.getByTestId('tv-phase')).toHaveText('Resolver maldición');
  // Cada etapa avanza con un solo toque, sin confirmaciones.
  await dm.getByRole('button', { name: /Maldición resuelta/ }).click();
  await phaseIs(dm, 'Sin monstruo');
  await dm.getByRole('button', { name: 'Saquear', exact: true }).click();
  await phaseIs(dm, 'Caridad');
  await dm.getByRole('button', { name: /Pasar turno a Lu/ }).click();

  // 8c. Lu: monstruo al patear -> huida.
  await p2.getByRole('button', { name: /Patear la puerta/ }).click();
  await p2.getByRole('button', { name: /Monstruo/ }).click();
  await p2.getByTestId('monster-strength').fill('10');
  await p2.getByRole('button', { name: 'Entrar en combate' }).click();
  await expect(tv.getByTestId('monsters-total')).toHaveText('10');
  await expect(p2.getByTestId('combat-next-step')).toContainText('Vas perdiendo');
  await p2.getByTestId('combat-next-step').getByRole('button', { name: /Huir/ }).click();
  // Una sola tirada: el resultado se toca y queda registrado.
  await p2.getByTestId('flee-form').getByRole('button', { name: 'Lo atrapó' }).click();
  await phaseIs(p2, 'Caridad');
  await expect(tv.getByTestId('tv-combat')).toHaveCount(0);

  // 12. Recargar recupera la identidad sin duplicados.
  await p1.reload();
  await tab(p1, 'Mi personaje');
  await expect(p1.getByTestId('char-name')).toHaveText('Pablo');
  // Sexo: se eligió al entrar y se cambia con el switch (por ejemplo, por una maldición).
  await expect(p1.getByTestId('char-identity')).toContainText('Mujer');
  await p1.getByTestId(/^edit-.*-sex$/).locator('label', { hasText: 'Hombre' }).click();
  await expect(p1.getByTestId('char-identity')).toContainText('♂ Hombre');
  // Deshacer: un toque de más en el nivel se revierte con un botón.
  const lvl = await p1.getByTestId('level-value').innerText();
  await p1.getByRole('button', { name: 'Sumar 1 a Nivel' }).click();
  await expect(p1.getByTestId('level-value')).not.toHaveText(lvl);
  await p1.getByTestId('undo').click();
  await expect(p1.getByTestId('level-value')).toHaveText(lvl);
  await expect(p1.getByTestId('undo')).toHaveCount(0);
  await tab(dm, 'Mesa');
  await expect(dm.getByTestId('table').locator('> li')).toHaveCount(3);
  await expect(dm.getByTestId('table')).toContainText('♂ Hombre');

  // 13. Desconectarse y volver recupera el estado vigente.
  await p2.goto('about:blank');
  await tab(dm, 'DM');
  // Fichas rápidas del DM: botones grandes por jugador, sin elegir de una lista.
  // Un solo personaje a la vista: se elige tocando su resumen, sin scrollear.
  await expect(dm.getByTestId('dm-char')).toHaveCount(1);
  await dm.getByTestId('dm-summary').getByRole('button', { name: /Ver a Lu/ }).click();
  await expect(dm.getByTestId('dm-char')).toHaveCount(1);
  const luCard = dm.getByRole('article', { name: 'Personaje Lu' });
  await luCard.getByRole('button', { name: 'Sumar 1 a Nivel' }).click();
  await luCard.getByRole('button', { name: 'Sumar 1 a Equipo' }).click();
  await expect(luCard.getByTestId('quick-level-value')).toHaveText('2');
  await expect(luCard.getByTestId('quick-gear-value')).toHaveText('+1');
  await luCard.getByTestId('quick-races').click();
  await dm.getByTestId('quick-races-picker').getByRole('button', { name: 'Enano', exact: true }).click();
  await expect(luCard.getByTestId('quick-races')).toContainText('Enano');
  await expect(tv.getByTestId('tv-view')).toContainText('Enano');
  await expect(dm.getByTestId('dm-summary').getByRole('button', { name: /Ver a Lu: nivel 2/ })).toBeVisible();
  await p2.goto(`/s/${code}`);
  await tab(p2, 'Mi personaje');
  await expect(p2.getByTestId('level-value')).toHaveText('2');
  await expect(p2.getByTestId('gear-value')).toHaveText('1');
  // Candado: el DM le apaga los cambios a Lu y después se los devuelve.
  await luCard.getByTestId('quick-lock').click();
  await expect(p2.getByTestId('locked-notice')).toBeVisible();
  await p2.getByRole('button', { name: 'Sumar 1 a Nivel' }).click();
  await expect(p2.getByTestId('level-value')).toHaveText('2');
  await luCard.getByTestId('quick-lock').click();
  await expect(p2.getByTestId('locked-notice')).toHaveCount(0);

  // 17. El DM corrige fase y turno; queda registrado.
  await dm.getByTestId('dm-turn-player').selectOption({ label: 'Pablo' });
  await dm.getByTestId('dm-turn-phase').selectOption({ label: 'Patear la puerta' });
  await dm.getByTestId('dm-turn-apply').click();
  await expect(tv.getByTestId('tv-active')).toContainText('Pablo');
  await expect(tv.getByTestId('tv-phase')).toHaveText('Patear la puerta');
  await expect(tv.getByText(/Corrección del DM/).first()).toBeVisible();

  // Combate abierto para verificar que sobrevive al reinicio.
  await tab(p1, 'Turno');
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
  // Combate a la vista desde el panel del DM, y un toque lleva al turno.
  await expect(dm.getByTestId('dm-combat-banner')).toContainText('8');
  await expect(dm.getByRole('article', { name: 'Personaje Pablo' }).getByTestId('quick-badge')).toHaveText('Pelea');
  await dm.getByTestId('dm-combat-banner').click();
  await expect(dm.getByTestId('combat')).toBeVisible();
  // El DM pone al ayudante con un toque (sin que Lu tenga que aceptar) y lo puede volver atrás.
  await dm.getByTestId('combat').getByRole('button', { name: 'Ayuda Lu' }).first().click();
  await expect(tv.getByTestId('tv-combat')).toContainText('Lu');
  await expect(p2.getByTestId('help-inbox')).toHaveCount(0);
  await expect(dm.getByTestId('your-turn')).toHaveCount(0, { timeout: 8000 }); // el aviso "te toca" se va solo
  await dm.getByTestId('step-undo').click();
  await expect(dm.getByTestId('combat').getByRole('button', { name: 'Ayuda Lu' }).first()).toBeVisible();
  await tab(dm, 'DM');
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
  await dm.getByTestId('dm-summary').getByRole('button', { name: /Ver a Pablo/ }).click();
  const pablo = dm.getByRole('article', { name: 'Personaje Pablo' });
  for (let level = 4; level <= 10; level++) {
    await pablo.getByRole('button', { name: 'Sumar 1 a Nivel' }).click();
    await expect(pablo.getByTestId('quick-level-value')).toHaveText(String(level));
    // En 9 todos ven que está a un paso de ganar.
    if (level === 9) await expect(p2.getByTestId('almost-banner')).toContainText('Pablo en nivel 9');
  }
  await expect(dm.getByTestId('level-alert')).toBeVisible();
  await expect(p2.getByTestId('almost-banner')).toHaveCount(0);
  await expect(tv.getByTestId('tv-view')).toContainText('El DM confirma');
  await expect(p1.getByTestId('finished')).toHaveCount(0);
  // Reacción rápida: llega flotando a los demás y a la tele.
  await tab(p2, 'Turno');
  await p2.getByTestId('reaction-fab').click();
  await p2.getByTestId('reaction-bar').getByRole('button', { name: 'Reaccionar con 🔥' }).click();
  await expect(tv.getByTestId('reaction-layer')).toContainText('🔥');
  await expect(tv.getByTestId('reaction-layer')).toContainText('Lu');

  await dm.getByRole('button', { name: 'Confirmar victoria' }).click();
  await expect(p1.getByTestId('finished')).toContainText('Pablo gana');
  await expect(tv.getByTestId('tv-finished')).toContainText('Pablo gana');
  await expect(p1.getByTestId('podium-1')).toContainText('Pablo');
  await expect(p1.getByTestId('awards').locator('li').first()).toBeVisible();
  await expect(tv.getByTestId('tv-finished').getByTestId('podium-1')).toContainText('Pablo');

  // Revancha con un toque: el DM la arma y los demás entran sin volver a escribir el nombre.
  await expect(p1.getByTestId('rematch')).toHaveCount(0);
  await dm.getByTestId('rematch-button').click();
  await dm.waitForURL((u) => /^\/s\/[A-Z0-9]+$/.test(u.pathname) && !u.pathname.endsWith(`/${code}`));
  await expect(dm.getByTestId('room-code')).not.toHaveText(code);
  await expect(p1.getByTestId('rematch-button')).toHaveText(/Ir a la revancha/);
  await expect(tv.getByTestId('tv-rematch')).toBeVisible();
  await p1.getByTestId('rematch-button').click();
  await expect(p1.getByTestId('room-code')).toHaveText(await dm.getByTestId('room-code').innerText());
  await expect(p1.getByTestId('me-label')).toContainText('Pablo');

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
