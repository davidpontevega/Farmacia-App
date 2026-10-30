import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { Toaster } from "sonner";
import { BRAND } from "@/lib/brand";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BRAND.name,
  description: `Punto de venta · ${BRAND.name}`,
};

// «cover» hace que env(safe-area-inset-*) valga algo en iOS: la barra del carrito respeta el borde inferior.
export const viewport: Viewport = { viewportFit: "cover" };

// El paquete en español no trae el título de la pantalla de acceso («Continue to …» salía en inglés).
const localization = {
  ...esES,
  signIn: {
    ...esES.signIn,
    start: {
      ...esES.signIn?.start,
      title: "Bienvenido",
      subtitle: "Ingresa tu correo para continuar",
      titleCombined: "Bienvenido",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={localization} appearance={clerkAppearance}>
      <html
        lang="es"
        className={`${inter.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <QueryProvider>{children}</QueryProvider>
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
