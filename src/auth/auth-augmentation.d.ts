// src/types/auth-augmentation.d.ts
import '@zitadel/nestjs-auth';

declare module '@zitadel/nestjs-auth' {
  interface SessionAugmentation {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }
}

import '@auth/core/types';

declare module '@auth/core/types' {
  interface DefaultSession {
    /** JWT ID-token from the provider */
    idToken?: string;
    /** OAuth access-token that calls APIs */
    accessToken?: string;
    /** Refresh-token (if you keep it) */
    refreshToken?: string;
    /** Custom error flag during refresh */
    error?: string;
  }
}

export {};
