// src/ws/click-socket.ts
import { getAuth } from "@/lib/initauth";

export async function handleClickSocket(
  request: Request,
  env: Env
): Promise<Response> {
  // 1️⃣ Must be a WebSocket upgrade
  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response("Expected websocket", { status: 426 });
  }

  // 2️⃣ Authenticate using BetterAuth
  const auth = getAuth();

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 3️⃣ Derive accountId from session (NO headers needed)
  const accountId = session.user.id;
  console.log('WebSocket connection for accountId:', accountId);

  // 4️⃣ Route to Durable Object
  const doId = env.LINK_CLICK_TRACKER.idFromName(accountId);
  const stub = env.LINK_CLICK_TRACKER.get(doId);

  return stub.fetch(request);
}
