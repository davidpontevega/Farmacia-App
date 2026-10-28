import { BRAND } from "@/lib/brand";

/** «NicFarma» → «Nic» + «Farma» para el nombre en dos tonos; si no hay mayúscula interior, todo en un solo tono. */
function splitName(name: string): [string, string] {
  const m = /^(.+?)([A-Z][a-zñáéíóú]+)$/.exec(name);
  return m ? [m[1], m[2]] : [name, ""];
}

// Marco común de las pantallas de acceso: en pantalla ancha la marca a la izquierda y el formulario de Clerk a la derecha;
// en celular, la marca arriba y el formulario debajo.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [first, second] = splitName(BRAND.name);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(48rem_26rem_at_0%_0%,rgb(27_95_193/0.09),transparent_70%),radial-gradient(40rem_28rem_at_100%_100%,rgb(27_95_193/0.07),transparent_70%)]"
      />

      <div className="relative grid w-full max-w-5xl items-center gap-8 md:grid-cols-2 lg:gap-20">
        <aside className="flex flex-col items-center gap-4 text-center md:items-end md:text-right">
          <span className="flex size-24 items-center justify-center rounded-3xl bg-card shadow-lg ring-1 ring-border md:size-28" aria-hidden="true">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" className="text-primary" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <div>
            <p className="text-5xl font-extrabold tracking-tight md:text-6xl">
              <span>{first}</span>
              <span className="text-primary">{second}</span>
            </p>
            <p className="mt-2 text-lg font-medium text-muted-foreground md:text-xl">{BRAND.tagline}</p>
            <p className="mt-1 text-sm text-muted-foreground">Ventas, caja e inventario en un solo lugar</p>
          </div>
          <p className="mt-4 hidden max-w-xs text-xs text-muted-foreground md:block">
            El acceso es solo por invitación. Si no puedes entrar, pídele al administrador que te invite.
          </p>
          <p className="hidden text-xs text-muted-foreground md:block">
            © {new Date().getFullYear()} {BRAND.name}
          </p>
        </aside>

        <main className="flex flex-col items-center gap-4 md:items-start">
          {children}
          <p className="max-w-xs text-center text-xs text-muted-foreground md:hidden">
            El acceso es solo por invitación. Si no puedes entrar, pídele al administrador que te invite.
          </p>
        </main>
      </div>
    </div>
  );
}
