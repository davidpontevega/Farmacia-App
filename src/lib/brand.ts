// Marca del negocio que usa esta instalación. Se cambia con variables de entorno, sin tocar el código.
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "NicFarma",
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE?.trim() || "Botica · Perfumería",
  // Datos de la cabecera del ticket (spec 025).
  ruc: process.env.NEXT_PUBLIC_BRAND_RUC?.trim() || "10710802004",
  address: process.env.NEXT_PUBLIC_BRAND_ADDRESS?.trim() || "Jr. Daniel Alcides Carrión S/N, Sihuas - Áncash",
};
