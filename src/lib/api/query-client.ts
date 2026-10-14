import { QueryClient, isServer } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/errors";

/**
 * Query defaults.
 *
 * Deliberately NOT `staleTime: Infinity`. Fellowa data that the UI shows is
 * mostly volatile (membership state, access level for a post, payment status),
 * and a cache that never refetches hides it. Pick a longer `staleTime` per
 * query where the data really is stable.
 *
 * Retrying a 4xx is wrong: an unauthorized or forbidden response will not
 * become authorized by asking again, and retrying a gated-content denial just
 * multiplies the request.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            if (error.status && error.status >= 400 && error.status < 500) {
              return false;
            }
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * One client per request on the server, one shared client in the browser.
 * Never create a client at module scope in a shared file: on the server that
 * would leak one user's cache into another request.
 */
export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
