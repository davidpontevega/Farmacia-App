import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      {/* Sin registro público: se oculta el enlace; el alta es solo por invitación */}
      <SignIn appearance={{ elements: { footerAction: "hidden" } }} />
    </main>
  );
}
