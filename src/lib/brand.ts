// Marca del negocio que usa esta instalación. Se cambia con variables de entorno, sin tocar el código.
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "NicFarma",
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE?.trim() || "Botica · Perfumería",
};
