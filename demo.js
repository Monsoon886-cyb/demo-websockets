import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });
//everytime a new client connects the ws fires a connecion with this code
//and and gives you a fresh socket object for that one client
// this socket object is an instace of WebSocket class imported from ws library

//Connection Event- The first event after the handshake that is established
//in the above code
wss.on("connection", (socket, req) => {
  const ip = req.socket.remoteAddress; //physical ip address of the client
  //Socket contains details of individual connections of each clients
  //request contains the headers such as cookies , ip adresses and more
  //from the upgrade request

  socket.on("message", (rawData) => {
    //socket is an instace of the WebSocket class
    const message = rawData.toString(); //rawData contains WebSocket frame data, not a JavaScript object. .toString() converts the frame data to text; it does not serialize an object to JSON. Update the comment to match the ws message API.

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

/* How did a server ran without express?
-- All the heavy lifting s done by ws library, when u pass a port to a ws server it realizes ,there is no
http server to hijack so it spins its own . It creates something known as a zombie only exists to listen 
to that handshake  */
