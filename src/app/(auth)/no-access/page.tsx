import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

// Sesión de Clerk válida pero sin acceso al sistema (no invitado o desactivado).
export default function NoAccessPage() {
  return (
    <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border bg-card p-6 text-center shadow-lg">
      <h1 className="text-xl font-semibold">Sin acceso</h1>
      <p className="text-sm text-muted-foreground">
        Tu cuenta no tiene acceso al sistema o fue desactivada. Pide a un
        administrador que te invite o te reactive.
      </p>
      <SignOutButton redirectUrl="/sign-in">
        <Button variant="outline">Cerrar sesión</Button>
      </SignOutButton>
    </div>
  );
}
