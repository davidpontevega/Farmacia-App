import type { ClerkProvider } from "@clerk/nextjs";
import type { ComponentProps } from "react";

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

// Los componentes de Clerk (inicio de sesión, alta por invitación, menú de usuario) con la paleta del sistema.
// La `!` final es el modificador «important» de Tailwind: los estilos propios de Clerk tienen más prioridad que una clase suelta.
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#1b5fc1",
    colorForeground: "#0f172a",
    colorMutedForeground: "#64748b",
    colorDanger: "#dc2626",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
  },
  elements: {
    // Sin registro público: se oculta el enlace; el alta es solo por invitación.
    footerAction: "hidden",
    cardBox: "shadow-xl border border-border",
    // Encabezado alineado a la izquierda: «Bienvenido» + una línea de ayuda.
    header: "items-start text-left",
    headerTitle: "text-left text-2xl font-bold",
    headerSubtitle: "text-left",
    // Etiquetas pequeñas en mayúsculas y campos con fondo azul claro.
    formFieldLabel: "uppercase text-[11px] font-semibold tracking-wider text-muted-foreground",
    formFieldInput: "h-11 bg-secondary border-transparent",
    // Botón sólido (Clerk trae un degradado por defecto).
    formButtonPrimary: "h-11 text-sm font-semibold shadow-none bg-none! bg-primary!",
  },
};
