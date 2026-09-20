import express from "express";

import { matchRouter } from "./Routes/matchesRouter.js";
import { securityMiddleware } from "./arcjet.js";
import { commentaryRouter } from "./Routes/commentary.js";

const app = express();

app.use(securityMiddleware());

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

app.use("/match", matchRouter);
app.use("/matches/:id/commentary", commentaryRouter);

export default app;
