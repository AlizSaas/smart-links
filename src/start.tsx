import { createStart } from "@tanstack/react-start";
import { Database } from "./db";

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: {
        fromFetch: boolean;
        db:Database,
          workerCtx: ExecutionContext;
          env: Env;

      };
    };
  }
}

export const startInstance = createStart(() => {
  return {
    defaultSsr: true,

  };
});

startInstance.createMiddleware().server(({ next,context}) => {
  return next({
    context: {
      ...context,
      fromStartInstanceMw: true,

    },
  });
});