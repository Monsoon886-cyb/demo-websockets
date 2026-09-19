import { WebSocket, WebSocketServer } from "ws";
import { json } from "zod";
import { wsArcjet, isRateLimitDenial } from "../arcjet.js";

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", async (socket, req) => {
    socket.on("error", console.error);

    if (wsArcjet) {
      try {
        // TEMP: detectBot requires a user-agent header; remove this fallback before production.
        req.headers["user-agent"] ??= "unknown";

        const decision = await wsArcjet.protect(req);

        if (decision.isErrored()) {
          console.error("Arcjet decision errored", decision.reason);
          socket.close(1011, "Server security error");
          return;
        }

        if (decision.isDenied()) {
          const rateLimited = isRateLimitDenial(decision);
          const code = rateLimited ? 1013 : 1008;
          const reason = rateLimited ? "Rate limit exceeded" : "Access denied";

          socket.close(code, reason);
          return;
        }
      } catch (err) {
        console.error("WS connection error", err);
        socket.close(1011, "Server security error");
        return;
      }
    }
    sendJson(socket, { type: "Welcome" });
  });

  function broadcastMatchCreated(match) {
    broadcast(wss, { type: "match_created", data: match });
  }
  return { broadcastMatchCreated };
}
