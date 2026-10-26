import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      // Recarga completa (fuera de React): descarta la caché de Query.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/sign-in";
    }
    return Promise.reject(err);
  },
);

export function apiErrorMessage(err: unknown) {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; fields?: Record<string, string[]> } | undefined;
    // El servidor valida campo por campo: se muestran los primeros detalles, no solo "Datos inválidos".
    const details = Object.values(data?.fields ?? {}).flat().slice(0, 3).join("; ");
    if (data?.error) return details ? `${data.error}: ${details}` : data.error;
  }
  return "Ocurrió un error inesperado";
}
