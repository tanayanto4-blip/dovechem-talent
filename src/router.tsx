import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { captureAppError } from "./lib/error-monitor";

export const getRouter = () => {
  const queryClient = new QueryClient({
    // Data fetch/mutation failures on any page are notified + logged to the
    // admin "Monitor Error" panel.
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Expired/invalid candidate codes are handled with an inline message —
        // not an app error worth toasting and logging.
        const key = JSON.stringify(query.queryKey).slice(0, 200);
        if (key.includes("candidate-profile")) return;
        captureAppError(error, { source: "query", key });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) =>
        captureAppError(error, {
          source: "mutation",
          key: JSON.stringify(mutation.options.mutationKey ?? []).slice(0, 200),
          silent: true, // mutations already surface their own toast
        }),
    }),
    defaultOptions: {
      queries: {
        // Dashboard lists feel instant: cache stays fresh for 5 minutes and
        // does not refetch every time the window regains focus.
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
      },
      mutations: {
        // Mutations should still feel immediate.
        retry: 0,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 5 * 60 * 1000,
  });

  return router;
};
