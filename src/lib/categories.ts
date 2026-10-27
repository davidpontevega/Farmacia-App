const key = (s: string) => s.trim().toLocaleLowerCase("es");

/** Une listas de categorías sin repetir (sin distinguir mayúsculas ni espacios) y las ordena. */
export function mergeCategories(...lists: readonly (readonly string[])[]): string[] {
  const seen = new Map<string, string>();
  for (const name of lists.flat()) {
    const k = key(name);
    if (k && !seen.has(k)) seen.set(k, name.trim());
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "es"));
}

/** Categorías que contienen lo escrito, y si lo escrito sería una categoría nueva. */
export function filterCategories(all: readonly string[], typed: string) {
  const k = key(typed);
  return {
    matches: k ? all.filter((c) => key(c).includes(k)) : [...all],
    isNew: k !== "" && !all.some((c) => key(c) === k),
  };
}
