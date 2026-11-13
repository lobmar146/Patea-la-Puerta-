import { useEffect, useState } from 'react';

// Preferencia por dispositivo: el modo novato viene prendido y se puede apagar.
const KEY = 'pp-novato';
const listeners = new Set<(on: boolean) => void>();

export function noviceEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
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
