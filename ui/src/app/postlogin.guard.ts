import { CanActivateFn } from '@angular/router';
import { AUTH_INTERCEPTOR_RETURN_URL_SESSION_KEY } from './auth.interceptor';

export const postloginGuard: CanActivateFn = () => {
  const postLoginUrl = sessionStorage.getItem(
    AUTH_INTERCEPTOR_RETURN_URL_SESSION_KEY,
  );
  if (postLoginUrl) {
    sessionStorage.removeItem(AUTH_INTERCEPTOR_RETURN_URL_SESSION_KEY);
    setTimeout(() => {
      window.location.href = postLoginUrl;
    }, 1000);
    return false;
  }
  return true;
};
