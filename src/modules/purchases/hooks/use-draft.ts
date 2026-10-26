"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Header, PurchaseRow } from "../rows";
import { isBlankRow } from "../rows";

const EVENT = "purchase-draft-changed";

/** Una clave por usuario: en un equipo compartido nadie restaura el borrador de otro. */
export const draftKey = (userId: string) => `purchase-draft-v1:${userId}`;

export type Draft = {
  header: Header;
  documentTotal: string;
  margin: string;
  rows: PurchaseRow[];
};

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const clearDraft = (key: string | null) => {
  if (!key) return;
  safe(() => localStorage.removeItem(key), undefined);
  window.dispatchEvent(new Event(EVENT));
};

export const isEmptyDraft = (d: Draft) =>
  d.rows.every(isBlankRow) &&
  !d.header.supplier &&
  !d.header.documentNumber &&
  !d.header.otherCharges &&
  !d.documentTotal;

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Borrador guardado en este navegador (texto JSON). En el servidor y sin borrador: null. */
export function useStoredDraft(key: string | null): Draft | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => (key ? safe(() => localStorage.getItem(key), null) : null),
    () => null,
  );
  if (!raw) return null;
  const draft = safe(() => JSON.parse(raw) as Draft, null);
  return draft && Array.isArray(draft.rows) && draft.header ? draft : null;
}

/**
 * Guarda el borrador 0,5 s después del último cambio. Con `enabled` en falso (hay un borrador
 * por decidir) no escribe, para no pisarlo. Un borrador vacío se borra.
 */
export function useAutosaveDraft(draft: Draft, enabled: boolean, key: string | null) {
  useEffect(() => {
    if (!enabled || !key) return;
    const id = setTimeout(() => {
      if (isEmptyDraft(draft)) safe(() => localStorage.removeItem(key), undefined);
      else safe(() => localStorage.setItem(key, JSON.stringify(draft)), undefined);
    }, 500);
    return () => clearTimeout(id);
  }, [draft, enabled, key]);
}
