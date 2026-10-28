import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  // Sin registro público: se oculta el enlace «¿No tienes cuenta?»; el alta es solo por invitación.
  return <SignIn appearance={{ elements: { footerAction: "hidden" } }} />;
}
