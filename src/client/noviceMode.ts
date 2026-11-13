import { useEffect, useState } from 'react';

// Preferencia por dispositivo: el modo novato viene apagado; se prende al entrar o desde "Mi personaje".
const KEY = 'pp-novato';
const listeners = new Set<(on: boolean) => void>();

export function noviceEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setNoviceEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* sin almacenamiento: vale por esta visita */
  }
  listeners.forEach((cb) => cb(on));
}

export function useNoviceMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(noviceEnabled);
  useEffect(() => {
    listeners.add(setOn);
    return () => {
      listeners.delete(setOn);
    };
  }, []);
  return [on, setNoviceEnabled];
}
