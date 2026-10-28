"use client";

import { useSyncExternalStore } from "react";

// Estado del menú lateral, compartido entre el menú y el botón de hamburguesa del encabezado:
// - `collapsed` (pantalla ancha): plegado a iconos; se recuerda en el navegador (si no hay almacenamiento, dura hasta recargar).
// - `open` (pantalla angosta): menú desplegado; no se recuerda.
const COLLAPSED_KEY = "nicfarma:menu-plegado";
const listeners = new Set<() => void>();
let open = false;

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const notify = () => listeners.forEach((l) => l());

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
  } catch {
    /* sin almacenamiento: el cambio dura hasta recargar */
  }
  notify();
}

export function setMenuOpen(value: boolean) {
  open = value;
  notify();
}

export function useMenuState() {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const isOpen = useSyncExternalStore(subscribe, () => open, () => false);
  return { collapsed, open: isOpen };
}
