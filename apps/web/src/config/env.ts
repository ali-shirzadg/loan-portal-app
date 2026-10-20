/** Base path of the API. Same-origin in dev (Vite proxy) and in production (reverse proxy). */
export const API_URL: string = import.meta.env.VITE_API_URL ?? '/api';
