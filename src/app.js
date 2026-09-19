import express from "express";

import { matchRouter } from "./Routes/matchesRouter.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

app.use("/match", matchRouter);

export default app;
