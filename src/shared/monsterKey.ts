// Clave para comparar nombres de monstruos sin importar tildes, mayúsculas ni signos.
export function monsterKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/(\d)[.,](?=\d)/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Nombres que no sirven para el catálogo (vacíos o genéricos). */
export function isCatalogName(name: string): boolean {
  const key = monsterKey(name);
  return key.length >= 2 && !['monstruo', 'monster', 'bicho'].includes(key);
}
