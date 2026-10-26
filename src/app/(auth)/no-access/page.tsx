import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

// Sesión de Clerk válida pero sin acceso al sistema (no invitado o desactivado).
export default function NoAccessPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-semibold">Sin acceso</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Tu cuenta no tiene acceso al sistema o fue desactivada. Pide a un
        administrador que te invite o te reactive.
      </p>
      <SignOutButton redirectUrl="/sign-in">
        <Button variant="outline">Cerrar sesión</Button>
      </SignOutButton>
    </main>
  );
}
