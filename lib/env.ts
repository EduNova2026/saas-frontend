/**
 * Server-side environment variable validation.
 * These variables are NOT prefixed with NEXT_PUBLIC_ and are only accessible
 * in Route Handlers, Server Components, and middleware.
 */

const EDUNOVA_API_URL = process.env.EDUNOVA_API_URL;

if (!EDUNOVA_API_URL) {
  throw new Error(
    "Missing EDUNOVA_API_URL environment variable. " +
    "Please set it in .env.local: EDUNOVA_API_URL=http://localhost:8000"
  );
}

export const env = {
  EDUNOVA_API_URL,
} as const;
