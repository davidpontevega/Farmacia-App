import { SignUp } from "@clerk/nextjs";

// Destino del enlace de invitación (trae el ticket). Sin ticket Clerk rechaza el alta.
export default function AcceptInvitePage() {
  return <SignUp routing="path" path="/accept-invite" signInUrl="/sign-in" appearance={{ elements: { footerAction: "hidden" } }} />;
}
