// Diferencia entre el reloj del servidor y el del dispositivo. El cronómetro la usa para que
// un celular con la hora corrida muestre el mismo tiempo que el resto de la mesa.
let offsetMs = 0;

export function syncServerClock(serverTime: string | undefined) {
  const t = serverTime ? Date.parse(serverTime) : NaN;
  if (Number.isFinite(t)) offsetMs = t - Date.now();
}

export function serverNow() {
  return Date.now() + offsetMs;
}
