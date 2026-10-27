"use client";

import { UserButton } from "@clerk/nextjs";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Clerk monta su botón solo en el cliente: se pinta tras la hidratación para no desajustar el HTML. */
export function UserMenu({ showName }: { showName?: boolean }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return mounted ? <UserButton showName={showName} /> : <span className="size-7" aria-hidden="true" />;
}
