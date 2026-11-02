const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const ENV = {
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? ''),
  oidcAuthorizeUrl: import.meta.env.VITE_OIDC_AUTHORIZE_URL ?? '/authorize',
  appBaseUrl: trimTrailingSlash(import.meta.env.VITE_APP_BASE_URL ?? ''),
};
