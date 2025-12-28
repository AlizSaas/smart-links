import { getRequest } from "@tanstack/react-start/server";
import { createMiddleware } from "@tanstack/react-start";
import { getAuth } from "./initauth"; // Import getAuth

async function getAuthContext() {
  const req = getRequest();
  const auth = getAuth(); // Get the initialized auth instance
  
  const session = await auth.api.getSession(req);
  if (!session) {
    throw new Error("Unauthorized");
  }

  return {
    userId: session.user.id,
    email: session.user.email,
  };
}

export const protectedFunctionMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const context = await getAuthContext();
  return next({ context });
});

export const protectedRequestMiddleware = createMiddleware({
  type: "request",
}).server(async ({ next }) => {
  const context = await getAuthContext();
  return next({ context });
});