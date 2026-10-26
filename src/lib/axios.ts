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
    const message = (err.response?.data as { error?: string } | undefined)?.error;
    if (message) return message;
  }
  return "Ocurrió un error inesperado";
}
