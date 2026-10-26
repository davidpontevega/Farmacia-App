import { SignUp } from "@clerk/nextjs";

// Destino del enlace de invitación (trae el ticket). Sin ticket Clerk rechaza el alta.
export default function AcceptInvitePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <SignUp
        routing="path"
        path="/accept-invite"
        signInUrl="/sign-in"
        appearance={{ elements: { footerAction: "hidden" } }}
      />
    </main>
  );
}
