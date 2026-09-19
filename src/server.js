import http from "http";
import app from "./app.js";
import { attachWebSocketServer } from "./ws/wsserver.js";

const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server running on ${baseUrl}`);
  console.log(
    `WebSocket Server running on ${baseUrl.replace("http", "ws")}/ws`,
  );
});
