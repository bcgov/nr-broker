import 'express';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    passport?: {
      user?: Express.User;
    };
  }
}

/**
 * Extends the Express Request interface with properties set by passport strategies.
 *
 * The OIDC strategy populates `request.user` with userinfo from the identity provider
 * and a `mask` property used for permission tracking during graph operations.
 */
declare global {
  namespace Express {
    interface User {
      /** OIDC userinfo payload from the identity provider */
      userinfo?: {
        client_roles?: string[];
        [key: string]: any;
      };
      /** Permission mask set by BrokerOidcAuthGuard during graph operations */
      mask?: string;
    }

    interface Request {
      /** Returns true if the user is authenticated via passport session */
      isAuthenticated(): boolean;
    }
  }
}
