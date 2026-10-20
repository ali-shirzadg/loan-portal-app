import axios, { AxiosInstance } from 'axios';

/**
 * An axios instance with a minimal cookie jar: Node has no browser to keep the
 * httpOnly access_token, so each client remembers it from Set-Cookie.
 * Never throws on HTTP errors; tests assert on status.
 */
export interface Session {
  http: AxiosInstance;
  /** The raw Set-Cookie header from the last response that set one. */
  lastSetCookie: () => string | undefined;
}

export function newSession(): Session {
  let cookie: string | undefined;
  let lastSetCookie: string | undefined;
  const http = axios.create({
    baseURL: axios.defaults.baseURL,
    validateStatus: () => true,
  });
  http.interceptors.request.use((config) => {
    if (cookie) config.headers.set('Cookie', cookie);
    return config;
  });
  http.interceptors.response.use((response) => {
    const setCookie = response.headers['set-cookie']?.[0];
    if (setCookie) {
      lastSetCookie = setCookie;
      cookie = setCookie.split(';')[0];
    }
    return response;
  });
  return { http, lastSetCookie: () => lastSetCookie };
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
}

export const PASSWORD = 'e2e-correct-horse-battery';

export const VALID_APPLICATION = {
  fullName: 'Nur Aisyah Test',
  nric: '900101-14-1234',
  phone: '012-3456789',
  monthlyIncome: '4500.50',
  loanAmount: '25000',
  tenureMonths: 36,
  purposeCode: 'EDUCATION',
};
