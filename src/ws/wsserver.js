import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet, isRateLimitDenial } from "../arcjet.js";

//Create a new Map for storing matchId and its subscribed users
const matchSubscriber = new Map();

//Create a utils function for subscribing
function subscribe(matchId, socket) {
  //  if(!matchId || !socket){
  //   return res.status(500).json({
  //     message:'No matchId or socket'
  //   })
  //  }
  if (!matchSubscriber.has(matchId)) {
    matchSubscriber.set(matchId, new Set());
  }
  matchSubscriber.get(matchId).add(socket);
}

//For unsubscribing to a match
function unsubscribe(matchId, socket) {
  const match = matchSubscriber.get(matchId);

  if (!match) return;

  match.delete(socket);

  if (match.size === 0) {
    matchSubscriber.delete(matchId);
  }
}

//if user closes the browser , remove it from every subscribed match
function cleanUpSubscription(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

//Broadcast only to subscribed users
function broadcastToSubscribedUsers(matchId, payload) {
  const subscribers = matchSubscriber.get(matchId);

  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);

  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

//Use the subscribe and unsubscribe utility
function handleMessage(socket, data) {
  let message;
  try {
    message = JSON.parse(data.toString());
  } catch (err) {
    return sendJson(socket, { type: "error", message: "Invalid JSON" });
  }

  if (message?.type === "subscribe" || message?.type === "subscribed") {
    const matchId = Number(message.matchId);

    if (!Number.isInteger(matchId)) {
      return sendJson(socket, {
        type: "error",
        message: "subscribe requires an integer matchId",
      });
    }

    subscribe(matchId, socket);
    socket.subscriptions.add(matchId);
    sendJson(socket, { type: "subscribed", matchId });
    return;
  }

  if (message?.type === "unsubscribe" || message?.type === "unsubscribed") {
    const matchId = Number(message.matchId);

    if (!Number.isInteger(matchId)) {
      return sendJson(socket, {
        type: "error",
        message: "unsubscribe requires an integer matchId",
      });
    }

    unsubscribe(matchId, socket);
    socket.subscriptions.delete(matchId);
    sendJson(socket, { type: "unsubscribed", matchId });
    return;
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
    socket.subscriptions = new Set();

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

    socket.on("message", (data) => handleMessage(socket, data));
    socket.on("error", () => {
      socket.terminate();
    });
    socket.on("close", () => cleanUpSubscription(socket));
  });

  function broadcastMatchCreated(match) {
    broadcastToAll(wss, { type: "match_created", data: match });
  }
  function broadcastCommentary(matchId, comment) {
    broadcastToSubscribedUsers(matchId, { type: "commentary", data: comment });
  }
  return { broadcastMatchCreated, broadcastCommentary };
}
