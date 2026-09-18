import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

//Connection Event- The first event after the handshake that is established
//in the above code
wss.on("connection", (socket, req) => {
  const ip = req.socket.remoteAddress; //physical ip address of the client
  //Socket contains details of individual connections of each clients
  //request contains the headers such as cookies , ip adresses and more
  //from the upgrade request

  socket.on("message", (rawData) => {
    const message = rawData.toString();
    console.log({ rawData });

    //After this we have the access to all the clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN)
        client.send(`Server Broadcast: ${message}`);
      // Websocket.OPEN chcks if the connection is opened
    });
  });
  socket.on("error", (err) => {
    console.log(`Error: ${err.message}: ${ip}`);
  });
  socket.on("close", () => {
    console.log("Client Disconnected");
  });
});

console.log("Ws server is live on Port 8080");
